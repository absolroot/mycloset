"use strict";

(function exposeClosetItemUtils() {
  const {
    cleanNotionLabel,
    cleanText,
    hashString,
    normalizeColor,
    normalizeItemColor,
    parseKoreanDate,
    parseNumber,
    parsePrice
  } = window.closetFormatUtils;
  const {
    CATEGORY_MEASUREMENT_TEMPLATES,
    MEASURE_FIELDS,
    MEASUREMENT_BY_KEY,
    MEASUREMENT_BY_LABEL
  } = window.closetMeasurementUtils;
  const {
    defaultImageEdit
  } = window.closetImageStateUtils;

  function normalizeRating(value) {
    if (value === null || value === undefined || value === "") return null;
    const rating = Number(value);
    return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
  }

  function normalizeItemData(item) {
    const normalized = normalizeItemColor(item);
    if (!normalized) return normalized;
    const rating = normalizeRating(normalized.rating);
    return normalized.rating === rating ? normalized : { ...normalized, rating };
  }

  function csvToItems(text, options = {}) {
    const rows = window.closetCsvUtils.parseCsv(text);
    return rows.map((row, index) => csvRowToItem(row, index, options));
  }

  function csvRowToItem(row, index, options = {}) {
    const now = new Date().toISOString();
    const name = cleanText(row["이름"]) || `이름 없는 제품 ${index + 1}`;
    const brand = cleanText(row["브랜드"]);
    const sizeLabel = cleanText(row["옵션"] || row["신발 사이즈"]);
    const purchaseDate = parseKoreanDate(row["구매일"]);
    const id = `csv-${index}-${hashString([name, brand, sizeLabel, purchaseDate || ""].join("|"))}`;
    const measurements = {};

    MEASURE_FIELDS.forEach((field) => {
      const value = parseNumber(row[field]);
      if (value !== null) measurements[field] = value;
    });

    const tempImageUrl = options.useTempImages && options.getTemporaryImageUrl
      ? options.getTemporaryImageUrl(index)
      : "";

    return {
      id,
      name,
      productUrl: "",
      memo: "",
      parentCategory: cleanNotionLabel(row["상위 카테고리"]),
      category: cleanNotionLabel(row["카테고리"]),
      brand,
      color: normalizeColor(row["색상"]),
      sizeLabel,
      shoeSize: cleanText(row["신발 사이즈"]),
      retailPrice: parsePrice(row["정가"]),
      purchasePrice: parsePrice(row["구매가"]),
      purchaseDate,
      owned: String(row["보유"] || "").toLowerCase() === "yes",
      rating: normalizeRating(row["평점"] || row.rating || row.Rating),
      measurements,
      measurementsDirty: Object.keys(measurements).length > 0,
      imageIds: [],
      primaryImageId: null,
      remoteImages: [],
      imagesDirty: false,
      externalImageUrl: tempImageUrl,
      externalImageEdit: defaultImageEdit(),
      source: "csv",
      sourceIndex: index,
      raw: row,
      createdAt: now,
      updatedAt: now
    };
  }

  function mergeImportedItem(existing, item) {
    return {
      ...existing,
      ...item,
      rating: item.rating ?? existing?.rating ?? null,
      imageIds: existing?.imageIds || [],
      primaryImageId: existing?.primaryImageId || null,
      remoteImages: existing?.remoteImages || [],
      measurementsDirty: existing?.measurementsDirty ?? !sameMeasurements(existing?.measurements || {}, item.measurements || {}),
      externalImageUrl: existing?.externalImageUrl || item.externalImageUrl || "",
      externalImageEdit: existing?.externalImageEdit || item.externalImageEdit || defaultImageEdit(),
      productUrl: existing?.productUrl || item.productUrl || "",
      memo: existing?.memo || item.memo || "",
      createdAt: existing?.createdAt || item.createdAt,
      updatedAt: existing?.updatedAt || item.updatedAt
    };
  }

  function getMeasurementFieldsForItem(item) {
    const fields = [];
    const seen = new Set();

    const addByLabel = (label, custom = false) => {
      const cleanLabel = cleanText(label);
      if (!cleanLabel || seen.has(cleanLabel)) return;

      const definition = MEASUREMENT_BY_LABEL.get(cleanLabel);
      fields.push({
        key: definition?.key || "",
        label: cleanLabel,
        unit: definition?.unit || "cm",
        custom: custom || !definition
      });
      seen.add(cleanLabel);
    };

    getTemplateMeasurementKeys(item).forEach((key) => {
      const definition = MEASUREMENT_BY_KEY.get(key);
      if (definition) addByLabel(definition.label);
    });

    Object.keys(item.measurements || {}).forEach((label) => addByLabel(label, !MEASUREMENT_BY_LABEL.has(label)));

    if (!fields.length) {
      ["총장", "어깨", "가슴", "소매"].forEach((label) => addByLabel(label));
    }

    return fields;
  }

  function getTemplateMeasurementKeys(item) {
    const categoryText = [item.parentCategory, item.category].filter(Boolean).join(" ");
    const template = CATEGORY_MEASUREMENT_TEMPLATES.find((candidate) =>
      candidate.match.some((keyword) => categoryText.includes(keyword))
    );
    return template?.fields || [];
  }

  function sanitizeMeasurementData(measurements) {
    const result = {};
    Object.entries(measurements || {}).forEach(([label, value]) => {
      const cleanLabel = cleanText(label);
      const parsed = parseNumber(value);
      if (cleanLabel && parsed !== null) result[cleanLabel] = parsed;
    });
    return result;
  }

  function sameMeasurements(a = {}, b = {}) {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key, index) => key === bKeys[index] && Number(a[key]) === Number(b[key]));
  }

  function isShoeCategory(item) {
    const text = [item.parentCategory, item.category].filter(Boolean).join(" ");
    return /신발|스니커즈|구두|샌들|부츠/.test(text);
  }

  function getPrimaryImage(item) {
    if (item?.primaryImageId) {
      return { localId: item.primaryImageId, remoteUrl: "", externalUrl: false, editable: true, edit: defaultImageEdit() };
    }

    const externalImageUrl = cleanText(item?.externalImageUrl);
    if (externalImageUrl) {
      return { localId: "", remoteUrl: externalImageUrl, externalUrl: true, editable: true, edit: item.externalImageEdit || defaultImageEdit() };
    }

    const remote = [...(item?.remoteImages || [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))[0];
    const remoteUrl = window.closetImageProviderUtils.remoteImageUrl(remote);
    return {
      localId: "",
      remoteId: remote?.id || "",
      storagePath: remote?.storagePath || "",
      storageProvider: remote?.storageProvider || "",
      storageBucket: remote?.storageBucket || "",
      remoteUrl,
      externalUrl: false,
      editable: Boolean(remoteUrl),
      edit: defaultImageEdit()
    };
  }

  function clonePlainItem(item) {
    return JSON.parse(JSON.stringify(item));
  }

  window.closetItemUtils = {
    clonePlainItem,
    csvToItems,
    getMeasurementFieldsForItem,
    getPrimaryImage,
    isShoeCategory,
    mergeImportedItem,
    normalizeItemData,
    normalizeRating,
    sanitizeMeasurementData,
    sameMeasurements
  };
})();
