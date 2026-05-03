"use strict";

(function exposeClosetFormatUtils() {
  const COLOR_MAP = {
    블랙: "#202124",
    화이트: "#ffffff",
    브라운: "#795548",
    베이지: "#d8c4a3",
    네이비: "#243b64",
    블루: "#1a73e8",
    "블루/네이비": "linear-gradient(135deg, #1a73e8 0 50%, #243b64 50% 100%)",
    "그레이/실버": "#c4c7c5",
    그린: "#188038",
    올리브: "#7d8460",
    "올리브/그린": "linear-gradient(135deg, #7d8460 0 50%, #188038 50% 100%)",
    카키: "#7d8460",
    레드: "#c5221f",
    와인: "#7b1f32",
    버건디: "#7b1f32",
    퍼플: "#6f42c1",
    "와인/퍼플": "linear-gradient(135deg, #7b1f32 0 50%, #6f42c1 50% 100%)",
    핑크: "#f4a6b8",
    옐로우: "#fbbc04",
    오렌지: "#f29900",
    골드: "#c6a15b"
  };

  const DEFAULT_COLOR_OPTIONS = [
    "블랙",
    "화이트",
    "그레이/실버",
    "네이비",
    "블루/네이비",
    "브라운",
    "베이지",
    "카키",
    "올리브/그린",
    "레드",
    "와인/퍼플",
    "핑크",
    "옐로우",
    "오렌지",
    "골드"
  ];

  function cleanText(value) {
    return String(value ?? "").trim();
  }

  function normalizeColor(value) {
    const first = cleanText(value).split(/[,，]/)[0]?.trim() || "";
    if (!first) return "";
    if (first === "그레이" || first === "실버") return "그레이/실버";
    return first;
  }

  function normalizeItemColor(item) {
    if (!item) return item;
    const color = normalizeColor(item.color);
    return color === (item.color || "") ? item : { ...item, color };
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function cleanNotionLabel(value) {
    return cleanText(value).replace(/\s*\(https?:\/\/[^)]+\)\s*$/i, "").trim();
  }

  function parsePrice(value) {
    const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
    if (!cleaned) return null;
    const number = Number(cleaned);
    return Number.isFinite(number) ? Math.round(number) : null;
  }

  function parseNumber(value) {
    const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
    if (!cleaned) return null;
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }

  function parseKoreanDate(value) {
    const text = cleanText(value);
    const match = text.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!match) return "";
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  function compareDate(a, b) {
    return new Date(a || 0).getTime() - new Date(b || 0).getTime();
  }

  function sortByUpdated(a, b) {
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  }

  function uniqueValues(values) {
    return [...new Set(values.map(cleanText).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
  }

  function sortColorOptions(values) {
    const order = new Map(DEFAULT_COLOR_OPTIONS.map((color, index) => [color, index]));
    return [...new Set(values.map(normalizeColor).filter(Boolean))].sort((a, b) => {
      const aIndex = order.has(a) ? order.get(a) : Number.POSITIVE_INFINITY;
      const bIndex = order.has(b) ? order.get(b) : Number.POSITIVE_INFINITY;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.localeCompare(b, "ko");
    });
  }

  function groupBy(rows, key) {
    const map = new Map();
    rows.forEach((row) => {
      const value = row[key];
      if (!map.has(value)) map.set(value, []);
      map.get(value).push(row);
    });
    return map;
  }

  function colorToHex(color) {
    const raw = cleanText(color);
    const rawDirect = COLOR_MAP[raw];
    if (rawDirect) return rawDirect;

    const value = normalizeColor(raw);
    const direct = COLOR_MAP[value];
    if (direct) return direct;

    const found = Object.keys(COLOR_MAP).find((key) => value.includes(key));
    return found ? COLOR_MAP[found] : "#c4c7c5";
  }

  function formatWon(value) {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("ko-KR").format(value || 0);
  }

  function hashString(input) {
    let hash = 5381;
    for (let index = 0; index < input.length; index += 1) {
      hash = (hash * 33) ^ input.charCodeAt(index);
    }
    return (hash >>> 0).toString(36);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  window.closetFormatUtils = {
    COLOR_MAP,
    DEFAULT_COLOR_OPTIONS,
    cleanText,
    normalizeColor,
    normalizeItemColor,
    clampNumber,
    cleanNotionLabel,
    parsePrice,
    parseNumber,
    parseKoreanDate,
    compareDate,
    sortByUpdated,
    uniqueValues,
    sortColorOptions,
    groupBy,
    colorToHex,
    formatWon,
    formatNumber,
    hashString,
    escapeHtml,
    escapeAttr
  };
})();
