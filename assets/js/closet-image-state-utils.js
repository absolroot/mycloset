"use strict";

(function exposeClosetImageStateUtils() {
  function defaultImageEdit() {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }

  function normalizeImageEdit(options = {}) {
    const clampNumber = window.closetFormatUtils.clampNumber;
    return {
      scale: clampNumber(options.scale, 0.5, 2.5, 1),
      offsetX: clampNumber(options.offsetX, -50, 50, 0),
      offsetY: clampNumber(options.offsetY, -50, 50, 0)
    };
  }

  function imageEditStyle(options = {}) {
    const edit = normalizeImageEdit(options);
    return `--image-scale:${edit.scale};--image-x:${edit.offsetX}%;--image-y:${edit.offsetY}%;`;
  }

  function normalizeImageUrl(value) {
    const cleanText = window.closetFormatUtils.cleanText;
    const url = cleanText(value);
    if (!url) return "";

    try {
      const parsed = new URL(url, window.location.href);
      if (!["http:", "https:"].includes(parsed.protocol)) return "";
      return parsed.href;
    } catch (error) {
      console.warn("Invalid image URL", error);
      return "";
    }
  }

  function isFreshRemoteImageCache(record, remote, itemUpdatedAt) {
    const normalizeImageLocator = window.closetImageProviderUtils?.normalizeImageLocator;
    const recordLocator = normalizeImageLocator ? normalizeImageLocator(record) : { storagePath: record?.storagePath || "" };
    const remoteLocator = normalizeImageLocator ? normalizeImageLocator(remote) : { storagePath: remote?.storagePath || "" };

    return Boolean(
      record?.blob &&
      record.cachedFromRemote &&
      recordLocator.storagePath === remoteLocator.storagePath &&
      (recordLocator.storageProvider || "") === (remoteLocator.storageProvider || "") &&
      (recordLocator.storageBucket || "") === (remoteLocator.storageBucket || "") &&
      (record.remoteItemUpdatedAt || "") === (itemUpdatedAt || "")
    );
  }

  function applyImageUrl(element, url) {
    if (element.tagName === "IMG") {
      element.src = url;
    } else {
      element.style.backgroundImage = `url("${url}")`;
    }
  }

  window.closetImageStateUtils = {
    applyImageUrl,
    defaultImageEdit,
    imageEditStyle,
    isFreshRemoteImageCache,
    normalizeImageEdit,
    normalizeImageUrl
  };
})();
