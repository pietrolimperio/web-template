import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import ExifReader from 'exifreader';
import { useIntl } from '../../util/reactIntl';
import { useConfiguration } from '../../context/configurationContext';
import devLog from '../../util/devLog';
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

const LightningIcon = () => (
  <svg className={css.lightningIcon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
  </svg>
);

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

const CameraIcon = () => (
  <svg className={css.cameraIcon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 15.5A3.5 3.5 0 018.5 12 3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5M16.5 6l-1.76-2H9.26L7.5 6H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-3.5z" />
  </svg>
);

const LightbulbIcon = () => (
  <svg className={css.lightbulbIcon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path d="M12 2a7 7 0 017 7c0 2.62-1.42 4.91-3.5 6.16V17a1 1 0 01-1 1h-5a1 1 0 01-1-1v-1.84A7.001 7.001 0 0112 2zm-2 19h4v1h-4v-1zm-1-2h6v1H9v-1z" />
  </svg>
);

const PlusIcon = () => (
  <svg className={css.placeholderIcon} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const ImageIcon = () => (
  <svg className={css.placeholderIcon} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
  </svg>
);

const BackArrowIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const ImageUpload = ({ onImagesSelected, onAnalyze, isAnalyzing, onBack }) => {
  const intl = useIntl();
  const config = useConfiguration();
  const listingImageLayout = config?.layout?.listingImage || {};
  const [cropAspectW, cropAspectH] = getListingCropAspectDimensions(listingImageLayout);
  const cropAspectRatioConfig = `${cropAspectW}/${cropAspectH}`;

  const [files, setFiles] = useState([]);
  const [originalFiles, setOriginalFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [errors, setErrors] = useState([]);
  const [validationInProgress, setValidationInProgress] = useState(false);

  const [activeCropSession, setActiveCropSession] = useState(null);

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
  const atMaxFiles = files.length >= UPLOAD_CONSTRAINTS.MAX_FILES;

  // Show up to 3 placeholder slots after filled ones, with progressive fading
  const placeholderCount = atMaxFiles ? 0 : Math.min(3, UPLOAD_CONSTRAINTS.MAX_FILES - files.length);
  const placeholderOpacityClass = i => {
    if (i === 0) return '';
    if (i === 1) return css.slotPlaceholderFaded;
    return css.slotPlaceholderMoreFaded;
  };

  return (
    <div
      {...getRootProps()}
      className={`${css.stitchRoot} ${isDragActive ? css.stitchRootDrag : ''}`}
    >
      <input {...getInputProps()} />

      {/* Step indicator */}
      <div className={css.stepIndicator}>
        <span className={css.stepLabel}>
          {intl.formatMessage({ id: 'ImageUpload.stepIndicator' })}
        </span>
        <span className={css.stepDash} />
        <span className={css.stepDetailsLabel}>
          {intl.formatMessage({ id: 'ImageUpload.stepDetails' })}
        </span>
      </div>

      {/* Page heading */}
      <h1 className={css.pageHeading}>
        {intl.formatMessage({ id: 'ImageUpload.headingPart1' })}
        <br />
        <span className={css.pageHeadingAccent}>
          {intl.formatMessage({ id: 'ImageUpload.headingPart2' })}
        </span>
      </h1>

      {/* Two-column content grid */}
      <div className={css.contentGrid}>
        {/* Left: drop zone */}
        <div
          className={`${css.dropZone} ${isDragActive ? css.dropZoneActive : ''} ${panelDisabled ? css.dropZoneDisabled : ''}`}
          onClick={openFilePicker}
          role="button"
          tabIndex={panelDisabled ? -1 : 0}
          onKeyDown={e => e.key === 'Enter' && openFilePicker(e)}
          aria-label={intl.formatMessage({ id: 'ImageUpload.dropzoneTitle' })}
        >
          <div className={css.organicIcon}>
            <CameraIcon />
          </div>
          <h3 className={css.dropzoneTitle}>
            {intl.formatMessage({ id: 'ImageUpload.dropzoneTitle' })}
          </h3>
          <p className={css.dropzoneSubtitle}>
            {SKIP_EXIF_VALIDATION
              ? intl.formatMessage(
                  { id: 'ImageUpload.hintTestingMode' },
                  {
                    maxFiles: UPLOAD_CONSTRAINTS.MAX_FILES,
                    maxSize: UPLOAD_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024,
                  }
                )
              : intl.formatMessage({ id: 'ImageUpload.dropzoneSubtitle' })}
          </p>
        </div>

        {/* Right: gallery card */}
        <div className={css.galleryCard}>
          <div className={css.galleryHeader}>
            <h4 className={css.galleryTitle}>
              {intl.formatMessage({ id: 'ImageUpload.photosLabel' })}
            </h4>
            <span className={css.countBadge}>
              {files.length} / {UPLOAD_CONSTRAINTS.MAX_FILES}
            </span>
          </div>

          <div className={css.photoGrid}>
            {/* Filled image slots */}
            {files.map((_, index) => {
              const url = previewUrls[index];
              return (
                <div key={`${url}-${index}`} className={`${css.slot} ${css.slotFilled}`}>
                  <img src={url} alt="" className={css.slotImage} />
                  <div className={css.slotOverlay}>
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
                  </div>
                  {index === 0 && (
                    <div className={css.mainBadge}>
                      {intl.formatMessage({ id: 'ImageUpload.mainPhotoLabel' })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Placeholder slots */}
            {Array.from({ length: placeholderCount }).map((_, i) => (
              <div
                key={`placeholder-${i}`}
                className={`${css.slot} ${css.slotPlaceholder} ${placeholderOpacityClass(i)}`}
                onClick={i === 0 && !panelDisabled ? openFilePicker : undefined}
                role={i === 0 && !panelDisabled ? 'button' : undefined}
                tabIndex={i === 0 && !panelDisabled ? 0 : -1}
                onKeyDown={i === 0 && !panelDisabled ? e => e.key === 'Enter' && openFilePicker(e) : undefined}
              >
                {i === 0 ? <ImageIcon /> : <PlusIcon />}
              </div>
            ))}
          </div>

          {validationInProgress && (
            <div className={css.gridBelowStatus}>
              <div className={css.gridBelowSpinner} />
              <span>{intl.formatMessage({ id: 'ImageUpload.validatingImages' })}</span>
            </div>
          )}

          {/* Editorial tip */}
          <div className={css.editorialTip}>
            <LightbulbIcon />
            <div>
              <strong className={css.editorialTipTitle}>
                {intl.formatMessage({ id: 'ImageUpload.editorialTipTitle' })}
              </strong>
              <p className={css.editorialTipBody}>
                {intl.formatMessage({ id: 'ImageUpload.editorialTipBody' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className={css.errors}>
          {errors.map((error, i) => (
            <div key={i} className={css.error}>
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Footer bar */}
      <div className={css.footerBar}>
        {onBack ? (
          <button type="button" className={css.backBtn} onClick={onBack}>
            <BackArrowIcon />
            {intl.formatMessage({ id: 'ImageUpload.backButton' })}
          </button>
        ) : null}
        <button
          type="button"
          className={css.ctaBtn}
          onClick={e => {
            e.stopPropagation();
            handleAnalyze();
          }}
          disabled={isAnalyzing || validationInProgress || files.length === 0 || !!activeCropSession}
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
      </div>

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
