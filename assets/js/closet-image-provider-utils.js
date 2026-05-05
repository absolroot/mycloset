"use strict";

(function exposeClosetImageProviderUtils() {
  const DEFAULT_STORAGE_PROVIDER = "supabase-storage";
  const DEFAULT_STORAGE_BUCKET = "wardrobe-images";
  const DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;

  function cleanText(value) {
    return String(value ?? "").trim();
  }

  function imageStorageConfig(config = window.WARDROBE_CONFIG || {}) {
    const storage = config.imageStorage || config.remoteImageStorage || {};
    const provider = cleanText(storage.provider) || DEFAULT_STORAGE_PROVIDER;
    const bucket = cleanText(storage.bucket) || cleanText(config.supabaseStorageBucket) || DEFAULT_STORAGE_BUCKET;
    const signedUrlExpiresInSeconds = Number(
      storage.signedUrlExpiresInSeconds ??
      storage.signedUrlExpiresIn ??
      config.signedImageUrlExpiresInSeconds ??
      DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS
    );

    return {
      bucket,
      provider,
      signedUrlExpiresInSeconds: Number.isFinite(signedUrlExpiresInSeconds) && signedUrlExpiresInSeconds > 0
        ? signedUrlExpiresInSeconds
        : DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS
    };
  }

  function normalizeImageLocator(value = {}, config = imageStorageConfig()) {
    const storagePath = cleanText(value.storagePath ?? value.storage_path ?? value.path);
    const storageProvider = cleanText(value.storageProvider ?? value.storage_provider) || config.provider;
    const storageBucket = cleanText(value.storageBucket ?? value.storage_bucket) || config.bucket;

    return {
      storageBucket,
      storagePath,
      storageProvider
    };
  }

  function imageStoragePath(userId, itemId, imageId) {
    return `${userId}/${itemId}/${imageId}.webp`;
  }

  function remoteImageFromRecord(record = {}, signedUrl = "", config = imageStorageConfig()) {
    const locator = normalizeImageLocator(record, config);

    return {
      id: record.id,
      storagePath: locator.storagePath,
      storageProvider: locator.storageProvider,
      storageBucket: locator.storageBucket,
      signedUrl,
      publicUrl: cleanText(record.publicUrl ?? record.public_url),
      url: signedUrl || cleanText(record.publicUrl ?? record.public_url),
      isPrimary: Boolean(record.isPrimary ?? record.is_primary),
      width: record.width,
      height: record.height,
      mime: record.mime || "image/webp"
    };
  }

  function remoteImageUrl(remoteImage = {}) {
    return cleanText(remoteImage.signedUrl || remoteImage.publicUrl || remoteImage.url);
  }

  function remoteImageCacheKey(remoteImage = {}) {
    const locator = normalizeImageLocator(remoteImage);
    return `${locator.storageProvider}:${locator.storageBucket}:${locator.storagePath}`;
  }

  function isSupabaseStorage(locatorOrConfig = imageStorageConfig()) {
    const provider = cleanText(locatorOrConfig.storageProvider || locatorOrConfig.provider);
    return provider === DEFAULT_STORAGE_PROVIDER;
  }

  window.closetImageProviderUtils = {
    DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS,
    DEFAULT_STORAGE_BUCKET,
    DEFAULT_STORAGE_PROVIDER,
    imageStorageConfig,
    imageStoragePath,
    isSupabaseStorage,
    normalizeImageLocator,
    remoteImageCacheKey,
    remoteImageFromRecord,
    remoteImageUrl
  };
})();
