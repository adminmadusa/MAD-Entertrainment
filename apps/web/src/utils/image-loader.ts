import { ImageLoaderProps } from 'next/image';

/**
 * Custom global loader for Next.js <Image> components.
 * Rewrites remote Cloudinary and Unsplash URLs directly to their optimized CDN
 * counterparts with matching width/quality constraints, bypassing the Next.js server.
 */
export default function universalLoader({ src, width, quality }: ImageLoaderProps): string {
  // 1. Cloudinary CDN Support
  if (src.includes('res.cloudinary.com')) {
    if (src.includes('/upload/')) {
      const uploadPart = '/upload/';
      const index = src.indexOf(uploadPart);
      const afterUpload = src.substring(index + uploadPart.length);
      const segments = afterUpload.split('/');
      const nextSegment = segments[0];

      const q = quality || 75;
      const transformation = `c_scale,w_${width},q_${q},f_webp`;

      // If URL already contains a transformation segment (e.g. from getOptimizedImageUrl)
      if (nextSegment.includes('_') || nextSegment.includes(',')) {
        return src.replace(`/upload/${nextSegment}`, `/upload/${transformation}`);
      } else {
        return src.replace('/upload/', `/upload/${transformation}/`);
      }
    }
    return src;
  }

  // 2. Unsplash CDN Support
  if (src.includes('images.unsplash.com')) {
    try {
      const urlObj = new URL(src);
      urlObj.searchParams.set('w', width.toString());
      urlObj.searchParams.set('auto', 'format');
      urlObj.searchParams.set('q', (quality || 75).toString());
      return urlObj.toString();
    } catch {
      return src;
    }
  }

  // 3. Fallback for static assets and local files
  return src;
}
