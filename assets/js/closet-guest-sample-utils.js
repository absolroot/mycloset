"use strict";

(function exposeClosetGuestSampleUtils() {
  const {
    cleanNotionLabel,
    cleanText
  } = window.closetFormatUtils;

  const SAMPLE_MATCHERS = [
    {
      key: "new-balance-996",
      matches: (row) => {
        const brand = rowText(row, "브랜드");
        const name = rowText(row, "이름");
        return brand === "뉴발란스" && /(^|[^0-9])(?:cm)?996/i.test(name);
      }
    },
    {
      key: "apple-watch-40",
      matches: (row) => {
        const brand = rowText(row, "브랜드");
        const name = rowText(row, "이름");
        const option = rowText(row, "옵션");
        return brand === "애플" && name.includes("애플워치") && (name.includes("40") || option === "40");
      }
    },
    {
      key: "uniqlo-check-shirt",
      matches: (row) => {
        const brand = rowText(row, "브랜드");
        const name = rowText(row, "이름");
        const category = cleanNotionLabel(row["카테고리"]);
        return brand === "유니클로" && name.includes("체크") && category.includes("셔츠");
      }
    }
  ];

  function rowText(row, key) {
    return cleanText(row?.[key]);
  }

  function getGuestSampleImageUrl(index) {
    const urls = Array.isArray(window.WARDROBE_GUEST_SAMPLE_IMAGE_URLS)
      ? window.WARDROBE_GUEST_SAMPLE_IMAGE_URLS
      : [];
    return urls[index] || "";
  }

  function pickGuestSampleRows(rows) {
    if (!Array.isArray(rows)) return [];

    const used = new Set();
    return SAMPLE_MATCHERS.map((matcher) => {
      const index = rows.findIndex((row, rowIndex) => !used.has(rowIndex) && matcher.matches(row));
      if (index < 0) return null;
      used.add(index);
      return rows[index];
    }).filter(Boolean);
  }

  window.closetGuestSampleUtils = {
    getGuestSampleImageUrl,
    pickGuestSampleRows
  };
})();
