/**
 * Downscale an uploaded image to a data URL small enough for localStorage.
 * With `square`, the image is center-cropped to a square first.
 */
export function resizeImage(file: File, maxW: number, maxH: number, square = false): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("That file isn't an image."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (square) {
        const s = Math.min(sw, sh);
        sx = (sw - s) / 2;
        sy = (sh - s) / 2;
        sw = sh = s;
      }
      const scale = Math.min(1, maxW / sw, maxH / sh);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/webp", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image."));
    };
    img.src = url;
  });
}

export const isHttpUrl = (s: string) => /^https?:\/\/[^\s]+$/i.test(s.trim());
