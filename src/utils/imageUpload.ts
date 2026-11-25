/**
 * Client-side image resize & WebP compression helper so product/banner photos
 * stay lightweight (~45-120 KB) for both CDN upload and Edge-cached Firestore fallback.
 */
const MAX_ENCODED_DATA_URL_LENGTH = 240_000;

export function extractDataUrlMime(
  dataUrl: string
): 'image/webp' | 'image/jpeg' | 'image/png' | null {
  const match = dataUrl.match(/^data:(image\/(?:webp|jpeg|jpg|png));base64,/i);
  if (!match) return null;
  const lower = match[1].toLowerCase();
  if (lower === 'image/jpg') return 'image/jpeg';
  if (lower === 'image/webp' || lower === 'image/jpeg' || lower === 'image/png') {
    return lower;
  }
  return null;
}

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

  const steps: Array<[number, number]> = [
    [maxDim, quality],
    [Math.min(maxDim, 800), 0.7],
    [720, 0.62],
    [560, 0.54],
  ];

  for (const [stepDim, stepQuality] of steps) {
    const candidate = renderCompressedDataUrl(img, stepDim, stepQuality);
    if (candidate.length <= MAX_ENCODED_DATA_URL_LENGTH) {
      return candidate;
    }
  }

  throw new Error('Изображение слишком тяжёлое даже после сжатия. Выберите другое фото.');
}
