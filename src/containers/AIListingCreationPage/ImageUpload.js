import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ExifReader from 'exifreader';
import { useIntl } from '../../util/reactIntl';
import devLog from '../../util/devLog';
import css from './ImageUpload.module.css';

// 🔧 TESTING FLAG: Set REACT_APP_SKIP_EXIF_VALIDATION=true in .env to skip EXIF validation
const SKIP_EXIF_VALIDATION = process.env.REACT_APP_SKIP_EXIF_VALIDATION === 'true';

// Upload constraints
// Note: Sharetribe only accepts PNG and JPEG formats
const UPLOAD_CONSTRAINTS = {
  MAX_FILES: 10,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ACCEPTED_TYPES: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
  },
};

/**
 * ImageUpload Component
 *
 * Features:
 * - Drag & drop interface
 * - EXIF validation (camera photos, email downloads, WhatsApp images)
 * - AI-generated image detection
 * - File type/size validation
 * - Preview grid with remove buttons
 * - "Analyze Product" button
 */
const ImageUpload = ({ onImagesSelected, onAnalyze, isAnalyzing }) => {
  const intl = useIntl();
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [errors, setErrors] = useState([]);
  const [validationInProgress, setValidationInProgress] = useState(false);

  // Heuristic checks for images without EXIF (WhatsApp vs Web/AI)
  const checkImageHeuristics = async (file, arrayBuffer, intl, exifError = null) => {
    const fileName = file.name.toLowerCase();

    // 1. Check WhatsApp filename patterns
    const whatsappPatterns = [
      /^img-\d{8}-wa\d{4}/, // IMG-20240115-WA0001.jpg
      /whatsapp.*image/i, // WhatsApp Image 2024-01-15 at 14.30.45.jpeg
      /^ptt-\d{8}-\d{6}-/i, // PTT-20240115-143045-AAC.jpg
      /^wa\d{4}/i, // WA0001.jpg (shortened pattern)
    ];

    const isWhatsAppFilename = whatsappPatterns.some(pattern => pattern.test(fileName));
    
    if (isWhatsAppFilename) {
      return { valid: true }; // Accept WhatsApp images
    }

    // 2. Load image to check dimensions (WhatsApp typically resizes to common dimensions)
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

      // WhatsApp common dimensions (after compression)
      // Usually maintains reasonable aspect ratios and typical phone camera dimensions
      const commonWhatsAppDimensions = [
        { w: 1600, h: 1200 }, // 4:3
        { w: 1920, h: 1080 }, // 16:9
        { w: 1280, h: 960 },
        { w: 1024, h: 768 },
      ];

      const matchesWhatsAppDimensions = commonWhatsAppDimensions.some(
        dim => Math.abs(width - dim.w) < 50 && Math.abs(height - dim.h) < 50
      );

      // AI images often have dimensions like 512x512, 1024x1024, etc.
      const isAILikeDimension = 
        (width === height && [512, 768, 1024, 1536, 2048].includes(width)) ||
        (width % 512 === 0 && height % 512 === 0 && width >= 512 && height >= 512);

      // Web downloads often have unusual dimensions or very high resolutions
      const isWebLikeDimension = 
        width > 3000 || height > 3000 || 
        (width < 400 && height < 400) ||
        aspectRatio < 0.3 || aspectRatio > 3.0;

      // If dimensions suggest WhatsApp and not AI/Web, accept it
      if (matchesWhatsAppDimensions && !isAILikeDimension && !isWebLikeDimension) {
        // Additional check: file size (WhatsApp compresses, so files are usually smaller)
        // WhatsApp images are typically 50KB - 2MB for compressed photos
        if (file.size > 50 * 1024 && file.size < 3 * 1024 * 1024) {
          return { valid: true };
        }
      }

      // Reject AI-like or web-like dimensions without WhatsApp indicators
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
      // If we can't load image, default to rejection (safer)
      console.warn('Could not analyze image dimensions:', imgError);
    }

    // 3. Default: reject if no indicators of authenticity
    return {
      valid: false,
      error: exifError
        ? intl.formatMessage({ id: 'ImageUpload.errorExifNoMetadata' }, { fileName: file.name })
        : intl.formatMessage({ id: 'ImageUpload.errorExifWebDownload' }, { fileName: file.name }),
    };
  };

  // EXIF Validation with WhatsApp detection
  // This checks if images have proper photo metadata
  // Allows: Camera photos, email downloads, WhatsApp images (by heuristics)
  // Rejects: Web downloads without metadata, AI-generated images
  const validateImageEXIF = async (file, intl) => {
    // Skip validation if testing flag is enabled
    if (SKIP_EXIF_VALIDATION) {
      devLog('⚠️ EXIF validation skipped (testing mode enabled)');
      return { valid: true };
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const tags = await ExifReader.load(arrayBuffer);

      // Check for AI software tags in EXIF
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
          error: intl.formatMessage(
            { id: 'ImageUpload.errorAIGenerated' },
            { fileName: file.name }
          ),
        };
      }

      // Check for camera-specific EXIF tags (original camera photos)
      const hasCameraInfo =
        tags.Make || tags.Model || tags.DateTime || tags.DateTimeOriginal;

      // Check for photo metadata (email downloads often preserve these)
      // Note: XResolution/YResolution alone are NOT significant - they're standard JPEG values
      // that can be present in web images too, so we don't use them as validation criteria
      const hasPhotoMetadata =
        tags.Orientation ||
        tags.ExifVersion ||
        tags.ColorSpace ||
        tags.PixelXDimension ||
        tags.PixelYDimension ||
        tags.ExifImageWidth ||
        tags.ExifImageHeight;

      // Accept if has either camera info OR photo metadata
      if (hasCameraInfo || hasPhotoMetadata) {
        return { valid: true };
      }

      // If no EXIF data, check heuristics for WhatsApp vs Web/AI
      return await checkImageHeuristics(file, arrayBuffer, intl);
    } catch (error) {
      // If we can't read EXIF at all, check heuristics
      return await checkImageHeuristics(file, null, intl, error);
    }
  };

  const onDrop = useCallback(
    async acceptedFiles => {
      setValidationInProgress(true);
      const newErrors = [];
      const validFiles = [];
      const validPreviews = [];

      // Check total file count
      if (files.length + acceptedFiles.length > UPLOAD_CONSTRAINTS.MAX_FILES) {
        newErrors.push(
          intl.formatMessage(
            { id: 'ImageUpload.errorMaxFiles' },
            { maxFiles: UPLOAD_CONSTRAINTS.MAX_FILES }
          )
        );
        setErrors(newErrors);
        setValidationInProgress(false);
        return;
      }

      // Validate each file
      for (const file of acceptedFiles) {
        // Check file size
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

        // Check file type (Sharetribe only accepts PNG and JPEG)
        if (!Object.keys(UPLOAD_CONSTRAINTS.ACCEPTED_TYPES).includes(file.type)) {
          newErrors.push(
            intl.formatMessage({ id: 'ImageUpload.errorFileType' }, { fileName: file.name })
          );
          continue;
        }

        // CRITICAL: EXIF Validation
        const exifValidation = await validateImageEXIF(file, intl);
        if (!exifValidation.valid) {
          newErrors.push(exifValidation.error);
          continue;
        }

        // File is valid
        validFiles.push(file);
        validPreviews.push(URL.createObjectURL(file));
      }

      // Update state
      const updatedFiles = [...files, ...validFiles];
      const updatedPreviews = [...previewUrls, ...validPreviews];

      setFiles(updatedFiles);
      setPreviewUrls(updatedPreviews);
      setErrors(newErrors);
      setValidationInProgress(false);

      // Notify parent
      onImagesSelected(updatedFiles, updatedPreviews);
    },
    [files, previewUrls, onImagesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: UPLOAD_CONSTRAINTS.ACCEPTED_TYPES,
    maxFiles: UPLOAD_CONSTRAINTS.MAX_FILES,
    maxSize: UPLOAD_CONSTRAINTS.MAX_FILE_SIZE,
    disabled: isAnalyzing || validationInProgress,
  });

  const removeImage = index => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);

    // Revoke object URL to prevent memory leak
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

  return (
    <div className={css.container}>
      {/* Preview Grid with compact add button */}
      {previewUrls.length > 0 ? (
        <div className={css.previewSection}>
          <h3 className={css.previewTitle}>
            {intl.formatMessage(
              { id: 'ImageUpload.previewTitle' },
              { count: files.length, maxFiles: UPLOAD_CONSTRAINTS.MAX_FILES }
            )}
          </h3>
          <div className={css.previewGrid}>
            {/* Existing images */}
            {previewUrls.map((url, index) => (
              <div key={index} className={css.previewItem}>
                <img src={url} alt={`Preview ${index + 1}`} className={css.previewImage} />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className={css.deleteOverlay}
                  disabled={isAnalyzing}
                  aria-label={intl.formatMessage(
                    { id: 'ImageUpload.removeImageAriaLabel' },
                    { index: index + 1 }
                  )}
                >
                  <svg
                    className={css.trashIcon}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}

            {/* Compact add more button - only show if under max files */}
            {files.length < UPLOAD_CONSTRAINTS.MAX_FILES && (
              <div
                {...getRootProps()}
                className={`${css.previewItem} ${css.addMorePlaceholder} ${
                  isDragActive ? css.addMorePlaceholderActive : ''
                } ${isAnalyzing || validationInProgress ? css.addMorePlaceholderDisabled : ''}`}
              >
                <input {...getInputProps()} />
                <svg
                  className={css.addMoreIcon}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M 7 16 a 4 4 0 1 1 -0.88 -7.903 A 5 5 0 1 1 15.9 6 L 16 6 a 5 5 0 0 1 1 9.9 M 15 21 l -3 -3 m 0 0 l -3 3 m 3 -3 v 8"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Full-size Dropzone - only show when no images */
        <div
          {...getRootProps()}
          className={`${css.dropzone} ${isDragActive ? css.dropzoneActive : ''} ${
            isAnalyzing || validationInProgress ? css.dropzoneDisabled : ''
          }`}
        >
          <input {...getInputProps()} />
          <div className={css.dropzoneContent}>
            <svg
              className={css.uploadIcon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M 7 16 a 4 4 0 1 1 -0.88 -7.903 A 5 5 0 1 1 15.9 6 L 16 6 a 5 5 0 0 1 1 9.9 M 15 21 l -3 -3 m 0 0 l -3 3 m 3 -3 v 8"
              />
            </svg>
            {isDragActive ? (
              <p className={css.dropzoneText}>
                {intl.formatMessage({ id: 'ImageUpload.dropzoneTextActive' })}
              </p>
            ) : (
              <>
                <p className={css.dropzoneText}>
                  {intl.formatMessage({ id: 'ImageUpload.dropzoneText' })}{' '}
                  <span className={css.browseText}>
                    {intl.formatMessage({ id: 'ImageUpload.browseText' })}
                  </span>
                </p>
                <p className={css.dropzoneHint}>
                  {SKIP_EXIF_VALIDATION
                    ? intl.formatMessage(
                        { id: 'ImageUpload.hintTestingMode' },
                        {
                          maxFiles: UPLOAD_CONSTRAINTS.MAX_FILES,
                          maxSize: UPLOAD_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024,
                        }
                      )
                    : intl.formatMessage(
                        { id: 'ImageUpload.hintNormal' },
                        {
                          maxFiles: UPLOAD_CONSTRAINTS.MAX_FILES,
                          maxSize: UPLOAD_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024,
                        }
                      )}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Validation in progress */}
      {validationInProgress && (
        <div className={css.validationMessage}>
          <div className={css.spinner} />
          <span>{intl.formatMessage({ id: 'ImageUpload.validatingImages' })}</span>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className={css.errors}>
          {errors.map((error, index) => (
            <div key={index} className={css.error}>
              ⚠️ {error}
            </div>
          ))}
        </div>
      )}

      {/* Analyze Button */}
      {files.length > 0 && (
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isAnalyzing || validationInProgress}
          className={css.analyzeButton}
        >
          {isAnalyzing ? (
            <>
              <div className={css.spinner} />
              {intl.formatMessage({ id: 'ImageUpload.analyzingButton' })}
            </>
          ) : (
            <>
              <svg
                className={css.analyzeIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              {intl.formatMessage({ id: 'ImageUpload.analyzeButton' })}
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ImageUpload;
