/**
 * Client-side image resize & compression helper so admin photo uploads
 * never rely solely on unauthenticated Firebase Storage and stay well
 * within Firestore's document size limits.
 */
const MAX_ENCODED_DATA_URL_LENGTH = 420_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Не удалось прочитать выбранный файл.'));
    reader.readAsDataURL(file);
  });
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не удалось обработать изображение.'));
    img.src = src;
  });
}

function renderCompressedDataUrl(
  img: HTMLImageElement,
  maxDim: number,
  quality: number
): string {
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Браузер не поддерживает обработку изображений.');
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  try {
    const webp = canvas.toDataURL('image/webp', quality);
    if (webp.startsWith('data:image/webp') && webp.length <= MAX_ENCODED_DATA_URL_LENGTH) {
      return webp;
    }
  } catch {
    // WebP encoding unsupported — fall back to JPEG below
  }

  return canvas.toDataURL('image/jpeg', quality);
}

export async function compressImageFileToDataUrl(
  file: File,
  options?: { maxDim?: number; quality?: number }
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Поддерживаются только изображения (JPG, PNG, WEBP).');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Файл слишком большой (максимум 15 МБ).');
  }

  const maxDim = options?.maxDim ?? 900;
  const quality = options?.quality ?? 0.78;

  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadHtmlImage(rawDataUrl);

  let compressed = renderCompressedDataUrl(img, maxDim, quality);
  if (compressed.length > MAX_ENCODED_DATA_URL_LENGTH) {
    compressed = renderCompressedDataUrl(img, Math.min(maxDim, 720), 0.68);
  }
  if (compressed.length > MAX_ENCODED_DATA_URL_LENGTH) {
    compressed = renderCompressedDataUrl(img, 560, 0.58);
  }
  if (compressed.length > MAX_ENCODED_DATA_URL_LENGTH) {
    throw new Error('Изображение слишком тяжёлое даже после сжатия. Выберите другое фото.');
  }

  return compressed;
}
