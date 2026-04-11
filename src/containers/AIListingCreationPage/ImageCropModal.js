import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useIntl } from '../../util/reactIntl';
import { getCroppedImageBlob, parseListingAspectRatio } from '../../util/imageCropCanvas';

import css from './ImageCropModal.module.css';

/**
 * Modal: ritaglio interattivo a aspect ratio fisso (listing marketplace).
 * @param {boolean} [props.isRefine] - testi da “rifinitura” opzionale dopo crop automatico
 */
const ImageCropModal = ({ imageUrl, aspectRatioConfig, onCancel, onConfirm, isRefine = false }) => {
  const intl = useIntl();
  const aspect = parseListingAspectRatio(aspectRatioConfig);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels || submitting) return;
    setSubmitting(true);
    try {
      const blob = await getCroppedImageBlob(imageUrl, croppedAreaPixels);
      await onConfirm(blob);
    } catch (e) {
      console.error('Image crop failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const stop = e => e.stopPropagation();

  return (
    <div
      className={css.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-crop-title"
      onClick={onCancel}
      onKeyDown={e => {
        if (e.key === 'Escape') onCancel();
      }}
    >
      <div className={css.dialog} onClick={stop}>
        <div className={css.header}>
          <h2 id="image-crop-title" className={css.title}>
            {intl.formatMessage({
              id: isRefine ? 'ImageCropModal.titleRefine' : 'ImageCropModal.title',
            })}
          </h2>
          <p className={css.subtitle}>
            {intl.formatMessage({
              id: isRefine ? 'ImageCropModal.subtitleRefine' : 'ImageCropModal.subtitle',
            })}
          </p>
        </div>

        <div className={css.cropWrap}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
            objectFit="contain"
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
                position: 'relative',
              },
            }}
          />
        </div>

        <div className={css.zoomRow}>
          <span className={css.zoomLabel}>{intl.formatMessage({ id: 'ImageCropModal.zoom' })}</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            className={css.zoomSlider}
            onChange={e => setZoom(Number(e.target.value))}
            aria-label={intl.formatMessage({ id: 'ImageCropModal.zoomAria' })}
          />
        </div>

        <div className={css.actions}>
          <button type="button" className={`${css.btn} ${css.btnSecondary}`} onClick={onCancel}>
            {intl.formatMessage({ id: 'ImageCropModal.cancel' })}
          </button>
          <button
            type="button"
            className={`${css.btn} ${css.btnPrimary}`}
            onClick={handleConfirm}
            disabled={!croppedAreaPixels || submitting}
          >
            {submitting
              ? intl.formatMessage({ id: 'ImageCropModal.saving' })
              : intl.formatMessage({ id: 'ImageCropModal.confirm' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
