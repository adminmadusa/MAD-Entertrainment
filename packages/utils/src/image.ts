function isCloudinaryHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'res.cloudinary.com' || hostname.endsWith('.cloudinary.com');
  } catch {
    return false;
  }
}

function isUnsplashHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'images.unsplash.com' || hostname.endsWith('.unsplash.com');
  } catch {
    return false;
  }
}

/**
 * Cloudinary URL transformation parameters:
 * c_scale: Simple scale resizing mode (preserves original aspect ratio)
 * w_WIDTH: Scale the image down to the target width (preserving aspect ratio)
 * q_auto: Apply Cloudinary's smart compression quality setting (auto:good)
 * f_webp: Format image to WebP
 */
export function getOptimizedCloudinaryUrl(url: string, width: number = 800): string {
  if (!url || !isCloudinaryHost(url)) return url;

  if (url.includes('/upload/')) {
    const uploadPart = '/upload/';
    const index = url.indexOf(uploadPart);
    const afterUpload = url.substring(index + uploadPart.length);

    // If the next segment is a transformation segment (e.g., contains ',' or '_', and is not a version folder),
    // we keep it as is to avoid breaking pre-configured parameters.
    const nextSegment = afterUpload.split('/')[0];
    if (nextSegment.includes('_') || nextSegment.includes(',')) {
      return url;
    }

    return url.replace('/upload/', `/upload/c_scale,w_${width},q_auto,f_webp/`);
  }

  return url;
}

/**
 * Unsplash URL transformation parameters:
 * w=WIDTH: Resize to the specified width
 * q=80: Set quality to 80%
 * auto=format: Automatically deliver AVIF/WebP depending on browser support
 */
export function getOptimizedUnsplashUrl(url: string, width: number = 800): string {
  if (!url || !isUnsplashHost(url)) return url;

  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('w', width.toString());
    urlObj.searchParams.set('auto', 'format');
    urlObj.searchParams.set('q', '80');
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Universal helper to optimize image URLs based on their hosting provider.
 * Supports Cloudinary and Unsplash formats.
 */
export function getOptimizedImageUrl(url: string, width: number = 800): string {
  if (!url) return url;
  if (isCloudinaryHost(url)) {
    return getOptimizedCloudinaryUrl(url, width);
  }
  if (isUnsplashHost(url)) {
    return getOptimizedUnsplashUrl(url, width);
  }
  return url;
}
