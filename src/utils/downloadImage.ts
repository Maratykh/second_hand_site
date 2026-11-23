import { buildProductDownloadFilename } from './storeLogic';

export async function downloadProductPhoto(
  imageUrl: string,
  productTitle: string,
  index = 0
): Promise<void> {
  const filename = buildProductDownloadFilename(productTitle, index);

  // Local / same-origin or CORS-enabled URLs (e.g. /src/assets/* or Firebase Storage)
  try {
    const res = await fetch(imageUrl);
    if (res.ok) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      return;
    }
  } catch {
    // Fall through to server proxy for cross-origin URLs like userapi.com
  }

  const proxyUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}&name=${encodeURIComponent(filename)}`;
  const link = document.createElement('a');
  link.href = proxyUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
