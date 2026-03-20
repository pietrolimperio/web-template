import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import ExifReader from 'exifreader';
import { useIntl } from '../../util/reactIntl';
import devLog from '../../util/devLog';
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

/** Smartphone (non tablet): per etichetta “sfoglia o scatta” su file input / fotocamera */
function detectSmartphone() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet|Kindle|Silk|PlayBook|Nexus 7|Nexus 9/i.test(ua)) return false;
  if (/iPhone|iPod/.test(ua)) return true;
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return true;
  if (/webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  /* Desktop devtools / browser senza UA mobile: schermo stretto + touch principale */
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

const ImageUpload = ({ onImagesSelected, onAnalyze, isAnalyzing }) => {
  const intl = useIntl();
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [errors, setErrors] = useState([]);
  const [validationInProgress, setValidationInProgress] = useState(false);
  const [isSmartphone, setIsSmartphone] = useState(false);

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
      const validPreviews = [];

      if (files.length + acceptedFiles.length > UPLOAD_CONSTRAINTS.MAX_FILES) {
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
        validPreviews.push(URL.createObjectURL(file));
      }

      const updatedFiles = [...files, ...validFiles];
      const updatedPreviews = [...previewUrls, ...validPreviews];

      setFiles(updatedFiles);
      setPreviewUrls(updatedPreviews);
      setErrors(newErrors);
      setValidationInProgress(false);

      onImagesSelected(updatedFiles, updatedPreviews);
    },
    [files, previewUrls, onImagesSelected, intl]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: UPLOAD_CONSTRAINTS.ACCEPTED_TYPES,
    maxFiles: UPLOAD_CONSTRAINTS.MAX_FILES,
    maxSize: UPLOAD_CONSTRAINTS.MAX_FILE_SIZE,
    disabled: isAnalyzing || validationInProgress,
    noClick: true,
    noKeyboard: true,
  });

  const removeImage = index => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);

    URL.revokeObjectURL(previewUrls[index]);

    setFiles(newFiles);
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
    if (!isAnalyzing && !validationInProgress) {
      open();
    }
  };

  const panelDisabled = isAnalyzing || validationInProgress;
  const isEmpty = files.length === 0;
  const robotMascotSrc = `${process.env.PUBLIC_URL || ''}/assets/stitch-product-upload/ai-upload-robot-mascot.png`;

  const atMaxFiles = files.length >= UPLOAD_CONSTRAINTS.MAX_FILES;
  const showAddMoreBelowGrid = !atMaxFiles && !validationInProgress;

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
            <div
              className={`${css.emptyDropZone} ${isDragActive ? css.emptyDropZoneActive : ''}`}
            >
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
                    <div key={`filled-${index}`} className={`${css.slot} ${css.slotFilled}`}>
                      <img src={url} alt="" className={css.slotImage} />
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
        disabled={isAnalyzing || validationInProgress || files.length === 0}
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
    </div>
  );
};

export default ImageUpload;
