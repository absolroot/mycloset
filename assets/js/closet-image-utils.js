"use strict";

(function exposeClosetImageUtils() {
  const IMAGE_BACKGROUND_COLOR = "#ffffff";

  async function createEditedImage(sourceBlob, itemId, options = {}) {
    const bitmap = await createImageBitmap(sourceBlob);

    try {
      const maxSide = 720;
      const outputSize = options.outputSize || maxSide;
      const editScale = Number(options.scale ?? 1);
      const offsetX = Number(options.offsetX ?? 0);
      const offsetY = Number(options.offsetY ?? 0);
      const containScale = Math.min(outputSize / bitmap.width, outputSize / bitmap.height);
      const drawWidth = Math.max(1, Math.round(bitmap.width * containScale * editScale));
      const drawHeight = Math.max(1, Math.round(bitmap.height * containScale * editScale));
      const drawX = Math.round((outputSize - drawWidth) / 2 + outputSize * (offsetX / 100));
      const drawY = Math.round((outputSize - drawHeight) / 2 + outputSize * (offsetY / 100));
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.fillStyle = IMAGE_BACKGROUND_COLOR;
      context.fillRect(0, 0, outputSize, outputSize);
      context.drawImage(bitmap, drawX, drawY, drawWidth, drawHeight);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("Image compression failed"));
        }, "image/webp", 0.78);
      });

      return {
        id: `img-${crypto.randomUUID()}`,
        itemId,
        blob,
        mime: blob.type || "image/webp",
        width: outputSize,
        height: outputSize,
        edit: {
          scale: editScale,
          offsetX,
          offsetY,
          background: IMAGE_BACKGROUND_COLOR
        },
        createdAt: new Date().toISOString()
      };
    } finally {
      bitmap.close?.();
    }
  }

  window.closetImageUtils = {
    createEditedImage
  };
})();
