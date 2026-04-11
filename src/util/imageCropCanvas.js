/**
 * Canvas helpers for react-easy-crop: produce a JPEG blob from source image + pixel crop rect.
 */

export const loadImage = url =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', e => reject(e));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * @param {string} imageSrc - object URL or data URL
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop
 * @param {string} [mimeType='image/jpeg']
 * @param {number} [quality=0.92]
 * @returns {Promise<Blob>}
 */
export const getCroppedImageBlob = async (imageSrc, pixelCrop, mimeType = 'image/jpeg', quality = 0.92) => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D not available');
  }

  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), mimeType, quality);
  });
};

/**
 * @param {string} aspectRatio - e.g. "4/3", "3/4", "1.5"
 * @returns {number} width / height
 */
export const parseListingAspectRatio = aspectRatio => {
  if (aspectRatio == null) return 3 / 4;
  if (typeof aspectRatio === 'number' && Number.isFinite(aspectRatio) && aspectRatio > 0) {
    return aspectRatio;
  }
  const s = String(aspectRatio).trim();
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
  }
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : 3 / 4;
};

/**
 * Ritaglio centrato stile object-fit:cover su sorgente, area con rapporto aspectW:aspectH.
 */
export const getCenteredCoverCropPixels = (naturalWidth, naturalHeight, aspectW, aspectH) => {
  const targetRatio = aspectW / aspectH;
  const imgRatio = naturalWidth / naturalHeight;
  let cropW;
  let cropH;
  let sx;
  let sy;
  if (imgRatio > targetRatio) {
    cropH = naturalHeight;
    cropW = cropH * targetRatio;
    sx = (naturalWidth - cropW) / 2;
    sy = 0;
  } else {
    cropW = naturalWidth;
    cropH = cropW / targetRatio;
    sx = 0;
    sy = (naturalHeight - cropH) / 2;
  }
  return { x: sx, y: sy, width: cropW, height: cropH };
};

/**
 * Crop automatico centrato → JPEG (stesso effetto card3:4 con cover).
 * @param {string} imageSrc - object URL
 * @param {number} aspectW
 * @param {number} aspectH
 * @param {number} [maxLongEdge=2400]
 * @param {number} [quality=0.92]
 */
export const autoCropImageBlob = async (
  imageSrc,
  aspectW,
  aspectH,
  maxLongEdge = 2400,
  quality = 0.92
) => {
  const image = await loadImage(imageSrc);
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  const crop = getCenteredCoverCropPixels(iw, ih, aspectW, aspectH);

  let outW = Math.max(1, Math.round(crop.width));
  let outH = Math.max(1, Math.round(crop.height));
  const long = Math.max(outW, outH);
  if (long > maxLongEdge) {
    const scale = maxLongEdge / long;
    outW = Math.max(1, Math.round(outW * scale));
    outH = Math.max(1, Math.round(outH * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not available');
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outW, outH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', quality);
  });
};
