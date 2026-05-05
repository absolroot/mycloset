"use strict";

(function exposeClosetBackupUtils() {
  const {
    backupImagePath,
    createZipBlob,
    fetchBackupImageBlob,
    sanitizeItemForExport
  } = window.closetExportUtils;
  const {
    cleanText,
    hashString,
    uniqueValues
  } = window.closetFormatUtils;
  const {
    isSupabaseStorage,
    normalizeImageLocator,
    remoteImageUrl
  } = window.closetImageProviderUtils;

  async function createZipBackup(items, options = {}) {
    const imageBackup = await collectImageFiles(items, options);
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      items: items.map(sanitizeItemForExport),
      images: imageBackup.images,
      skippedImages: imageBackup.skippedImages
    };
    const zipBlob = await createZipBlob([
      {
        name: "backup.json",
        blob: new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      },
      ...imageBackup.files
    ]);

    return { zipBlob, skippedImages: imageBackup.skippedImages };
  }

  async function collectImageFiles(items, options = {}) {
    const files = [];
    const images = [];
    const skippedImages = [];
    const seen = new Set();
    const getImageRecord = options.getImageRecord;
    const getRemoteImageUrl = options.getRemoteImageUrl;
    const normalizeImageEdit = options.normalizeImageEdit;
    const defaultImageEdit = options.defaultImageEdit;

    for (const item of items) {
      const localImageIds = uniqueValues([item.primaryImageId, ...(item.imageIds || [])]).filter(Boolean);
      for (const imageId of localImageIds) {
        if (seen.has(imageId)) continue;

        try {
          const image = await getImageRecord(imageId);
          if (!image?.blob) {
            skippedImages.push({ itemId: item.id, imageId, source: "local", reason: "missing-local-blob" });
            continue;
          }

          const mime = image.mime || image.blob.type || "application/octet-stream";
          const filePath = backupImagePath(item.id, imageId, mime);
          seen.add(imageId);
          files.push({ name: filePath, blob: image.blob });
          images.push({
            itemId: item.id,
            imageId,
            file: filePath,
            source: "local",
            mime,
            width: image.width || null,
            height: image.height || null,
            storagePath: image.storagePath || "",
            storageProvider: image.storageProvider || "",
            storageBucket: image.storageBucket || "",
            isPrimary: imageId === item.primaryImageId
          });
        } catch (error) {
          console.warn("Local image backup failed", error);
          skippedImages.push({ itemId: item.id, imageId, source: "local", reason: "read-failed" });
        }
      }

      for (const remoteImage of item.remoteImages || []) {
        const imageId = remoteImage.id || remoteImage.storagePath || "";
        if (!imageId || seen.has(imageId)) continue;

        const url = await getRemoteImageUrl(remoteImage);
        if (!url) {
          skippedImages.push({ itemId: item.id, imageId, source: "remote", reason: "missing-url" });
          continue;
        }

        try {
          const blob = await fetchBackupImageBlob(url);
          const mime = blob.type || "application/octet-stream";
          const filePath = backupImagePath(item.id, imageId, mime);
          seen.add(imageId);
          files.push({ name: filePath, blob });
          images.push({
            itemId: item.id,
            imageId,
            file: filePath,
            source: "remote",
            mime,
            width: remoteImage.width || null,
            height: remoteImage.height || null,
            storagePath: remoteImage.storagePath || "",
            storageProvider: remoteImage.storageProvider || "",
            storageBucket: remoteImage.storageBucket || "",
            isPrimary: Boolean(remoteImage.isPrimary)
          });
        } catch (error) {
          console.warn("Remote image backup failed", error);
          skippedImages.push({ itemId: item.id, imageId, source: "remote", reason: "fetch-failed" });
        }
      }

      const externalUrl = cleanText(item.externalImageUrl);
      if (externalUrl) {
        const imageId = `external-${hashString(externalUrl)}`;
        if (seen.has(imageId)) continue;

        try {
          const blob = await fetchBackupImageBlob(externalUrl);
          const mime = blob.type || "application/octet-stream";
          const filePath = backupImagePath(item.id, imageId, mime);
          seen.add(imageId);
          files.push({ name: filePath, blob });
          images.push({
            itemId: item.id,
            imageId,
            file: filePath,
            source: "external-url",
            mime,
            width: null,
            height: null,
            externalUrl,
            edit: normalizeImageEdit(item.externalImageEdit || defaultImageEdit()),
            isPrimary: !item.primaryImageId
          });
        } catch (error) {
          console.warn("External image backup failed", error);
          skippedImages.push({ itemId: item.id, imageId, source: "external-url", url: externalUrl, reason: "fetch-failed" });
        }
      }
    }

    return { files, images, skippedImages };
  }

  async function getRemoteImageUrl(remoteImage, supabase) {
    const locator = normalizeImageLocator(remoteImage);
    if (supabase && locator.storagePath && isSupabaseStorage(locator)) {
      try {
        const { data, error } = await supabase.storage
          .from(locator.storageBucket)
          .createSignedUrl(locator.storagePath, 60 * 60);
        if (error) throw error;
        if (data?.signedUrl) return data.signedUrl;
      } catch (error) {
        console.warn("Fresh signed image URL could not be created", error);
      }
    }

    return remoteImageUrl(remoteImage);
  }

  window.closetBackupUtils = {
    createZipBackup,
    getRemoteImageUrl
  };
})();
