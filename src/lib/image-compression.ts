import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file for efficient uploading, especially on mobile devices.
 * 
 * Target size: ~1MB max
 * Target dimensions: 1920px max width/height
 * 
 * Non-image files or errors will return the original file unchanged.
 *
 * @param file The original File object
 * @returns A Promise resolving to the compressed File, or the original File if compression fails/is skipped.
 */
export async function compressImage(file: File): Promise<File> {
    // Only compress images. Skip SVG and GIFs which may lose animation/vectors.
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
        return file;
    }

    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type // Preserve original type (JPEG, PNG, WebP)
    };

    try {
        const compressedBlob = await imageCompression(file, options);
        // Convert Blob back to File to maintain the original File interface
        const compressedFile = new File([compressedBlob], file.name, {
            type: compressedBlob.type,
            lastModified: Date.now(),
        });

        return compressedFile;
    } catch (error) {
        return file;
    }
}
