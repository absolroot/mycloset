"use strict";

(function exposeClosetMeasurementUtils() {
  const MEASURE_FIELDS = [
    "총장",
    "어깨",
    "가슴",
    "소매",
    "허리",
    "허벅지",
    "밑위",
    "밑단",
    "폭",
    "높이",
    "다리길이",
    "둘레길이",
    "렌즈길이",
    "브릿지길이",
    "챙길이"
  ];

  const MEASUREMENT_DEFINITIONS = [
    { key: "total_length", label: "총장", unit: "cm" },
    { key: "shoulder", label: "어깨", unit: "cm" },
    { key: "chest", label: "가슴", unit: "cm" },
    { key: "sleeve", label: "소매", unit: "cm" },
    { key: "waist", label: "허리", unit: "cm" },
    { key: "thigh", label: "허벅지", unit: "cm" },
    { key: "rise", label: "밑위", unit: "cm" },
    { key: "hem", label: "밑단", unit: "cm" },
    { key: "width", label: "폭", unit: "cm" },
    { key: "height", label: "높이", unit: "cm" },
    { key: "temple_length", label: "다리길이", unit: "mm" },
    { key: "circumference", label: "둘레길이", unit: "cm" },
    { key: "lens_width", label: "렌즈길이", unit: "mm" },
    { key: "bridge_width", label: "브릿지길이", unit: "mm" },
    { key: "brim_length", label: "챙길이", unit: "cm" }
  ];

  const MEASUREMENT_BY_LABEL = new Map(MEASUREMENT_DEFINITIONS.map((definition) => [definition.label, definition]));
  const MEASUREMENT_BY_KEY = new Map(MEASUREMENT_DEFINITIONS.map((definition) => [definition.key, definition]));
  const MEASUREMENT_DB_ID_BY_KEY = new Map();

  const CATEGORY_MEASUREMENT_TEMPLATES = [
    { match: ["상의", "티셔츠", "셔츠", "니트", "가디건", "집업", "스웨트셔츠", "후디", "니트베스트"], fields: ["total_length", "shoulder", "chest", "sleeve"] },
    { match: ["아우터", "코트", "블레이저", "야상", "재킷", "바람막이", "플리스", "패딩"], fields: ["total_length", "shoulder", "chest", "sleeve"] },
    { match: ["하의", "슬랙스", "치노", "퍼티그", "데님", "린넨", "나일론", "스웨트/코듀로이", "반바지"], fields: ["total_length", "waist", "rise", "thigh", "hem"] },
    { match: ["신발", "스니커즈", "구두", "샌들", "부츠"], fields: ["height", "width"] },
    { match: ["아이웨어"], fields: ["lens_width", "bridge_width", "temple_length"] },
    { match: ["모자"], fields: ["circumference", "brim_length", "height"] },
    { match: ["가방", "백팩", "크로스백", "토트백"], fields: ["height", "width"] },
    { match: ["벨트"], fields: ["total_length", "width"] },
    { match: ["머플러", "장갑", "넥타이"], fields: ["total_length", "width"] },
    { match: ["악세사리", "시계", "팔찌", "반지", "지갑"], fields: ["width", "height"] }
  ];

  window.closetMeasurementUtils = {
    MEASURE_FIELDS,
    MEASUREMENT_DEFINITIONS,
    MEASUREMENT_BY_LABEL,
    MEASUREMENT_BY_KEY,
    MEASUREMENT_DB_ID_BY_KEY,
    CATEGORY_MEASUREMENT_TEMPLATES
  };
})();
