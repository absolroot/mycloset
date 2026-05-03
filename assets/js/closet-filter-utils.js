"use strict";

(function exposeClosetFilterUtils() {
  const PRICE_RANGE_OPTIONS = [
    { id: "none", label: "0원" },
    { id: "under-50000", label: "5만원 이하" },
    { id: "50000-100000", label: "5만원~10만원" },
    { id: "100000-300000", label: "10만원~30만원" },
    { id: "300000-500000", label: "30만원~50만원" },
    { id: "over-500000", label: "50만원 이상" }
  ];

  const OWNED_FILTER_OPTIONS = [
    { id: "owned", label: "보유" },
    { id: "archived", label: "정리" }
  ];

  const RATING_FILTER_OPTIONS = [
    { id: "5", label: "★★★★★" },
    { id: "4", label: "★★★★" },
    { id: "3", label: "★★★" },
    { id: "2", label: "★★" },
    { id: "1", label: "★" },
    { id: "unrated", label: "미평점" }
  ];

  const PARENT_CATEGORY_ORDER = ["아우터", "상의", "하의", "신발", "가방", "악세사리"];

  function sortParentCategoryOptions(values) {
    const order = new Map(PARENT_CATEGORY_ORDER.map((category, index) => [category, index]));
    return [...values].sort((a, b) => {
      const aIndex = order.has(a) ? order.get(a) : Number.POSITIVE_INFINITY;
      const bIndex = order.has(b) ? order.get(b) : Number.POSITIVE_INFINITY;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.localeCompare(b, "ko");
    });
  }

  function parentCategoryIndex(category) {
    const index = PARENT_CATEGORY_ORDER.indexOf(category);
    return index === -1 ? Number.POSITIVE_INFINITY : index;
  }

  function compareDefaultOrder(a, b, sortByUpdated) {
    const ownedDiff = Number(!a.owned) - Number(!b.owned);
    if (ownedDiff) return ownedDiff;

    const parentDiff = parentCategoryIndex(a.parentCategory) - parentCategoryIndex(b.parentCategory);
    if (parentDiff) return parentDiff;

    const parentNameDiff = (a.parentCategory || "").localeCompare(b.parentCategory || "", "ko");
    if (parentNameDiff) return parentNameDiff;

    const childDiff = (a.category || "").localeCompare(b.category || "", "ko");
    if (childDiff) return childDiff;

    const nameDiff = (a.name || "").localeCompare(b.name || "", "ko");
    if (nameDiff) return nameDiff;

    return sortByUpdated(a, b);
  }

  function normalizeFilterArray(value, cleanText) {
    if (!Array.isArray(value)) return [];
    return value.map(cleanText).filter((item) => item && item !== "all");
  }

  function applyFilterPatch(filters, nextPartialFilters, helpers) {
    const next = { ...nextPartialFilters };
    const updated = { ...filters };
    const { cleanText, normalizeColor, getChildCategoryOptions } = helpers;

    if ("query" in next) updated.query = cleanText(next.query);
    if ("sort" in next && next.sort) updated.sort = cleanText(next.sort);
    if ("parentCategory" in next) {
      updated.parentCategory = cleanText(next.parentCategory) || "all";
      if (updated.parentCategory === "all") updated.childCategory = "all";
    }
    if ("childCategory" in next) updated.childCategory = cleanText(next.childCategory) || "all";
    if ("brands" in next) updated.brands = normalizeFilterArray(next.brands, cleanText);
    if ("colors" in next) updated.colors = normalizeFilterArray(next.colors, cleanText).map(normalizeColor).filter(Boolean);
    if ("owned" in next) updated.owned = normalizeFilterArray(next.owned, cleanText).filter((value) => value === "owned" || value === "archived");
    if ("ratings" in next) updated.ratings = normalizeRatingFilters(next.ratings, cleanText);
    if ("minRating" in next) updated.ratings = minRatingToRatings(next.minRating, cleanText);
    if ("priceRanges" in next) {
      const validIds = new Set(PRICE_RANGE_OPTIONS.map((option) => option.id));
      updated.priceRanges = normalizeFilterArray(next.priceRanges, cleanText).filter((value) => validIds.has(value));
    }

    if (updated.parentCategory !== "all" && updated.childCategory !== "all") {
      const children = getChildCategoryOptions(updated.parentCategory);
      if (!children.includes(updated.childCategory)) updated.childCategory = "all";
    }

    return updated;
  }

  function resetFilters(filters) {
    return {
      ...filters,
      query: "",
      parentCategory: "all",
      childCategory: "all",
      brands: [],
      colors: [],
      owned: [],
      priceRanges: [],
      ratings: [],
      sort: "category"
    };
  }

  function getFilterSnapshot(context) {
    const {
      filters,
      items,
      visibleItems,
      parentCategories,
      childCategories,
      brands,
      colors,
      loading = false
    } = context;

    return {
      loading,
      filters: {
        query: filters.query,
        parentCategory: filters.parentCategory,
        childCategory: filters.childCategory,
        brands: [...filters.brands],
        colors: [...filters.colors],
        owned: [...filters.owned],
        priceRanges: [...filters.priceRanges],
        ratings: [...(filters.ratings || minRatingToRatings(filters.minRating, cleanText))],
        sort: filters.sort
      },
      counts: {
        total: items.length,
        visible: visibleItems.length,
        owned: items.filter((item) => item.owned).length,
        archived: items.filter((item) => !item.owned).length
      },
      options: {
        parentCategories,
        childCategories,
        brands,
        brandCounts: countByCleanValue(items.map((item) => item.brand)),
        colors,
        owned: OWNED_FILTER_OPTIONS,
        priceRanges: PRICE_RANGE_OPTIONS,
        rating: RATING_FILTER_OPTIONS
      },
      visibleCount: visibleItems.length
    };
  }

  function countByCleanValue(values) {
    return values.reduce((counts, value) => {
      const key = cleanText(value);
      if (key) counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function getVisibleItems(items, filters, helpers) {
    const { normalizeColor, compareDate, sortByUpdated } = helpers;
    const query = filters.query.toLowerCase();
    const visibleItems = items.filter((item) => {
      const haystack = [item.name, item.brand, item.color, item.category, item.parentCategory, item.sizeLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (filters.parentCategory !== "all" && item.parentCategory !== filters.parentCategory) return false;
      if (filters.childCategory !== "all" && item.category !== filters.childCategory) return false;
      if (filters.brands.length && !filters.brands.includes(item.brand)) return false;
      if (filters.colors.length && !filters.colors.includes(normalizeColor(item.color))) return false;
      if (filters.owned.length) {
        const status = item.owned ? "owned" : "archived";
        if (!filters.owned.includes(status)) return false;
      }
      if (filters.priceRanges.length && !filters.priceRanges.some((range) => priceMatchesRange(item.purchasePrice, range))) return false;
      if (!ratingMatchesFilter(item.rating, filters.ratings || minRatingToRatings(filters.minRating, cleanText))) return false;
      return true;
    });

    return visibleItems.sort((a, b) => {
      if (filters.sort === "category") return compareDefaultOrder(a, b, sortByUpdated);
      if (filters.sort === "purchaseDate") return compareDate(b.purchaseDate, a.purchaseDate);
      if (filters.sort === "priceDesc") return (b.purchasePrice || 0) - (a.purchasePrice || 0);
      if (filters.sort === "name") return (a.name || "").localeCompare(b.name || "", "ko");
      return sortByUpdated(a, b);
    });
  }

  function priceMatchesRange(price, range) {
    const hasPrice = price !== null && price !== undefined && String(price).trim() !== "";
    const value = Number(price);
    if (range === "none") return !hasPrice || !Number.isFinite(value);
    if (!hasPrice || !Number.isFinite(value) || value < 0) return false;
    if (range === "under-50000") return value <= 50000;
    if (range === "50000-100000") return value > 50000 && value <= 100000;
    if (range === "100000-300000") return value > 100000 && value <= 300000;
    if (range === "300000-500000") return value > 300000 && value <= 500000;
    if (range === "over-500000") return value > 500000;
    return false;
  }

  function normalizeRatingFilters(value, cleanText) {
    const validIds = new Set(RATING_FILTER_OPTIONS.map((option) => option.id));
    return normalizeFilterArray(value, cleanText).filter((item) => validIds.has(item));
  }

  function minRatingToRatings(value, cleanText) {
    const text = cleanText(value);
    if (!text || text === "all") return [];
    if (text === "unrated") return ["unrated"];
    const min = Number(text);
    if (!Number.isInteger(min) || min < 1 || min > 5) return [];
    return ["1", "2", "3", "4", "5"].filter((rating) => Number(rating) >= min);
  }

  function ratingMatchesFilter(rating, filters) {
    if (!filters.length) return true;
    const value = Number(rating);
    const hasRating = Number.isInteger(value) && value >= 1 && value <= 5;
    if (!hasRating) return filters.includes("unrated");
    return filters.includes(String(value));
  }

  window.closetFilterUtils = {
    PRICE_RANGE_OPTIONS,
    RATING_FILTER_OPTIONS,
    getFilterSnapshot,
    getVisibleItems,
    applyFilterPatch,
    resetFilters,
    sortParentCategoryOptions
  };
})();
