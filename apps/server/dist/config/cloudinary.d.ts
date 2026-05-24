import { v2 as cloudinary } from 'cloudinary';
export declare function initCloudinary(): void;
export interface UploadOptions {
    folder?: string;
    transformation?: object[];
    tags?: string[];
    publicId?: string;
}
export declare function uploadToCloudinary(file: string | Buffer, options?: UploadOptions): Promise<{
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
}>;
export declare function deleteFromCloudinary(publicId: string): Promise<void>;
/**
 * Generate a blur placeholder data URL for an image
 */
export declare function getBlurDataUrl(publicId: string, cloudName: string): string;
/**
 * Build an optimized Cloudinary URL with transformations
 */
export declare function buildCloudinaryUrl(publicId: string, cloudName: string, options?: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
    crop?: string;
}): string;
export { cloudinary };
//# sourceMappingURL=cloudinary.d.ts.map