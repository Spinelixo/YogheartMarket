"use client";

/**
 * Utility to process uploaded image files:
 * 1. Automatically converts Apple HEIC/HEIF photos to high-quality JPEGs.
 * 2. Downscales extremely large photos (like 4K/8K images) to 2K (max 2048px on the longest edge)
 *    to preserve storage and speed up uploads while maintaining crisp, high-quality resolution.
 * 3. Relies on the browser's native EXIF orientation rendering (modern WebView auto-orientation).
 * 4. Compresses the output JPEG at 92% quality to ensure details look stunning with minimal artifacts.
 */

export async function processImageFile(file: File): Promise<{ dataUrl: string; name: string; type: string }> {
  const lowercaseName = file.name.toLowerCase();
  const isHeic = lowercaseName.endsWith(".heic") || lowercaseName.endsWith(".heif") || file.type === "image/heic" || file.type === "image/heif";

  let targetFile: Blob = file;
  let targetName = file.name;

  // 1. Handle HEIC/HEIF conversion (iPhone photos in native format)
  if (isHeic) {
    try {
      const heic2any = (await import("heic2any")).default;

      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.92,
      });

      const blob = Array.isArray(converted) ? converted[0] : converted;
      targetFile = blob;
      targetName = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
    } catch (err) {
      console.error("HEIC conversion failed, trying standard processing:", err);
    }
  }

  // 2. Read and compress the image using canvas
  return new Promise((resolve, reject) => {
    if (
      !targetFile.type.startsWith("image/") &&
      !targetName.toLowerCase().endsWith(".jpg") &&
      !targetName.toLowerCase().endsWith(".jpeg") &&
      !targetName.toLowerCase().endsWith(".png")
    ) {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          dataUrl: reader.result as string,
          name: targetName,
          type: file.type
        });
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(targetFile);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(targetFile);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX_DIMENSION = 2048;
      const srcWidth = img.naturalWidth || img.width;
      const srcHeight = img.naturalHeight || img.height;

      let displayWidth = srcWidth;
      let displayHeight = srcHeight;

      if (displayWidth > MAX_DIMENSION || displayHeight > MAX_DIMENSION) {
        if (displayWidth > displayHeight) {
          displayHeight = Math.round((displayHeight * MAX_DIMENSION) / displayWidth);
          displayWidth = MAX_DIMENSION;
        } else {
          displayWidth = Math.round((displayWidth * MAX_DIMENSION) / displayHeight);
          displayHeight = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get 2D canvas context"));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw image using browser's native orientation rendering
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      resolve({
        dataUrl,
        name: targetName.replace(/\.[^.]+$/, "") + ".jpg",
        type: "image/jpeg"
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image. The file may be corrupted or in an unsupported format."));
    };

    img.src = objectUrl;
  });
}
