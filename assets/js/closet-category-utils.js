"use strict";

(function exposeClosetCategoryUtils() {
  const DEFAULT_CATEGORY_TREE = {
    상의: ["티셔츠 (긴팔)", "티셔츠 (반팔)", "셔츠 (긴팔)", "셔츠 (반팔)", "니트", "니트베스트", "가디건", "집업", "스웨트셔츠", "후디"],
    하의: ["슬랙스", "치노/퍼티그", "데님", "린넨/나일론", "스웨트/코듀로이", "반바지"],
    아우터: ["코트", "블레이저", "야상", "패딩", "바람막이/플리스", "재킷"],
    신발: ["스니커즈", "구두", "샌들", "부츠"],
    가방: ["백팩", "크로스백", "토트백"],
    악세사리: ["아이웨어", "모자", "벨트", "넥타이", "머플러/장갑", "시계/팔찌/반지", "지갑"]
  };

  const CHILD_CATEGORY_ORDER = {
    아우터: ["코트", "블레이저", "야상", "패딩", "바람막이/플리스", "재킷"]
  };

  const CATEGORY_ICONS = {
    상의: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/></svg>`,
    하의: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-8m0 8h5.5c.83 0 1.5-.67 1.5-1.5v-7M12 21H6.5c-.83 0-1.5-.67-1.5-1.5v-7M5 12.5V5a2 2 0 012-2h10a2 2 0 012 2v7.5"/></svg>`,
    아우터: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10V4h16v6M4 10l-2 4h3v6h14v-6h3l-2-4M4 10h16M12 4v16"/></svg>`,
    신발: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20M4 20V8a4 4 0 014-4h8a4 4 0 014 4v12M12 20v-8M8 12h8"/></svg>`,
    가방: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>`,
    악세사리: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>`
  };

  window.closetCategoryUtils = {
    DEFAULT_CATEGORY_TREE,
    CHILD_CATEGORY_ORDER,
    CATEGORY_ICONS
  };
})();
