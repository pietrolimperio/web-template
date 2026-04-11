import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import ExifReader from 'exifreader';
import { useIntl } from '../../util/reactIntl';
import { useConfiguration } from '../../context/configurationContext';
import devLog from '../../util/devLog';
import robotMascotSrc from '../../assets/stitch-product-upload/ai-upload-robot-mascot.png';
import ImageCropModal from './ImageCropModal';
import { autoCropImageBlob } from '../../util/imageCropCanvas';
import css from './ImageUpload.module.css';

// 🔧 TESTING FLAG: Set REACT_APP_SKIP_EXIF_VALIDATION=true in .env to skip EXIF validation
const SKIP_EXIF_VALIDATION = process.env.REACT_APP_SKIP_EXIF_VALIDATION === 'true';

const UPLOAD_CONSTRAINTS = {
  MAX_FILES: 10,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ACCEPTED_TYPES: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
  },
};

/** Listing width:height ratio (merged config exposes aspectWidth/aspectHeight). Default 3:4 like portrait cards. */
function getListingCropAspectDimensions(listingImage) {
  const li = listingImage || {};
  if (
    Number.isFinite(li.aspectWidth) &&
    Number.isFinite(li.aspectHeight) &&
    li.aspectHeight !== 0
  ) {
    return [li.aspectWidth, li.aspectHeight];
  }
  const s = li.aspectRatio || '3/4';
  const parts = String(s)
    .split('/')
    .map(n => Number.parseInt(n, 10));
  if (parts.length === 2 && parts.every(n => Number.isFinite(n)) && parts[1] !== 0) {
    return parts;
  }
  return [3, 4];
}

/** Smartphone (not tablet): drives “browse or take photo” copy on file input / camera. */
function detectSmartphone() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet|Kindle|Silk|PlayBook|Nexus 7|Nexus 9/i.test(ua)) return false;
  if (/iPhone|iPod/.test(ua)) return true;
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return true;
  if (/webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  /* Desktop devtools / browser without mobile UA: narrow viewport + primary coarse pointer */
  if (
    window.innerWidth <= 480 &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  ) {
    return true;
  }
  return false;
}

const CloudUploadIcon = () => (
  <svg className={css.browseIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 21l-3-3m0 0l-3 3m3-3v8"
    />
  </svg>
);

const LightningIcon = () => (
  <svg className={css.lightningIcon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
  </svg>
);

/** Classic crop icon: two opposite corner brackets (standard crop-tool style). */
const CropAdjustIcon = () => (
  <svg className={css.adjustIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
    <path
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 9V5a1 1 0 011-1h4M4 15v4a1 1 0 001 1h4m12-5V5a1 1 0 00-1-1h-4m0 16h4a1 1 0 001-1v-4"
    />
  </svg>
);

const ImageUpload = ({ onImagesSelected, onAnalyze, isAnalyzing }) => {
  const intl = useIntl();
  const config = useConfiguration();
  const listingImageLayout = config?.layout?.listingImage || {};
  const [cropAspectW, cropAspectH] = getListingCropAspectDimensions(listingImageLayout);
  const cropAspectRatioConfig = `${cropAspectW}/${cropAspectH}`;

  /** Cropped files (preview + passed to parent): listing JPEGs. */
  const [files, setFiles] = useState([]);
  /** Original per slot: not replaced by crop; used to refine from the full-resolution file. */
  const [originalFiles, setOriginalFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [errors, setErrors] = useState([]);
  const [validationInProgress, setValidationInProgress] = useState(false);
  const [isSmartphone, setIsSmartphone] = useState(false);

  const [activeCropSession, setActiveCropSession] = useState(null);

  useEffect(() => {
    const update = () => setIsSmartphone(detectSmartphone());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const browseFilesButtonMessageId = isSmartphone
    ? 'ImageUpload.browseFilesButtonSmartphone'
    : 'ImageUpload.browseFilesButton';

  const checkImageHeuristics = async (file, arrayBuffer, exifError = null) => {
    const fileName = file.name.toLowerCase();

    const whatsappPatterns = [
      /^img-\d{8}-wa\d{4}/,
      /whatsapp.*image/i,
      /^ptt-\d{8}-\d{6}-/i,
      /^wa\d{4}/i,
    ];

    const isWhatsAppFilename = whatsappPatterns.some(pattern => pattern.test(fileName));

    if (isWhatsAppFilename) {
      return { valid: true };
    }

    try {
      const imageUrl = URL.createObjectURL(file);
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageUrl;
      });

      URL.revokeObjectURL(imageUrl);

      const width = img.width;
      const height = img.height;
      const aspectRatio = width / height;

      const commonWhatsAppDimensions = [
        { w: 1600, h: 1200 },
        { w: 1920, h: 1080 },
        { w: 1280, h: 960 },
        { w: 1024, h: 768 },
      ];

      const matchesWhatsAppDimensions = commonWhatsAppDimensions.some(
        dim => Math.abs(width - dim.w) < 50 && Math.abs(height - dim.h) < 50
      );

      const isAILikeDimension =
        (width === height && [512, 768, 1024, 1536, 2048].includes(width)) ||
        (width % 512 === 0 && height % 512 === 0 && width >= 512 && height >= 512);

      const isWebLikeDimension =
        width > 3000 ||
        height > 3000 ||
        (width < 400 && height < 400) ||
        aspectRatio < 0.3 ||
        aspectRatio > 3.0;

      if (matchesWhatsAppDimensions && !isAILikeDimension && !isWebLikeDimension) {
        if (file.size > 50 * 1024 && file.size < 3 * 1024 * 1024) {
          return { valid: true };
        }
      }

      if (isAILikeDimension || isWebLikeDimension) {
        return {
          valid: false,
          error: intl.formatMessage(
            { id: 'ImageUpload.errorExifWebDownload' },
            { fileName: file.name }
          ),
        };
      }
    } catch (imgError) {
      console.warn('Could not analyze image dimensions:', imgError);
    }

    return {
      valid: false,
      error: exifError
        ? intl.formatMessage({ id: 'ImageUpload.errorExifNoMetadata' }, { fileName: file.name })
        : intl.formatMessage({ id: 'ImageUpload.errorExifWebDownload' }, { fileName: file.name }),
    };
  };

  const validateImageEXIF = async file => {
    if (SKIP_EXIF_VALIDATION) {
      devLog('⚠️ EXIF validation skipped (testing mode enabled)');
      return { valid: true };
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const tags = await ExifReader.load(arrayBuffer);

      const softwareTag = tags.Software?.description || tags.Software?.value || '';
      const aiSoftwarePatterns = [
        'stable diffusion',
        'midjourney',
        'dall-e',
        'dall·e',
        'imagen',
        'firefly',
        'leonardo',
        'flux',
        'ideogram',
        'generative ai',
      ];

      const isAIGenerated = aiSoftwarePatterns.some(pattern =>
        softwareTag.toLowerCase().includes(pattern)
      );

      if (isAIGenerated) {
        return {
          valid: false,
          error: intl.formatMessage({ id: 'ImageUpload.errorAIGenerated' }, { fileName: file.name }),
        };
      }

      const hasCameraInfo = tags.Make || tags.Model || tags.DateTime || tags.DateTimeOriginal;

      const hasPhotoMetadata =
        tags.Orientation ||
        tags.ExifVersion ||
        tags.ColorSpace ||
        tags.PixelXDimension ||
        tags.PixelYDimension ||
        tags.ExifImageWidth ||
        tags.ExifImageHeight;

      if (hasCameraInfo || hasPhotoMetadata) {
        return { valid: true };
      }

      return await checkImageHeuristics(file, arrayBuffer);
    } catch (error) {
      return await checkImageHeuristics(file, null, error);
    }
  };

  const onDrop = useCallback(
    async acceptedFiles => {
      setValidationInProgress(true);
      const newErrors = [];
      const validFiles = [];

      const pendingRefineSlot = activeCropSession ? 1 : 0;
      if (files.length + pendingRefineSlot + acceptedFiles.length > UPLOAD_CONSTRAINTS.MAX_FILES) {
        newErrors.push(
          intl.formatMessage({ id: 'ImageUpload.errorMaxFiles' }, { maxFiles: UPLOAD_CONSTRAINTS.MAX_FILES })
        );
        setErrors(newErrors);
        setValidationInProgress(false);
        return;
      }

      for (const file of acceptedFiles) {
        if (file.size > UPLOAD_CONSTRAINTS.MAX_FILE_SIZE) {
          newErrors.push(
            intl.formatMessage(
              { id: 'ImageUpload.errorFileSize' },
              {
                fileName: file.name,
                maxSize: UPLOAD_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024,
              }
            )
          );
          continue;
        }

        if (!Object.keys(UPLOAD_CONSTRAINTS.ACCEPTED_TYPES).includes(file.type)) {
          newErrors.push(intl.formatMessage({ id: 'ImageUpload.errorFileType' }, { fileName: file.name }));
          continue;
        }

        const exifValidation = await validateImageEXIF(file);
        if (!exifValidation.valid) {
          newErrors.push(exifValidation.error);
          continue;
        }

        validFiles.push(file);
      }

      const [aspectW, aspectH] = getListingCropAspectDimensions(config?.layout?.listingImage || {});
      const pairs = [];

      for (const file of validFiles) {
        const tempUrl = URL.createObjectURL(file);
        try {
          const blob = await autoCropImageBlob(tempUrl, aspectW, aspectH);
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const processed = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          pairs.push({ original: file, processed });
        } catch (err) {
          console.error('autoCropImageBlob failed:', err);
          newErrors.push(
            intl.formatMessage({ id: 'ImageUpload.errorNormalizeImage' }, { fileName: file.name })
          );
        } finally {
          URL.revokeObjectURL(tempUrl);
        }
      }

      if (pairs.length > 0) {
        const newProcessed = pairs.map(p => p.processed);
        const newOriginals = pairs.map(p => p.original);
        const newPreviews = newProcessed.map(f => URL.createObjectURL(f));
        setFiles(prev => {
          const nextFiles = [...prev, ...newProcessed];
          setOriginalFiles(prevO => [...prevO, ...newOriginals]);
          setPreviewUrls(prevP => {
            const nextPreviews = [...prevP, ...newPreviews];
            onImagesSelected(nextFiles, nextPreviews);
            return nextPreviews;
          });
          return nextFiles;
        });
      }

      setErrors(newErrors);
      setValidationInProgress(false);
    },
    [files.length, intl, activeCropSession, config, onImagesSelected]
  );

  const openRefineCrop = useCallback(
    index => {
      if (isAnalyzing || validationInProgress || activeCropSession) return;
      const original = originalFiles[index];
      const processed = files[index];
      if (!original || !processed) return;
      const url = URL.createObjectURL(original);
      setActiveCropSession({
        url,
        replaceIndex: index,
        isRefine: true,
        baseName: original.name.replace(/\.[^.]+$/, ''),
        revokeUrlOnClose: true,
      });
    },
    [isAnalyzing, validationInProgress, activeCropSession, originalFiles, files]
  );

  const handleCropConfirm = useCallback(
    async blob => {
      if (!activeCropSession) return;
      const session = activeCropSession;
      if (session.revokeUrlOnClose && session.url) {
        URL.revokeObjectURL(session.url);
      }
      const baseName = session.baseName || 'photo';
      const croppedFile = new File([blob], `${baseName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      if (session.replaceIndex != null) {
        const i = session.replaceIndex;
        const newPreview = URL.createObjectURL(croppedFile);
        setFiles(prev => {
          const nextFiles = [...prev];
          nextFiles[i] = croppedFile;
          setPreviewUrls(prevP => {
            const nextP = [...prevP];
            URL.revokeObjectURL(prevP[i]);
            nextP[i] = newPreview;
            onImagesSelected(nextFiles, nextP);
            return nextP;
          });
          return nextFiles;
        });
      }

      setActiveCropSession(null);
    },
    [activeCropSession, onImagesSelected]
  );

  const handleCropCancel = useCallback(() => {
    if (activeCropSession?.revokeUrlOnClose && activeCropSession.url) {
      URL.revokeObjectURL(activeCropSession.url);
    }
    setActiveCropSession(null);
  }, [activeCropSession]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: UPLOAD_CONSTRAINTS.ACCEPTED_TYPES,
    maxFiles: UPLOAD_CONSTRAINTS.MAX_FILES,
    maxSize: UPLOAD_CONSTRAINTS.MAX_FILE_SIZE,
    disabled: isAnalyzing || validationInProgress || activeCropSession,
    noClick: true,
    noKeyboard: true,
  });

  const removeImage = index => {
    const newFiles = files.filter((_, i) => i !== index);
    const newOriginals = originalFiles.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);

    URL.revokeObjectURL(previewUrls[index]);

    setFiles(newFiles);
    setOriginalFiles(newOriginals);
    setPreviewUrls(newPreviews);
    onImagesSelected(newFiles, newPreviews);
  };

  const handleAnalyze = () => {
    if (files.length === 0) {
      setErrors([intl.formatMessage({ id: 'ImageUpload.errorNoImages' })]);
      return;
    }
    onAnalyze();
  };

  const openFilePicker = e => {
    e.stopPropagation();
    if (!isAnalyzing && !validationInProgress && !activeCropSession) {
      open();
    }
  };

  const panelDisabled = isAnalyzing || validationInProgress || activeCropSession;
  const isEmpty = files.length === 0;

  const atMaxFiles = files.length >= UPLOAD_CONSTRAINTS.MAX_FILES;
  const showAddMoreBelowGrid = !atMaxFiles && !validationInProgress && !activeCropSession;

  const heroHeading = (
    <h2 className={css.heroTitle}>
      <span className={css.heroTitleDesktop}>
        {intl.formatMessage({ id: 'ImageUpload.heroTitle' })}
      </span>
      <span className={css.heroTitleMobile}>
        {intl.formatMessage({ id: 'ImageUpload.heroTitleShort' })}
      </span>
    </h2>
  );

  return (
    <div
      {...getRootProps()}
      className={`${css.stitchRoot} ${isDragActive ? css.stitchRootDrag : ''}`}
    >
      <input {...getInputProps()} />

      <div className={`${css.mainCard} ${isEmpty ? css.mainCardEmpty : ''}`}>
        {isEmpty ? (
          <div className={css.emptyLayout}>
            <img
              src={robotMascotSrc}
              alt=""
              className={css.robotMascot}
              decoding="async"
            />
            {heroHeading}
            {SKIP_EXIF_VALIDATION ? (
              <p className={`${css.heroSubtitleLine1} ${css.heroSubtitleTesting}`}>
                {intl.formatMessage(
                  { id: 'ImageUpload.hintTestingMode' },
                  {
                    maxFiles: UPLOAD_CONSTRAINTS.MAX_FILES,
                    maxSize: UPLOAD_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024,
                  }
                )}
              </p>
            ) : (
              <>
                <p className={css.heroSubtitleLine1}>
                  {intl.formatMessage({ id: 'ImageUpload.heroSubtitleLine1' })}
                </p>
                <p className={css.heroSubtitleLine2}>
                  {intl.formatMessage(
                    { id: 'ImageUpload.heroSubtitleLine2' },
                    { maxSize: UPLOAD_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024 }
                  )}
                </p>
              </>
            )}
            <div className={css.emptyDropZone}>
              <button
                type="button"
                className={css.browseButton}
                onClick={openFilePicker}
                disabled={panelDisabled}
              >
                <CloudUploadIcon />
                {intl.formatMessage({ id: browseFilesButtonMessageId })}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={css.leftPanel}>
              <img
                src={robotMascotSrc}
                alt=""
                className={`${css.robotMascot} ${css.robotMascotInPanel}`}
                decoding="async"
              />
              {heroHeading}
              <p className={css.heroSubtitle}>
                {SKIP_EXIF_VALIDATION
                  ? intl.formatMessage(
                      { id: 'ImageUpload.hintTestingMode' },
                      {
                        maxFiles: UPLOAD_CONSTRAINTS.MAX_FILES,
                        maxSize: UPLOAD_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024,
                      }
                    )
                  : intl.formatMessage(
                      { id: 'ImageUpload.heroSubtitle' },
                      { maxSize: UPLOAD_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024 }
                    )}
              </p>
              <button
                type="button"
                className={css.browseButton}
                onClick={openFilePicker}
                disabled={panelDisabled}
              >
                <CloudUploadIcon />
                {intl.formatMessage({ id: browseFilesButtonMessageId })}
              </button>
            </div>

            <div className={css.rightPanel}>
              <h3 className={css.gridTitle}>
                {intl.formatMessage(
                  { id: 'ImageUpload.previewTitle' },
                  { count: files.length, maxFiles: UPLOAD_CONSTRAINTS.MAX_FILES }
                )}
              </h3>
              <div className={css.slotGrid}>
                {files.map((_, index) => {
                  const url = previewUrls[index];
                  return (
                    <div key={`${url}-${index}`} className={`${css.slot} ${css.slotFilled}`}>
                      <img src={url} alt="" className={css.slotImage} />
                      <button
                        type="button"
                        className={css.adjustSlotBtn}
                        onClick={e => {
                          e.stopPropagation();
                          openRefineCrop(index);
                        }}
                        disabled={isAnalyzing || !!activeCropSession}
                        aria-label={intl.formatMessage({ id: 'ImageUpload.adjustCropAriaLabel' })}
                      >
                        <CropAdjustIcon />
                      </button>
                      <button
                        type="button"
                        className={css.removeSlotBtn}
                        onClick={e => {
                          e.stopPropagation();
                          removeImage(index);
                        }}
                        disabled={isAnalyzing}
                        aria-label={intl.formatMessage(
                          { id: 'ImageUpload.removeImageAriaLabel' },
                          { index: index + 1 }
                        )}
                      >
                        <svg
                          className={css.removeIcon}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                      <div className={css.slotStatus}>
                        <div className={css.statusBar}>
                          <div className={`${css.statusBarFill} ${css.statusBarComplete}`} />
                        </div>
                        <div className={css.statusLabel}>
                          {intl.formatMessage({ id: 'ImageUpload.statusComplete' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {validationInProgress && (
                <div className={css.gridBelowStatus}>
                  <div className={css.gridBelowSpinner} />
                  <span>{intl.formatMessage({ id: 'ImageUpload.validatingImages' })}</span>
                </div>
              )}
              {showAddMoreBelowGrid && (
                <button
                  type="button"
                  className={css.addMoreBelowGrid}
                  onClick={openFilePicker}
                  disabled={panelDisabled}
                >
                  {intl.formatMessage({ id: 'ImageUpload.addMorePhotos' })}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        className={`${css.footerCta} ${isEmpty ? css.footerCtaMuted : ''}`}
        onClick={e => {
          e.stopPropagation();
          handleAnalyze();
        }}
        disabled={
          isAnalyzing || validationInProgress || files.length === 0 || activeCropSession
        }
      >
        {isAnalyzing ? (
          <>
            <div className={css.spinner} />
            {intl.formatMessage({ id: 'ImageUpload.analyzingButton' })}
          </>
        ) : (
          <>
            <LightningIcon />
            {intl.formatMessage({ id: 'ImageUpload.analyzeButton' })}
          </>
        )}
      </button>

      {errors.length > 0 && (
        <div className={css.errors}>
          {errors.map((error, i) => (
            <div key={i} className={css.error}>
              {error}
            </div>
          ))}
        </div>
      )}

      {activeCropSession ? (
        <ImageCropModal
          key={activeCropSession.url}
          imageUrl={activeCropSession.url}
          aspectRatioConfig={cropAspectRatioConfig}
          isRefine={!!activeCropSession.isRefine}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      ) : null}
    </div>
  );
};

export default ImageUpload;
