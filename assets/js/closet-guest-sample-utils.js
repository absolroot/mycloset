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

  const FALLBACK_SAMPLE_ROWS = [
    {
      "브랜드": "뉴발란스",
      "이름": "CM996BG",
      "옵션": "265",
      "상위 카테고리": "신발",
      "카테고리": "스니커즈",
      "색상": "그레이/실버",
      "정가": "139,000",
      "구매가": "125,100",
      "구매일": "2023년 11월 14일",
      "보유": "Yes",
      "신발 사이즈": "265"
    },
    {
      "브랜드": "애플",
      "이름": "애플워치 SE2 40mm",
      "옵션": "40",
      "상위 카테고리": "악세사리",
      "카테고리": "시계/팔찌/반지",
      "색상": "화이트",
      "정가": "329,000",
      "구매가": "149,000",
      "구매일": "2023년 10월 15일",
      "보유": "Yes",
      "신발 사이즈": ""
    },
    {
      "브랜드": "유니클로",
      "이름": "플란넬체크셔츠(긴팔·레귤러칼라)F",
      "옵션": "L",
      "상위 카테고리": "상의",
      "카테고리": "셔츠 (긴팔)",
      "색상": "블랙",
      "정가": "39,900",
      "구매가": "39,900",
      "구매일": "2023년 12월 16일",
      "보유": "Yes",
      "신발 사이즈": ""
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

  function getFallbackGuestSampleRows() {
    return FALLBACK_SAMPLE_ROWS.map((row) => ({ ...row }));
  }

  window.closetGuestSampleUtils = {
    getFallbackGuestSampleRows,
    getGuestSampleImageUrl,
    pickGuestSampleRows
  };
})();
