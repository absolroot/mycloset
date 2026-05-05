"use strict";

(function exposeClosetGuestMergeUtils() {
  const {
    cleanText
  } = window.closetFormatUtils;

  const SAMPLE_NAME_PREFIX = "\uC608\uC2DC)";

  function getConfiguredPlaceholderImageUrls() {
    return [
      ...(Array.isArray(window.WARDROBE_TEMP_IMAGE_URLS) ? window.WARDROBE_TEMP_IMAGE_URLS : []),
      ...(Array.isArray(window.WARDROBE_GUEST_SAMPLE_IMAGE_URLS) ? window.WARDROBE_GUEST_SAMPLE_IMAGE_URLS : [])
    ];
  }

  function withGuestSampleLabel(item) {
    const name = cleanText(item?.name);
    return {
      ...item,
      guestSample: true,
      name: name.startsWith(SAMPLE_NAME_PREFIX) ? name : `${SAMPLE_NAME_PREFIX} ${name}`
    };
  }

  function stripGuestSamplePrefix(value) {
    const text = cleanText(value);
    return text.startsWith(SAMPLE_NAME_PREFIX)
      ? text.slice(SAMPLE_NAME_PREFIX.length).trimStart()
      : text;
  }

  function isGuestSampleItem(item, sampleIds = new Set()) {
    return Boolean(
      item?.guestSample ||
      sampleIds.has(item?.id) ||
      cleanText(item?.name).startsWith(SAMPLE_NAME_PREFIX)
    );
  }

  function isTemporaryPlaceholderImageUrl(url, placeholderUrls) {
    const value = cleanText(url);
    if (!value) return false;

    const candidates = Array.isArray(placeholderUrls) ? placeholderUrls : getConfiguredPlaceholderImageUrls();
    return candidates.some((candidate) => cleanText(candidate) === value);
  }

  function getMergeIdentityKey(item) {
    const name = stripGuestSamplePrefix(item?.name);
    if (!name) return "";

    return [
      cleanText(item?.brand).toLocaleLowerCase("ko-KR"),
      name.toLocaleLowerCase("ko-KR"),
      cleanText(item?.sizeLabel || item?.shoeSize).toLocaleLowerCase("ko-KR"),
      cleanText(item?.purchaseDate)
    ].join("|");
  }

  function buildGuestImportItem(sourceItem, options = {}) {
    const externalImageUrl = isTemporaryPlaceholderImageUrl(sourceItem?.externalImageUrl)
      ? ""
      : sourceItem?.externalImageUrl || "";

    return {
      ...sourceItem,
      id: options.existingItem ? `item-${crypto.randomUUID()}` : sourceItem.id,
      externalImageUrl,
      guestSample: false,
      source: sourceItem.source === "csv" ? "guest-import" : sourceItem.source || "guest-import",
      remoteImages: [],
      raw: {
        ...(sourceItem.raw || {}),
        externalImageUrl
      },
      updatedAt: options.now || new Date().toISOString()
    };
  }

  window.closetGuestMergeUtils = {
    buildGuestImportItem,
    getMergeIdentityKey,
    isGuestSampleItem,
    isTemporaryPlaceholderImageUrl,
    stripGuestSamplePrefix,
    withGuestSampleLabel
  };
})();
