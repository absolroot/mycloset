"use strict";

const DEFAULT_CSV_FILE = "Closet 137abb41507c80699008e26e88fa26d9_all (2).csv";
const DB_NAME = "closet-pwa";
const DB_VERSION = 1;
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

const DEFAULT_CATEGORY_TREE = {
  상의: ["티셔츠 (긴팔)", "티셔츠 (반팔)", "셔츠 (긴팔)", "셔츠 (반팔)", "니트", "니트베스트", "가디건", "집업", "스웨트셔츠", "후디"],
  하의: ["슬랙스", "치노/퍼티그", "데님", "린넨/나일론", "스웨트/코듀로이", "반바지"],
  아우터: ["코트", "블레이저", "야상", "재킷", "바람막이/플리스", "패딩"],
  신발: ["스니커즈", "구두", "샌들", "부츠"],
  가방: ["백팩", "크로스백", "토트백"],
  악세사리: ["아이웨어", "모자", "벨트", "넥타이", "머플러/장갑", "시계/팔찌/반지", "지갑"]
};

const CATEGORY_ICONS = {
  상의: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/></svg>`,
  하의: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-8m0 8h5.5c.83 0 1.5-.67 1.5-1.5v-7M12 21H6.5c-.83 0-1.5-.67-1.5-1.5v-7M5 12.5V5a2 2 0 012-2h10a2 2 0 012 2v7.5"/></svg>`,
  아우터: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10V4h16v6M4 10l-2 4h3v6h14v-6h3l-2-4M4 10h16M12 4v16"/></svg>`,
  신발: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20M4 20V8a4 4 0 014-4h8a4 4 0 014 4v12M12 20v-8M8 12h8"/></svg>`,
  가방: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>`,
  악세사리: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>`,
};

const COLOR_MAP = {
  블랙: "#202124",
  화이트: "#ffffff",
  브라운: "#795548",
  베이지: "#d8c4a3",
  네이비: "#243b64",
  블루: "#1a73e8",
  "그레이/실버": "#c4c7c5",
  그린: "#188038",
  카키: "#7d8460",
  레드: "#c5221f",
  와인: "#7b1f32",
  핑크: "#f4a6b8",
  옐로우: "#fbbc04",
  오렌지: "#f29900",
  골드: "#c6a15b"
};

const DEFAULT_COLOR_OPTIONS = Object.keys(COLOR_MAP);

const state = {
  db: null,
  items: [],
  colorOptions: [],
  filters: {
    query: "",
    category: "all",
    brand: "all",
    color: "all",
    owned: "all",
    sort: "updated"
  },
  selectedId: null,
  view: "grid",
  imageUrls: new Map(),
  supabase: null,
  session: null,
  supabaseReady: false,
  syncing: false,
  pendingItemIds: new Set(),
  pendingDeleteIds: new Set(),
  pendingImageDeletes: new Map(),
  syncTimer: null,
  lastSyncError: null,
  lastSyncedAt: null,
  authPrompted: false
};

const refs = {};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

async function init() {
  cacheRefs();
  exposeReactBridge();
  bindEvents();
  await registerServiceWorker();

  state.db = await openDatabase();

  const shared = await maybeRenderSharedView();
  if (shared) return;

  await initSupabase();

  if (shouldRequireAuth()) {
    state.items = [];
    state.selectedId = null;
    render();
    showAuthDialog({ once: true });
    return;
  }

  await loadLocalItems();

  if (state.session) {
    await pullFromSupabase({ silent: true });
  }

  if (!state.items.length) {
    await importDefaultCsv();
  }

  if (state.session && state.items.length) {
    await syncNow({ silent: true });
  }

  render();
}

function cacheRefs() {
  refs.appShell = document.querySelector("#appShell");
  refs.shareView = document.querySelector("#shareView");
  refs.shareTitle = document.querySelector("#shareTitle");
  refs.shareItems = document.querySelector("#shareItems");
  refs.searchInput = document.querySelector("#searchInput");
  refs.categoryFilter = document.querySelector("#categoryFilter");
  refs.brandFilter = document.querySelector("#brandFilter");
  refs.colorFilter = document.querySelector("#colorFilter");
  refs.sortFilter = document.querySelector("#sortFilter");
  refs.summaryRow = document.querySelector("#summaryRow");
  refs.resultTitle = document.querySelector("#resultTitle");
  refs.resultCount = document.querySelector("#resultCount");
  refs.itemList = document.querySelector("#itemList");
  refs.emptyState = document.querySelector("#emptyState");
  refs.detailPanel = document.querySelector("#detailPanel");
  refs.csvFileInput = document.querySelector("#csvFileInput");
  refs.syncButton = document.querySelector("#syncButton");
  refs.authDialog = document.querySelector("#authDialog");
  refs.authForm = document.querySelector("#authForm");
  refs.authEmail = document.querySelector("#authEmail");
  refs.toast = document.querySelector("#toast");
}

function exposeReactBridge() {
	window.closetBridge = {
	  addImageFromUrl: addImageFromUrlValue,
	  closeDetail,
	  deleteSelectedItem,
	  getAutocompleteOptions,
	  getChildCategoryOptions,
	  getColorOptions,
    getImageUrl,
    getMeasurementFieldsForItem,
    getParentCategoryOptions,
    isShoeCategory,
    removeSelectedImage,
    saveImageEdit: saveImageEditFromOptions,
    saveSelectedItem: saveSelectedItemFromData,
    shareSelectedItem,
    uploadImageFile: uploadSelectedImageFile
  };
}

function bindEvents() {
  refs.searchInput.addEventListener("input", () => {
    state.filters.query = refs.searchInput.value.trim();
    render();
  });

  refs.categoryFilter.addEventListener("change", () => {
    state.filters.category = refs.categoryFilter.value;
    render();
  });

  refs.brandFilter.addEventListener("change", () => {
    state.filters.brand = refs.brandFilter.value;
    render();
  });

  refs.colorFilter.addEventListener("change", () => {
    state.filters.color = refs.colorFilter.value;
    render();
  });

  refs.sortFilter.addEventListener("change", () => {
    state.filters.sort = refs.sortFilter.value;
    render();
  });

  refs.csvFileInput.addEventListener("change", handleCsvFile);
  refs.syncButton.addEventListener("click", handleSyncButton);

  refs.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await requestMagicLink(refs.authEmail.value.trim());
  });

  document.addEventListener("change", handleDocumentChange);
  document.addEventListener("input", handleDocumentInput);
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("submit", handleDocumentSubmit);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !refs.detailPanel.hidden && !refs.detailPanel.classList.contains("detail-panel-bridge")) closeDetail();
  });
}

function handleDocumentInput(event) {
  if (!event.target.closest("[data-image-edit]")) return;
  updateImagePreviewTransform();
}

function handleDocumentChange(event) {
  const select = event.target.closest("[data-category-select]");
  if (!select) return;

  syncCategoryCustomInput(select);

  if (select.dataset.categorySelect === "parent") {
    refreshChildCategorySelect(select.form, { resetInvalid: true });
  }

  refreshShoeSizeVisibility(select.form);
  refreshMeasurementGridFromForm(select.form);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  if (["localhost", "127.0.0.1", ""].includes(window.location.hostname)) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.warn("Service worker registration failed", error);
  }
}

function handleDocumentClick(event) {
  if (event.target === refs.detailPanel) {
    closeDetail();
    return;
  }

  const ownedButton = event.target.closest("[data-owned]");
  if (ownedButton) {
    state.filters.owned = ownedButton.dataset.owned;
    document.querySelectorAll("[data-owned]").forEach((button) => {
      button.classList.toggle("active", button.dataset.owned === state.filters.owned);
    });
    render();
    return;
  }

  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    state.view = viewButton.dataset.view;
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === state.view);
    });
    renderItemList();
    return;
  }

  const categoryBtn = event.target.closest('.category-grid-btn');
  if (categoryBtn) {
    const value = categoryBtn.dataset.categoryValue;
    const container = categoryBtn.closest('.category-field');
    const input = container.querySelector('input[type="hidden"]');
    input.value = value;
    container.querySelectorAll('.category-grid-btn').forEach(btn => btn.classList.remove('active'));
    categoryBtn.classList.add('active');
    
    const customInput = container.querySelector('.category-custom-input');
    if (customInput) {
      customInput.hidden = (value !== '__custom__');
      if (!customInput.hidden) customInput.focus();
    }
    
    const form = categoryBtn.closest('form');
    refreshChildCategorySelect(form, { resetInvalid: true });
    refreshShoeSizeVisibility(form);
    refreshMeasurementGridFromForm(form);
    return;
  }

  const action = event.target.closest("[data-action]");
  if (!action) return;

  const id = action.dataset.id;
  switch (action.dataset.action) {
    case "select-item":
      selectItem(id);
      break;
    case "new-item":
      createNewItem();
      break;
    case "close-detail":
      closeDetail();
      break;
    case "delete-item":
      deleteSelectedItem();
      break;
    case "import-csv":
      refs.csvFileInput.click();
      break;
    case "export-csv":
      exportCsv();
      break;
    case "export-json":
      exportJson();
      break;
    case "upload-image":
      document.querySelector("#imageInput")?.click();
      break;
    case "toggle-image-url":
      const urlSec = document.getElementById("imageUrlSection");
      if (urlSec) {
        urlSec.hidden = !urlSec.hidden;
        if (!urlSec.hidden) document.getElementById("imageUrlInput")?.focus();
      }
      break;
    case "toggle-image-edit":
      const editSec = document.getElementById("imageEditSection");
      if (editSec) editSec.hidden = !editSec.hidden;
      break;
    case "add-image-url":
      addImageFromUrl();
      break;
    case "save-image-edit":
      saveImageEdit();
      break;
    case "reset-image-edit":
      resetImageEditor();
      break;
    case "remove-image":
      removeSelectedImage();
      break;
    case "add-measure":
      addCustomMeasureField();
      break;
    case "share-item":
      shareSelectedItem();
      break;
    default:
      break;
  }
}

async function handleDocumentSubmit(event) {
  const form = event.target.closest("#itemForm");
  if (!form) return;

  event.preventDefault();
  await saveSelectedItemFromForm(form);
}

async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("items")) {
        db.createObjectStore("items", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("images")) {
        const imageStore = db.createObjectStore("images", { keyPath: "id" });
        imageStore.createIndex("itemId", "itemId", { unique: false });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbAll(storeName) {
  return new Promise((resolve, reject) => {
    const request = state.db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function dbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = state.db.transaction(storeName, "readonly").objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbPut(storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

function dbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadLocalItems() {
  const items = await dbAll("items");
  const normalizedItems = [];
  const normalizedIds = [];

  for (const item of items) {
    const normalized = normalizeItemColor(item);
    if (normalized !== item) {
      await dbPut("items", normalized);
      normalizedIds.push(normalized.id);
    }
    normalizedItems.push(normalized);
  }

  state.items = normalizedItems.sort(sortByUpdated);
  if (normalizedIds.length) queueAutoSyncItems(normalizedIds);
}

async function importDefaultCsv() {
  try {
    const response = await fetch(`./${encodeURIComponent(DEFAULT_CSV_FILE)}`);
    if (!response.ok) throw new Error(`CSV fetch failed: ${response.status}`);
    const text = await response.text();
    const items = csvToItems(text);
    await upsertItems(items);
    await loadLocalItems();
    showToast(`${items.length}개 제품을 CSV에서 가져왔습니다.`);
  } catch (error) {
    console.warn(error);
    showToast("CSV 자동 가져오기에 실패했습니다. 파일 선택으로 가져올 수 있습니다.");
  }
}

async function handleCsvFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const items = csvToItems(text);
    await upsertItems(items);
    await loadLocalItems();
    render();
    queueAutoSyncItems(items.map((item) => item.id));
    showToast(`${items.length}개 제품을 가져왔습니다.`);
  } catch (error) {
    console.error(error);
    showToast("CSV를 읽지 못했습니다.");
  } finally {
    event.target.value = "";
  }
}

function csvToItems(text) {
  const rows = parseCsv(text);
  return rows.map((row, index) => csvRowToItem(row, index));
}

async function upsertItems(items) {
  for (const item of items) {
    const existing = await dbGet("items", item.id);
    await dbPut("items", {
      ...existing,
      ...item,
      imageIds: existing?.imageIds || [],
      primaryImageId: existing?.primaryImageId || null,
      remoteImages: existing?.remoteImages || [],
      externalImageUrl: existing?.externalImageUrl || item.externalImageUrl || "",
      externalImageEdit: existing?.externalImageEdit || item.externalImageEdit || defaultImageEdit(),
      productUrl: existing?.productUrl || item.productUrl || "",
      memo: existing?.memo || item.memo || "",
      createdAt: existing?.createdAt || item.createdAt,
      updatedAt: existing?.updatedAt || item.updatedAt
    });
  }
}

function csvRowToItem(row, index) {
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
    measurements,
    imageIds: [],
    primaryImageId: null,
    remoteImages: [],
    externalImageUrl: "",
    externalImageEdit: defaultImageEdit(),
    source: "csv",
    sourceIndex: index,
    raw: row,
    createdAt: now,
    updatedAt: now
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  const headers = rows.shift()?.map((header) => header.trim()) || [];
  return rows.map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] || "";
    });
    return record;
  });
}

function render() {
  syncFilterControls();
  renderFilterOptions();
  renderSummary();
  renderItemList();
  renderDetail();
  updateSyncButton();
}

function syncFilterControls() {
  refs.searchInput.value = state.filters.query;
  refs.sortFilter.value = state.filters.sort;
  document.querySelectorAll("[data-owned]").forEach((button) => {
    button.classList.toggle("active", button.dataset.owned === state.filters.owned);
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
}

function renderFilterOptions() {
  fillSelect(refs.categoryFilter, uniqueValues(state.items.map((item) => item.parentCategory)), "전체 카테고리", state.filters.category);
  fillSelect(refs.brandFilter, uniqueValues(state.items.map((item) => item.brand)), "전체 브랜드", state.filters.brand);
  fillSelect(refs.colorFilter, getFilterColorOptions(), "전체 색상", normalizeColor(state.filters.color));
}

function fillSelect(select, values, allLabel, selected) {
  const options = [`<option value="all">${escapeHtml(allLabel)}</option>`]
    .concat(values.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`));
  select.innerHTML = options.join("");
  select.value = values.includes(selected) ? selected : "all";
  if (select.value !== selected) {
    if (select === refs.categoryFilter) state.filters.category = select.value;
    if (select === refs.brandFilter) state.filters.brand = select.value;
    if (select === refs.colorFilter) state.filters.color = select.value;
  }
}

function renderSummary() {
  const owned = state.items.filter((item) => item.owned);
  const purchaseTotal = owned.reduce((sum, item) => sum + (item.purchasePrice || 0), 0);
  const retailTotal = owned.reduce((sum, item) => sum + (item.retailPrice || 0), 0);
  const saved = Math.max(0, retailTotal - purchaseTotal);
  const categories = uniqueValues(owned.map((item) => item.parentCategory)).length;

  const cards = [
    ["총 제품", `${state.items.length}개`],
    ["보유 중", `${owned.length}개`],
    ["구매 총액", formatWon(purchaseTotal)],
    ["정가 대비 절감", saved ? formatWon(saved) : "-"]
  ];

  if (categories) cards[0][0] = `${categories}개 카테고리`;

  refs.summaryRow.innerHTML = cards
    .map(([label, value]) => `<div class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
}

function renderItemList() {
  const items = getVisibleItems();
  refs.resultTitle.textContent = state.filters.category === "all" ? "제품" : state.filters.category;
  refs.resultCount.textContent = `${items.length}개`;
  refs.itemList.className = state.view === "list" ? "item-grid list" : "item-grid";
  refs.emptyState.hidden = items.length > 0;

  refs.itemList.innerHTML = items.map(renderItemCard).join("");
  hydrateImages();
}

function renderItemCard(item) {
  const primaryImage = getPrimaryImage(item);
  const active = item.id === state.selectedId ? " active" : "";
  const colorStyle = `--dot:${colorToHex(item.color)}`;
  const price = item.purchasePrice ? formatWon(item.purchasePrice) : "가격 없음";
  const title = item.name || "이름 없는 제품";
  const meta = [item.brand, item.sizeLabel, item.category].filter(Boolean).join(" · ");

  return `
    <button class="item-tile${active}" data-action="select-item" data-id="${escapeAttr(item.id)}" type="button">
      ${renderImageSlot(item, primaryImage)}
      <div class="item-title">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(meta || "정보 없음")}</p>
        <div class="chip-row">
          ${item.color ? `<span class="chip"><span class="color-dot" style="${escapeAttr(colorStyle)}"></span>${escapeHtml(item.color)}</span>` : ""}
          ${item.parentCategory ? `<span class="chip">${escapeHtml(item.parentCategory)}</span>` : ""}
        </div>
      </div>
      <div class="price-line">${escapeHtml(price)}</div>
    </button>
  `;
}

function renderImageSlot(item, primaryImage) {
  if (primaryImage.remoteUrl) {
    return `<div class="image-slot" style="background-image:url('${escapeAttr(primaryImage.remoteUrl)}')"></div>`;
  }

  if (primaryImage.localId) {
    return `<div class="image-slot" data-image-id="${escapeAttr(primaryImage.localId)}"></div>`;
  }

  return `<div class="image-slot placeholder">${escapeHtml(getInitial(item))}</div>`;
}

function renderDetailImage(primaryImage) {
  const editStyle = imageEditStyle(primaryImage.edit || defaultImageEdit());

  if (primaryImage.remoteUrl) {
    return `<img class="detail-cover-img" data-edit-preview src="${escapeAttr(primaryImage.remoteUrl)}" style="${escapeAttr(editStyle)}" alt="">`;
  }

  if (primaryImage.localId) {
    return `<img class="detail-cover-img" data-edit-preview data-image-id="${escapeAttr(primaryImage.localId)}" style="${escapeAttr(editStyle)}" alt="">`;
  }

  return "";
}

function imageEditorHtml(options = {}) {
  const edit = normalizeImageEdit(options);
  return `
    <div class="image-editor">
      <label>
        <span>크기</span>
        <input data-image-edit="scale" type="range" min="0.5" max="2.5" step="0.01" value="${escapeAttr(edit.scale)}">
      </label>
      <label>
        <span>가로 위치</span>
        <input data-image-edit="offsetX" type="range" min="-50" max="50" step="1" value="${escapeAttr(edit.offsetX)}">
      </label>
      <label>
        <span>세로 위치</span>
        <input data-image-edit="offsetY" type="range" min="-50" max="50" step="1" value="${escapeAttr(edit.offsetY)}">
      </label>
      <div class="image-editor-actions">
        <button class="button secondary compact" data-action="reset-image-edit" type="button">초기화</button>
        <button class="button primary compact" data-action="save-image-edit" type="button">편집 저장</button>
      </div>
    </div>
  `;
}

function defaultImageEdit() {
  return { scale: 1, offsetX: 0, offsetY: 0 };
}

function normalizeImageEdit(options = {}) {
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

function renderDetail() {
  const item = getSelectedItem();
  if (!item) {
    refs.detailPanel.classList.remove("open");
    refs.detailPanel.hidden = true;
    document.body.classList.remove("modal-open");
    emitDetailChange(null);
    return;
  }

  refs.detailPanel.hidden = false;
  refs.detailPanel.classList.add("open");
  document.body.classList.add("modal-open");
  emitDetailChange(buildDetailPayload(item));
}

function buildDetailPayload(item) {
  return {
    item: clonePlainItem(item),
    primaryImage: getPrimaryImage(item),
	    parentCategoryOptions: getParentCategoryOptions(),
	    childCategoryOptions: getChildCategoryOptions(item.parentCategory),
	    colorOptions: getColorOptions(),
	    autocompleteOptions: getAutocompleteOptions(),
	    measurementFields: getMeasurementFieldsForItem(item),
	    initial: getInitial(item)
	  };
	}

function emitDetailChange(payload) {
  window.dispatchEvent(new CustomEvent("closet:detail-change", { detail: payload }));
}

function clonePlainItem(item) {
  return JSON.parse(JSON.stringify(item));
}

function fieldHtml(label, name, value, className = "", type = "text", inputMode = "", required = false) {
  const reqMark = required ? `<span class="required-mark">*</span>` : "";
  return `
    <label class="field ${escapeAttr(className)}">
      <span>${escapeHtml(label)}${reqMark}</span>
      <input name="${escapeAttr(name)}" type="${escapeAttr(type)}" value="${escapeAttr(value || "")}" ${inputMode ? `inputmode="${escapeAttr(inputMode)}"` : ""} ${required ? "required" : ""}>
    </label>
  `;
}

function parentCategoryGridHtml(label, name, value, options) {
  const selectedValue = cleanText(value);
  const coreCategories = ["상의", "하의", "아우터", "신발", "가방", "악세사리"];
  
  const extraCategories = options.filter(opt => opt && !coreCategories.includes(opt));
  const allCategories = [...coreCategories, ...extraCategories];

  const isCustom = selectedValue && !allCategories.includes(selectedValue);

  const gridHtml = allCategories.map(cat => {
    const icon = CATEGORY_ICONS[cat] || CATEGORY_ICONS["악세사리"];
    const active = selectedValue === cat ? "active" : "";
    return `
      <button class="category-grid-btn ${active}" data-category-value="${escapeAttr(cat)}" type="button">
        <div class="icon">${icon}</div>
        <span class="label">${escapeHtml(cat)}</span>
      </button>
    `;
  }).join("");

  const customActive = isCustom ? "active" : "";
  const customIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  
  const customBtn = `
    <button class="category-grid-btn ${customActive}" data-category-value="__custom__" type="button">
      <div class="icon">${customIcon}</div>
      <span class="label">직접 입력</span>
    </button>
  `;

  return `
    <div class="field category-field wide" data-category-field="parent">
      <span>${escapeHtml(label)}<span class="required-mark">*</span></span>
      <input type="hidden" name="${escapeAttr(name)}" value="${escapeAttr(isCustom ? "__custom__" : selectedValue)}">
      <div class="category-grid">
        ${gridHtml}
        ${customBtn}
      </div>
      <input class="category-custom-input" name="${escapeAttr(name)}Custom" value="${escapeAttr(isCustom ? selectedValue : "")}" placeholder="새 상위 카테고리 이름" ${isCustom ? "" : "hidden"}>
    </div>
  `;
}

function categorySelectHtml(label, name, value, options, mode) {
  const selectedValue = cleanText(value);
  const hasSelected = options.includes(selectedValue);
  const useCustom = selectedValue && !hasSelected;
  const selectValue = useCustom ? "__custom__" : selectedValue;

  return `
    <label class="field category-field wide" data-category-field="${escapeAttr(mode)}">
      <span>${escapeHtml(label)}</span>
      <select name="${escapeAttr(name)}" data-category-select="${escapeAttr(mode)}">
        <option value="">선택 안 함</option>
        ${options.map((option) => `<option value="${escapeAttr(option)}" ${option === selectValue ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
        <option value="__custom__" ${useCustom ? "selected" : ""}>+ 새 카테고리 추가</option>
      </select>
      <input class="category-custom-input" name="${escapeAttr(name)}Custom" value="${escapeAttr(useCustom ? selectedValue : "")}" placeholder="새 카테고리 이름" ${useCustom ? "" : "hidden"}>
    </label>
  `;
}

function textareaHtml(label, name, value, className = "") {
  return `
    <label class="field ${escapeAttr(className)}">
      <span>${escapeHtml(label)}</span>
      <textarea name="${escapeAttr(name)}">${escapeHtml(value || "")}</textarea>
    </label>
  `;
}

function measureFieldHtml(field, value) {
  const key = field.key || "";
  const label = field.label || "";
  const custom = field.custom ? "true" : "false";
  const labelInput = field.custom
    ? `<input class="measure-label-input" data-measure-label="${escapeAttr(label)}" value="${escapeAttr(label)}" placeholder="실측명">`
    : `<span>${escapeHtml(label)}</span>`;

  return `
    <label data-measure-row>
      ${labelInput}
      <input data-measure="${escapeAttr(label)}" data-measure-key="${escapeAttr(key)}" data-measure-custom="${custom}" inputmode="decimal" value="${escapeAttr(value ?? "")}" placeholder="${escapeAttr(field.unit || "cm")}">
    </label>
  `;
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

function addCustomMeasureField() {
  const grid = refs.detailPanel.querySelector(".measure-grid");
  if (!grid) return;

  const label = uniqueCustomMeasurementLabel(grid);
  grid.insertAdjacentHTML("beforeend", measureFieldHtml({ label, custom: true, unit: "cm" }, ""));
  const added = grid.querySelector(`[data-measure-label="${CSS.escape(label)}"]`);
  added?.focus();
}

function uniqueCustomMeasurementLabel(grid) {
  const existing = new Set(Array.from(grid.querySelectorAll("[data-measure]")).map((input) => input.dataset.measure));
  let index = 1;
  let label = "추가 실측";
  while (existing.has(label)) {
    index += 1;
    label = `추가 실측 ${index}`;
  }
  return label;
}

function getParentCategoryOptions() {
  return uniqueValues([
    ...Object.keys(DEFAULT_CATEGORY_TREE),
    ...state.items.map((item) => item.parentCategory)
  ]);
}

function getChildCategoryOptions(parentCategory) {
  const parent = cleanText(parentCategory);
  const defaults = DEFAULT_CATEGORY_TREE[parent] || [];
  const fromItems = state.items
    .filter((item) => !parent || item.parentCategory === parent)
    .map((item) => item.category);
  return uniqueValues([...defaults, ...fromItems]);
}

	function getColorOptions() {
	  return getFilterColorOptions();
	}

	function getAutocompleteOptions(field) {
	  const options = {
	    brand: uniqueValues(state.items.map((item) => item.brand)),
	    sizeLabel: uniqueValues(state.items.map((item) => item.sizeLabel)),
	    shoeSize: uniqueValues(state.items.map((item) => item.shoeSize))
	  };

	  return field ? options[field] || [] : options;
	}
	
	function getFilterColorOptions() {
  return uniqueValues([
    ...DEFAULT_COLOR_OPTIONS,
    ...state.colorOptions,
    ...state.items.map((item) => item.color)
  ].map(normalizeColor));
}

function rememberColorOption(color) {
  const value = normalizeColor(color);
  if (!value || DEFAULT_COLOR_OPTIONS.includes(value) || state.colorOptions.includes(value)) return;
  state.colorOptions = uniqueValues([...state.colorOptions, value]);
}

function readCategoryValue(form, name) {
  const selected = cleanText(new FormData(form).get(name));
  if (selected !== "__custom__") return selected;
  return cleanText(new FormData(form).get(`${name}Custom`));
}

function syncCategoryCustomInput(select) {
  const field = select.closest("[data-category-field]");
  const input = field?.querySelector(".category-custom-input");
  if (!input) return;

  const isCustom = select.value === "__custom__";
  input.hidden = !isCustom;
  if (isCustom) input.focus();
  else input.value = "";
}

function refreshChildCategorySelect(form, opts = {}) {
  const childSelect = form?.querySelector('[data-category-select="child"]');
  if (!childSelect) return;

  const previous = readCategoryValue(form, "category");
  const parent = readCategoryValue(form, "parentCategory");
  const categoryOptions = getChildCategoryOptions(parent);
  const keepPrevious = previous && categoryOptions.includes(previous);
  const useCustom = previous && !opts.resetInvalid && !keepPrevious;
  const nextValue = keepPrevious ? previous : "";

  childSelect.innerHTML = `
    <option value="">선택 안 함</option>
    ${categoryOptions.map((option) => `<option value="${escapeAttr(option)}">${escapeHtml(option)}</option>`).join("")}
    <option value="__custom__">+ 새 카테고리 추가</option>
  `;
  childSelect.value = useCustom ? "__custom__" : nextValue;

  const customInput = form.querySelector('[name="categoryCustom"]');
  if (customInput) {
    customInput.hidden = !useCustom;
    customInput.value = useCustom ? previous : "";
  }
}

function refreshShoeSizeVisibility(form) {
  const field = form?.querySelector(".shoe-size-field");
  if (!field) return;

  const parentCategory = readCategoryValue(form, "parentCategory");
  const category = readCategoryValue(form, "category");
  const visible = isShoeCategory({ parentCategory, category });
  field.classList.toggle("is-hidden", !visible);
  const input = field.querySelector("[name='shoeSize']");
  if (input && !visible) input.value = "";
}

function refreshMeasurementGridFromForm(form) {
  const grid = form?.querySelector(".measure-grid");
  if (!grid) return;

  const measurements = collectMeasurementsFromForm(form);
  const item = {
    parentCategory: readCategoryValue(form, "parentCategory"),
    category: readCategoryValue(form, "category"),
    measurements
  };
  grid.innerHTML = getMeasurementFieldsForItem(item)
    .map((field) => measureFieldHtml(field, measurements[field.label]))
    .join("");
}

function collectMeasurementsFromForm(form) {
  const measurements = {};
  form.querySelectorAll("[data-measure]").forEach((input) => {
    const value = parseNumber(input.value);
    if (value === null) return;

    const row = input.closest("[data-measure-row]");
    const labelInput = row?.querySelector("[data-measure-label]");
    const label = cleanText(labelInput?.value || input.dataset.measure);
    if (label) measurements[label] = value;
  });
  return measurements;
}

function isShoeCategory(item) {
  const text = [item.parentCategory, item.category].filter(Boolean).join(" ");
  return /신발|스니커즈|구두|샌들|부츠/.test(text);
}

function getVisibleItems() {
  const query = state.filters.query.toLowerCase();
  const items = state.items.filter((item) => {
    const haystack = [item.name, item.brand, item.color, item.category, item.parentCategory, item.sizeLabel]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (query && !haystack.includes(query)) return false;
    if (state.filters.category !== "all" && item.parentCategory !== state.filters.category) return false;
    if (state.filters.brand !== "all" && item.brand !== state.filters.brand) return false;
    if (state.filters.color !== "all" && item.color !== state.filters.color) return false;
    if (state.filters.owned === "owned" && !item.owned) return false;
    if (state.filters.owned === "archived" && item.owned) return false;
    return true;
  });

  return items.sort((a, b) => {
    if (state.filters.sort === "purchaseDate") return compareDate(b.purchaseDate, a.purchaseDate);
    if (state.filters.sort === "priceDesc") return (b.purchasePrice || 0) - (a.purchasePrice || 0);
    if (state.filters.sort === "name") return (a.name || "").localeCompare(b.name || "", "ko");
    return sortByUpdated(a, b);
  });
}

function selectItem(id) {
  state.selectedId = id;
  renderItemList();
  renderDetail();
}

function closeDetail() {
  state.selectedId = null;
  renderItemList();
  renderDetail();
}

async function createNewItem() {
  const now = new Date().toISOString();
  const item = {
    id: `item-${crypto.randomUUID()}`,
    name: "새 제품",
    productUrl: "",
    memo: "",
    parentCategory: "",
    category: "",
    brand: "",
    color: "",
    sizeLabel: "",
    shoeSize: "",
    retailPrice: null,
    purchasePrice: null,
    purchaseDate: "",
    owned: true,
    measurements: {},
    imageIds: [],
    primaryImageId: null,
    remoteImages: [],
    externalImageUrl: "",
    externalImageEdit: defaultImageEdit(),
    source: "manual",
    raw: {},
    createdAt: now,
    updatedAt: now
  };

  await saveItem(item);
  state.items.unshift(item);
  state.selectedId = item.id;
  render();
  queueAutoSyncItem(item.id);
}

async function saveSelectedItemFromForm(form) {
  const item = getSelectedItem();
  if (!item) return;

  const formData = new FormData(form);
  const parentCategory = readCategoryValue(form, "parentCategory");
  const category = readCategoryValue(form, "category");
  const measurements = collectMeasurementsFromForm(form);
  const shoeSize = isShoeCategory({ parentCategory, category }) ? cleanText(formData.get("shoeSize")) : "";
  const name = cleanText(formData.get("name"));

  if (!name || !parentCategory) {
    showToast("제품명과 상위 카테고리는 필수 입력입니다.");
    return;
  }

  const updated = {
    ...item,
    name,
    productUrl: cleanText(formData.get("productUrl")),
    memo: cleanText(formData.get("memo")),
    brand: cleanText(formData.get("brand")),
    color: normalizeColor(formData.get("color")),
    parentCategory,
    category,
    sizeLabel: cleanText(formData.get("sizeLabel")),
    shoeSize,
    retailPrice: parsePrice(formData.get("retailPrice")),
    purchasePrice: parsePrice(formData.get("purchasePrice")),
    purchaseDate: cleanText(formData.get("purchaseDate")),
    owned: formData.get("owned") === "on",
    measurements,
    updatedAt: new Date().toISOString()
  };

  await saveItem(updated);
  rememberColorOption(updated.color);
  replaceLocalItem(updated);
  render();
  showToast("저장했습니다.");
  queueAutoSyncItem(updated.id);
}

async function saveSelectedItemFromData(data) {
  const item = getSelectedItem();
  if (!item) return { ok: false };

  const parentCategory = cleanText(data.parentCategory);
  const category = cleanText(data.category);
  const shoeSize = isShoeCategory({ parentCategory, category }) ? cleanText(data.shoeSize) : "";
  const name = cleanText(data.name);

  if (!name || !parentCategory) {
    showToast("제품명과 상위 카테고리는 필수 입력입니다.");
    return { ok: false };
  }

  const updated = {
    ...item,
    name,
    productUrl: cleanText(data.productUrl),
    memo: cleanText(data.memo),
    brand: cleanText(data.brand),
    color: normalizeColor(data.color),
    parentCategory,
    category,
    sizeLabel: cleanText(data.sizeLabel),
    shoeSize,
    retailPrice: parsePrice(data.retailPrice),
    purchasePrice: parsePrice(data.purchasePrice),
    purchaseDate: cleanText(data.purchaseDate),
    owned: Boolean(data.owned),
    measurements: sanitizeMeasurementData(data.measurements),
    updatedAt: new Date().toISOString()
  };

  await saveItem(updated);
  rememberColorOption(updated.color);
  replaceLocalItem(updated);
  render();
  showToast("저장했습니다.");
  queueAutoSyncItem(updated.id);
  return { ok: true, item: clonePlainItem(updated) };
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

async function saveItem(item) {
  await dbPut("items", normalizeItemColor(item));
}

function replaceLocalItem(item) {
  item = normalizeItemColor(item);
  const index = state.items.findIndex((candidate) => candidate.id === item.id);
  if (index >= 0) state.items[index] = item;
  else state.items.unshift(item);
}

async function deleteSelectedItem() {
  const item = getSelectedItem();
  if (!item) return;

  const confirmed = window.confirm(`"${item.name}" 제품을 삭제할까요?`);
  if (!confirmed) return;

  for (const imageId of item.imageIds || []) {
    const image = await dbGet("images", imageId);
    queueAutoDeleteImage(imageId, image?.storagePath || "");
    await dbDelete("images", imageId);
    revokeImageUrl(imageId);
  }

  await dbDelete("items", item.id);
  state.items = state.items.filter((candidate) => candidate.id !== item.id);
  state.selectedId = null;

  queueAutoDelete(item.id);
  render();
  showToast("삭제했습니다.");
}

async function handleImageFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    await uploadSelectedImageFile(file);
  } catch (error) {
    console.error(error);
    showToast("사진을 저장하지 못했습니다.");
  } finally {
    event.target.value = "";
  }
}

async function uploadSelectedImageFile(file) {
  const item = getSelectedItem();
  if (!file || !item) return { ok: false };

  const image = await compressImage(file, item.id);
  await dbPut("images", image);

  const updated = {
    ...item,
    imageIds: [image.id, ...(item.imageIds || []).filter((id) => id !== image.id)],
    primaryImageId: image.id,
    updatedAt: new Date().toISOString()
  };

  await saveItem(updated);
  replaceLocalItem(updated);
  state.selectedId = updated.id;
  render();
  showToast("사진을 압축해 저장했습니다.");
  queueAutoSyncItem(updated.id);
  return { ok: true, item: clonePlainItem(updated) };
}

async function compressImage(file, itemId) {
  return createEditedImage(file, itemId);
}

async function createEditedImage(sourceBlob, itemId, options = {}) {
  const bitmap = await createImageBitmap(sourceBlob);
  const maxSide = 1600;
  const outputSize = options.outputSize || maxSide;
  const editScale = Number(options.scale ?? 1);
  const offsetX = Number(options.offsetX ?? 0);
  const offsetY = Number(options.offsetY ?? 0);
  const containScale = Math.min(outputSize / bitmap.width, outputSize / bitmap.height);
  const drawWidth = Math.max(1, Math.round(bitmap.width * containScale * editScale));
  const drawHeight = Math.max(1, Math.round(bitmap.height * containScale * editScale));
  const drawX = Math.round((outputSize - drawWidth) / 2 + outputSize * (offsetX / 100));
  const drawY = Math.round((outputSize - drawHeight) / 2 + outputSize * (offsetY / 100));
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputSize, outputSize);
  context.drawImage(bitmap, drawX, drawY, drawWidth, drawHeight);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Image compression failed"));
    }, "image/webp", 0.78);
  });

  bitmap.close?.();

  return {
    id: `img-${crypto.randomUUID()}`,
    itemId,
    blob,
    mime: blob.type || "image/webp",
    width: outputSize,
    height: outputSize,
    edit: {
      scale: editScale,
      offsetX,
      offsetY,
      background: "#ffffff"
    },
    createdAt: new Date().toISOString()
  };
}

async function addImageFromUrl() {
  const input = document.querySelector("#imageUrlInput");
  const url = normalizeImageUrl(input?.value);
  return addImageFromUrlValue(url);
}

async function addImageFromUrlValue(value) {
  const item = getSelectedItem();
  const url = normalizeImageUrl(value);
  if (!item) return;
  if (!url) {
    showToast("올바른 이미지 URL을 입력해 주세요.");
    return;
  }

  await attachExternalImageUrl(item, url);
  return { ok: true };
}

async function attachImageToItem(item, image, message) {
  await dbPut("images", image);

  const updated = {
    ...item,
    imageIds: [image.id, ...(item.imageIds || []).filter((id) => id !== image.id)],
    primaryImageId: image.id,
    externalImageUrl: "",
    externalImageEdit: defaultImageEdit(),
    raw: {
      ...(item.raw || {}),
      externalImageUrl: null,
      externalImageEdit: null
    },
    updatedAt: new Date().toISOString()
  };

  await saveItem(updated);
  replaceLocalItem(updated);
  state.selectedId = updated.id;
  render();
  showToast(message);
  queueAutoSyncItem(updated.id);
}

async function attachExternalImageUrl(item, url) {
  const updated = {
    ...item,
    primaryImageId: null,
    externalImageUrl: url,
    externalImageEdit: defaultImageEdit(),
    raw: {
      ...(item.raw || {}),
      externalImageUrl: url,
      externalImageEdit: defaultImageEdit()
    },
    updatedAt: new Date().toISOString()
  };

  await saveItem(updated);
  replaceLocalItem(updated);
  state.selectedId = updated.id;
  render();
  showToast("이미지 URL을 저장했습니다.");
  queueAutoSyncItem(updated.id);
}

function normalizeImageUrl(value) {
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

function readImageEditOptions() {
  const scale = Number(document.querySelector('[data-image-edit="scale"]')?.value || 1);
  const offsetX = Number(document.querySelector('[data-image-edit="offsetX"]')?.value || 0);
  const offsetY = Number(document.querySelector('[data-image-edit="offsetY"]')?.value || 0);
  return { scale, offsetX, offsetY };
}

function updateImagePreviewTransform() {
  const preview = document.querySelector("[data-edit-preview]");
  if (!preview) return;

  const { scale, offsetX, offsetY } = readImageEditOptions();
  preview.style.setProperty("--image-scale", String(scale));
  preview.style.setProperty("--image-x", `${offsetX}%`);
  preview.style.setProperty("--image-y", `${offsetY}%`);
}

function resetImageEditor() {
  const defaults = { scale: 1, offsetX: 0, offsetY: 0 };
  Object.entries(defaults).forEach(([key, value]) => {
    const input = document.querySelector(`[data-image-edit="${key}"]`);
    if (input) input.value = value;
  });
  updateImagePreviewTransform();
}

async function saveImageEdit() {
  return saveImageEditFromOptions(readImageEditOptions());
}

async function saveImageEditFromOptions(options) {
  const item = getSelectedItem();
  if (!item) return { ok: false };
  const editOptions = normalizeImageEdit(options);

  try {
    const primary = getPrimaryImage(item);
    if (primary.externalUrl) {
      await saveExternalImageEdit(item, editOptions);
      return { ok: true };
    }

    const sourceBlob = await getPrimaryImageBlob(primary);
    if (!sourceBlob) throw new Error("No image source");

    const image = await createEditedImage(sourceBlob, item.id, editOptions);
    const previousImageId = item.primaryImageId || "";
    if (previousImageId) {
      const previous = await dbGet("images", previousImageId);
      image.id = previousImageId;
      image.storagePath = previous?.storagePath || "";
    }

    await dbPut("images", image);
    revokeImageUrl(image.id);

    const updated = {
      ...item,
      imageIds: [image.id, ...(item.imageIds || []).filter((id) => id !== image.id)],
      primaryImageId: image.id,
      updatedAt: new Date().toISOString()
    };

    await saveItem(updated);
    replaceLocalItem(updated);
    render();
    showToast("이미지 편집을 저장했습니다.");
    queueAutoSyncItem(updated.id);
    return { ok: true, item: clonePlainItem(updated) };
  } catch (error) {
    console.error(error);
    showToast("이미지를 편집하지 못했습니다.");
    return { ok: false };
  }
}

async function saveExternalImageEdit(item, options) {
  const edit = normalizeImageEdit(options);
  const updated = {
    ...item,
    externalImageEdit: edit,
    raw: {
      ...(item.raw || {}),
      externalImageUrl: item.externalImageUrl || null,
      externalImageEdit: edit
    },
    updatedAt: new Date().toISOString()
  };

  await saveItem(updated);
  replaceLocalItem(updated);
  render();
  showToast("이미지 표시 방식을 저장했습니다.");
  queueAutoSyncItem(updated.id);
}

async function getPrimaryImageBlob(primary) {
  if (primary.localId) {
    const record = await dbGet("images", primary.localId);
    return record?.blob || null;
  }

  if (primary.remoteUrl) {
    const response = await fetch(primary.remoteUrl, { mode: "cors" });
    if (!response.ok) throw new Error(`Remote image fetch failed: ${response.status}`);
    return response.blob();
  }

  return null;
}

async function removeSelectedImage() {
  const item = getSelectedItem();
  if (!item) return;

  if (!item.primaryImageId && item.externalImageUrl) {
    const updated = {
      ...item,
      primaryImageId: item.imageIds?.[0] || null,
      externalImageUrl: "",
      externalImageEdit: defaultImageEdit(),
      raw: {
        ...(item.raw || {}),
        externalImageUrl: null,
        externalImageEdit: null
      },
      updatedAt: new Date().toISOString()
    };

    await saveItem(updated);
    replaceLocalItem(updated);
    render();
    showToast("사진이 삭제됐습니다.");
    queueAutoSyncItem(updated.id);
    return;
  }

  if (!item.primaryImageId) return;

  const imageId = item.primaryImageId;
  const image = await dbGet("images", imageId);
  queueAutoDeleteImage(imageId, image?.storagePath || "");
  await dbDelete("images", imageId);
  revokeImageUrl(imageId);

  const remaining = (item.imageIds || []).filter((id) => id !== imageId);
  const updated = {
    ...item,
    imageIds: remaining,
    primaryImageId: remaining[0] || null,
    remoteImages: (item.remoteImages || []).filter((remote) => remote.id !== imageId),
    updatedAt: new Date().toISOString()
  };

  await saveItem(updated);
  replaceLocalItem(updated);
  render();
  showToast("사진을 삭제했습니다.");
  queueAutoSyncItem(updated.id);
}

async function hydrateImages() {
  const slots = Array.from(document.querySelectorAll("[data-image-id]"));
  for (const slot of slots) {
    const imageId = slot.dataset.imageId;
    if (!imageId) continue;

    try {
      const url = await getImageUrl(imageId);
      if (!url) continue;

      if (slot.tagName === "IMG") {
        slot.src = url;
      } else {
        slot.style.backgroundImage = `url("${url}")`;
      }
    } catch (error) {
      console.warn("Image hydration failed", error);
    }
  }
}

async function getImageUrl(imageId) {
  if (state.imageUrls.has(imageId)) return state.imageUrls.get(imageId);

  const record = await dbGet("images", imageId);
  if (!record?.blob) return "";

  const url = URL.createObjectURL(record.blob);
  state.imageUrls.set(imageId, url);
  return url;
}

function revokeImageUrl(imageId) {
  const url = state.imageUrls.get(imageId);
  if (url) URL.revokeObjectURL(url);
  state.imageUrls.delete(imageId);
}

function getSelectedItem() {
  return state.items.find((item) => item.id === state.selectedId);
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
  const remoteUrl = remote?.signedUrl || remote?.publicUrl || "";
  return { localId: "", remoteUrl, externalUrl: false, editable: Boolean(remoteUrl), edit: defaultImageEdit() };
}

function getInitial(item) {
  return (item.brand || item.name || "?").trim().slice(0, 1).toUpperCase();
}

function exportJson() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: state.items.map(sanitizeItemForExport)
  };
  downloadFile(`closet-backup-${dateStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
}

function exportCsv() {
  const headers = [
    "제품명",
    "브랜드",
    "상위 카테고리",
    "카테고리",
    "색상",
    "사이즈",
    "신발 사이즈",
    "정가",
    "실구매가",
    "구매일",
    "보유",
    "제품 URL",
    "메모",
    ...MEASURE_FIELDS
  ];

  const rows = state.items.map((item) => [
    item.name,
    item.brand,
    item.parentCategory,
    item.category,
    item.color,
    item.sizeLabel,
    item.shoeSize,
    item.retailPrice ?? "",
    item.purchasePrice ?? "",
    item.purchaseDate,
    item.owned ? "Yes" : "No",
    item.productUrl,
    item.memo,
    ...MEASURE_FIELDS.map((field) => item.measurements?.[field] ?? "")
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  downloadFile(`closet-${dateStamp()}.csv`, csv, "text/csv;charset=utf-8");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function initSupabase() {
  const config = window.WARDROBE_CONFIG || {};
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    state.supabaseReady = false;
    updateSyncButton();
    return;
  }

  try {
    const createClient = window.WARDROBE_SUPABASE_CREATE_CLIENT;
    if (!createClient) {
      throw new Error("Supabase client loader is missing.");
    }
    state.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data } = await state.supabase.auth.getSession();
    state.session = data.session || null;
    state.supabaseReady = true;

    state.supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;

      state.session = session;
      updateSyncButton();
      if (session) {
        state.authPrompted = false;
        if (refs.authDialog?.open) refs.authDialog.close();
        resumeAuthenticatedSession();
      } else if (shouldRequireAuth()) {
        state.items = [];
        state.selectedId = null;
        render();
        showAuthDialog({ once: true });
      }
    });
  } catch (error) {
    console.warn("Supabase init failed", error);
    state.supabaseReady = false;
  }

  updateSyncButton();
}

function updateSyncButton() {
  if (!refs.syncButton) return;

  if (state.syncing) {
    refs.syncButton.textContent = "동기화 중";
    refs.syncButton.disabled = true;
    return;
  }

  refs.syncButton.disabled = false;
  if (!state.supabaseReady) refs.syncButton.textContent = "로컬 저장";
  else if (!state.session) refs.syncButton.textContent = "로그인";
  else if (state.lastSyncError) refs.syncButton.textContent = "다시 시도";
  else if (hasPendingSync()) refs.syncButton.textContent = "저장 대기";
  else refs.syncButton.textContent = "자동 저장";
}

async function handleSyncButton() {
  if (!state.supabaseReady) {
    showToast("Supabase 연결 전에는 이 브라우저에만 저장됩니다.");
    return;
  }

  if (!state.session) {
    showAuthDialog();
    return;
  }

  if (!hasPendingSync() && !state.lastSyncError) {
    await syncNow();
    return;
  }

  await syncNow();
}

function shouldRequireAuth() {
  return Boolean(state.supabaseReady && !state.session);
}

function showAuthDialog(options = {}) {
  if (!refs.authDialog || !shouldRequireAuth()) return;
  if (options.once && state.authPrompted) return;

  state.authPrompted = true;
  if (!refs.authDialog.open) refs.authDialog.showModal();
}

async function resumeAuthenticatedSession() {
  await loadLocalItems();

  if (state.items.length) {
    await syncNow({ silent: true });
    return;
  }

  await pullFromSupabase({ silent: true });
  render();
}

function queueAutoSyncItem(itemId) {
  if (!itemId) return;
  state.pendingDeleteIds.delete(itemId);
  state.pendingItemIds.add(itemId);
  scheduleAutoSync();
}

function queueAutoSyncItems(itemIds) {
  itemIds.filter(Boolean).forEach((itemId) => {
    state.pendingDeleteIds.delete(itemId);
    state.pendingItemIds.add(itemId);
  });
  scheduleAutoSync();
}

function queueAutoDelete(itemId) {
  if (!itemId) return;
  state.pendingItemIds.delete(itemId);
  state.pendingDeleteIds.add(itemId);
  scheduleAutoSync();
}

function queueAutoDeleteImage(imageId, storagePath = "") {
  if (!imageId) return;
  state.pendingImageDeletes.set(imageId, storagePath);
  scheduleAutoSync();
}

function scheduleAutoSync(delay = 900) {
  updateSyncButton();
  clearTimeout(state.syncTimer);

  if (!state.supabaseReady || !state.session) return;

  state.syncTimer = setTimeout(() => {
    syncQueuedChanges({ silent: true });
  }, delay);
}

async function syncQueuedChanges(options = {}) {
  if (!state.supabase || !state.session) return;
  if (state.syncing) {
    scheduleAutoSync(1200);
    return;
  }

  if (!hasPendingSync()) {
    updateSyncButton();
    return;
  }

  try {
    state.syncing = true;
    updateSyncButton();

    for (const [imageId, storagePath] of [...state.pendingImageDeletes.entries()]) {
      await deleteImageFromSupabase(imageId, storagePath);
      state.pendingImageDeletes.delete(imageId);
    }

    for (const itemId of [...state.pendingDeleteIds]) {
      await deleteItemFromSupabase(itemId);
      state.pendingDeleteIds.delete(itemId);
    }

    for (const itemId of [...state.pendingItemIds]) {
      const item = state.items.find((candidate) => candidate.id === itemId);
      if (item) await pushItemToSupabase(item);
      state.pendingItemIds.delete(itemId);
    }

    state.lastSyncError = null;
    state.lastSyncedAt = new Date().toISOString();
    if (!options.silent) showToast("동기화했습니다.");
  } catch (error) {
    console.error(error);
    state.lastSyncError = error;
    if (!options.silent) showToast("자동 동기화에 실패했습니다. 다시 시도할 수 있습니다.");
  } finally {
    state.syncing = false;
    updateSyncButton();
  }
}

function hasPendingSync() {
  return Boolean(state.pendingItemIds.size || state.pendingDeleteIds.size || state.pendingImageDeletes.size);
}

async function requestMagicLink(email) {
  if (!email || !state.supabase) return;

  const { error } = await state.supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname}`
    }
  });

  if (error) {
    showToast(error.message);
    return;
  }

  refs.authDialog.close();
  showToast("로그인 링크를 이메일로 보냈습니다.");
}

async function syncNow(options = {}) {
  if (!state.supabase || !state.session || state.syncing) return;

  try {
    clearTimeout(state.syncTimer);
    state.syncing = true;
    updateSyncButton();
    for (const item of state.items) {
      await pushItemToSupabase(item);
    }
    for (const [imageId, storagePath] of [...state.pendingImageDeletes.entries()]) {
      await deleteImageFromSupabase(imageId, storagePath);
    }
    for (const itemId of [...state.pendingDeleteIds]) {
      await deleteItemFromSupabase(itemId);
    }
    await pullFromSupabase({ silent: true });
    state.pendingItemIds.clear();
    state.pendingDeleteIds.clear();
    state.pendingImageDeletes.clear();
    state.lastSyncError = null;
    state.lastSyncedAt = new Date().toISOString();
    if (!options.silent) showToast("동기화했습니다.");
  } catch (error) {
    console.error(error);
    state.lastSyncError = error;
    if (!options.silent) showToast("동기화에 실패했습니다.");
  } finally {
    state.syncing = false;
    updateSyncButton();
    render();
  }
}

async function pushItemToSupabase(item) {
  if (!state.supabase || !state.session) return;
  item = normalizeItemColor(item);
  await ensureMeasurementDefinitionsLoaded();
  const userId = state.session.user.id;
  await ensureCategoryRowsForItem(item, userId);
  await ensureColorRowForItem(item, userId);
  const row = {
    id: item.id,
    user_id: userId,
    name: item.name,
    product_url: item.productUrl || null,
    memo: item.memo || null,
    parent_category: item.parentCategory || null,
    category: item.category || null,
    brand: item.brand || null,
    color: item.color || null,
    image_url: item.externalImageUrl || null,
    image_edit: item.externalImageEdit || {},
    size_label: item.sizeLabel || null,
    shoe_size: item.shoeSize || null,
    retail_price: item.retailPrice,
    purchase_price: item.purchasePrice,
    purchase_date: item.purchaseDate || null,
    owned: item.owned,
    raw: {
      ...(item.raw || {}),
      externalImageUrl: item.externalImageUrl || null,
      externalImageEdit: item.externalImageEdit || null
    },
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString()
  };

  const { error } = await state.supabase.from("items").upsert(row);
  if (error) throw error;

  await state.supabase.from("item_measurements").delete().eq("item_id", item.id);
  const measurements = Object.entries(item.measurements || {}).map(([label, value], index) => {
    const definition = MEASUREMENT_BY_LABEL.get(label);
    return {
      item_id: item.id,
      measurement_definition_id: definition?.id || null,
      custom_label: definition ? null : label,
      label,
      value,
      unit: definition?.unit || "cm",
      source: "manual",
      sort_order: index * 10
    };
  });
  if (measurements.length) {
    const { error: measureError } = await state.supabase.from("item_measurements").insert(measurements);
    if (measureError) throw measureError;
  }

  await pushImagesToSupabase(item, userId);
}

async function ensureCategoryRowsForItem(item, userId) {
  const parentName = cleanText(item.parentCategory);
  if (!parentName) return;

  const parent = await findOrCreateCategory(parentName, null, userId);
  const childName = cleanText(item.category);
  if (childName) {
    await findOrCreateCategory(childName, parent?.id || null, userId);
  }
}

async function findOrCreateCategory(name, parentId, userId) {
  let query = state.supabase
    .from("categories")
    .select("id")
    .eq("name", name)
    .limit(1);

  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

  const { data, error } = await query;
  if (error) throw error;
  if (data?.[0]) return data[0];

  const { data: inserted, error: insertError } = await state.supabase
    .from("categories")
    .insert({
      owner_id: userId,
      parent_id: parentId,
      name,
      is_system: false
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return inserted;
}

async function ensureColorRowForItem(item, userId) {
  const name = cleanText(item.color);
  if (!name) return;
  rememberColorOption(name);

  if (DEFAULT_COLOR_OPTIONS.includes(name)) return;

  try {
    await findOrCreateColor(name, userId);
  } catch (error) {
    if (isMissingSupabaseRelationError(error)) {
      console.warn("colors table is not available yet. Run supabase/schema.sql to persist custom color options.", error);
      return;
    }
    throw error;
  }
}

async function findOrCreateColor(name, userId) {
  const { data, error } = await state.supabase
    .from("colors")
    .select("id")
    .eq("name", name)
    .limit(1);

  if (error) throw error;
  if (data?.[0]) return data[0];

  const { data: inserted, error: insertError } = await state.supabase
    .from("colors")
    .insert({
      owner_id: userId,
      name,
      is_system: false
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return inserted;
}

function hydrateColorOptions(rows) {
  state.colorOptions = uniqueValues((rows || []).map((row) => normalizeColor(row.name)));
}

async function fetchColorRows() {
  if (!state.supabase) return [];

  const { data, error } = await state.supabase
    .from("colors")
    .select("name")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!error) return data || [];
  if (isMissingSupabaseRelationError(error)) {
    console.warn("colors table is not available yet. Run supabase/schema.sql to persist custom color options.", error);
    return [];
  }
  throw error;
}

function isMissingSupabaseRelationError(error) {
  return error?.code === "42P01" || error?.code === "PGRST205" || /relation .*colors.* does not exist/i.test(error?.message || "");
}

function hydrateMeasurementDefinitionIds(rows) {
  MEASUREMENT_DB_ID_BY_KEY.clear();

  rows.forEach((row) => {
    if (!row.key || !row.id) return;
    MEASUREMENT_DB_ID_BY_KEY.set(row.key, row.id);

    const definition = MEASUREMENT_BY_KEY.get(row.key);
    if (definition) {
      definition.id = row.id;
      definition.unit = row.default_unit || definition.unit;
    }
  });
}

async function ensureMeasurementDefinitionsLoaded() {
  if (MEASUREMENT_DB_ID_BY_KEY.size) return;
  if (!state.supabase) return;

  const { data, error } = await state.supabase.from("measurement_definitions").select("*");
  if (error) throw error;
  hydrateMeasurementDefinitionIds(data || []);
}

async function pushImagesToSupabase(item, userId) {
  const imageIds = item.imageIds || [];
  for (const imageId of imageIds) {
    const image = await dbGet("images", imageId);
    if (!image?.blob) continue;

    const storagePath = image.storagePath || `${userId}/${item.id}/${image.id}.webp`;
    const { error: uploadError } = await state.supabase.storage
      .from("wardrobe-images")
      .upload(storagePath, image.blob, {
        contentType: image.mime || image.blob.type || "image/webp",
        upsert: true
      });
    if (uploadError) throw uploadError;

    const imageRow = {
      id: image.id,
      item_id: item.id,
      owner_id: userId,
      storage_path: storagePath,
      width: image.width || null,
      height: image.height || null,
      mime: image.mime || "image/webp",
      is_primary: image.id === item.primaryImageId
    };
    const { error: imageError } = await state.supabase.from("item_images").upsert(imageRow);
    if (imageError) throw imageError;

    if (!image.storagePath) {
      await dbPut("images", { ...image, storagePath });
    }
  }
}

async function pullFromSupabase(options = {}) {
  if (!state.supabase || !state.session) return;

  const [{ data: itemRows, error: itemError }, { data: definitionRows, error: definitionError }, { data: measureRows, error: measureError }, { data: imageRows, error: imageError }, colorRows] =
    await Promise.all([
      state.supabase.from("items").select("*").order("updated_at", { ascending: false }),
      state.supabase.from("measurement_definitions").select("*"),
      state.supabase.from("item_measurements").select("*"),
      state.supabase.from("item_images").select("*"),
      fetchColorRows()
    ]);

  if (itemError) throw itemError;
  if (definitionError) throw definitionError;
  if (measureError) throw measureError;
  if (imageError) throw imageError;

  hydrateMeasurementDefinitionIds(definitionRows || []);
  hydrateColorOptions(colorRows || []);

  const measurementsByItem = groupBy(measureRows || [], "item_id");
  const imagesByItem = groupBy(imageRows || [], "item_id");

  for (const row of itemRows || []) {
    const remoteImages = await Promise.all((imagesByItem.get(row.id) || []).map(async (image) => {
      const { data } = await state.supabase.storage.from("wardrobe-images").createSignedUrl(image.storage_path, 3600);
      return {
        id: image.id,
        storagePath: image.storage_path,
        signedUrl: data?.signedUrl || "",
        isPrimary: image.is_primary,
        width: image.width,
        height: image.height
      };
    }));

    const existing = await dbGet("items", row.id);
    const item = {
      id: row.id,
      name: row.name || "",
      productUrl: row.product_url || "",
      memo: row.memo || "",
      parentCategory: row.parent_category || "",
      category: row.category || "",
      brand: row.brand || "",
      color: normalizeColor(row.color),
      sizeLabel: row.size_label || "",
      shoeSize: row.shoe_size || "",
      retailPrice: row.retail_price,
      purchasePrice: row.purchase_price,
      purchaseDate: row.purchase_date || "",
      owned: row.owned,
      measurements: Object.fromEntries((measurementsByItem.get(row.id) || [])
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((measure) => [measure.custom_label || measure.label, Number(measure.value)])),
      imageIds: existing?.imageIds || [],
      primaryImageId: existing?.primaryImageId || null,
      remoteImages,
      externalImageUrl: cleanText(row.image_url || row.raw?.externalImageUrl),
      externalImageEdit: normalizeImageEdit(row.image_edit || row.raw?.externalImageEdit || existing?.externalImageEdit || defaultImageEdit()),
      source: existing?.source || "supabase",
      raw: row.raw || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    await dbPut("items", item);
  }

  await loadLocalItems();
  if (!options.silent) render();
}

async function deleteItemFromSupabase(itemId) {
  if (!state.supabase || !state.session) return;
  await state.supabase.from("items").delete().eq("id", itemId);
}

async function deleteImageFromSupabase(imageId, storagePath = "") {
  if (!state.supabase || !state.session) return;

  if (storagePath) {
    const { error: storageError } = await state.supabase.storage
      .from("wardrobe-images")
      .remove([storagePath]);
    if (storageError) throw storageError;
  }

  const { error } = await state.supabase.from("item_images").delete().eq("id", imageId);
  if (error) throw error;
}

async function shareSelectedItem() {
  const item = getSelectedItem();
  if (!item) return;

  const payload = {
    title: item.name,
    items: [sanitizeItemForExport(item)],
    createdAt: new Date().toISOString()
  };

  try {
    if (state.supabase && state.session) {
      const token = crypto.randomUUID().replace(/-/g, "") + hashString(Date.now().toString());
      const { error } = await state.supabase.from("share_snapshots").insert({
        owner_id: state.session.user.id,
        token,
        payload,
        is_active: true
      });
      if (error) throw error;

      await copyText(`${window.location.origin}${window.location.pathname}?share=${token}`);
      showToast("공유 링크를 복사했습니다.");
      return;
    }

    const encoded = encodeSharePayload(payload);
    await copyText(`${window.location.origin}${window.location.pathname}#share=${encoded}`);
    showToast("로컬 공유 링크를 복사했습니다.");
  } catch (error) {
    console.error(error);
    showToast("공유 링크를 만들지 못했습니다.");
  }
}

async function maybeRenderSharedView() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("share");
  const hashPayload = window.location.hash.startsWith("#share=") ? window.location.hash.slice(7) : "";

  if (!token && !hashPayload) return false;

  let payload = null;
  if (hashPayload) {
    payload = decodeSharePayload(hashPayload);
  } else if (token) {
    await initSupabase();
    if (!state.supabase) {
      renderShareError("공유 링크를 열려면 config.js에 Supabase 설정이 필요합니다.");
      return true;
    }
    const { data, error } = await state.supabase.rpc("get_share_snapshot", { share_token: token });
    if (error || !data) {
      renderShareError("공유 항목을 찾지 못했습니다.");
      return true;
    }
    payload = data;
  }

  if (!payload) {
    renderShareError("공유 데이터를 읽지 못했습니다.");
    return true;
  }

  renderSharedPayload(payload);
  return true;
}

function renderSharedPayload(payload) {
  refs.appShell.hidden = true;
  refs.shareView.hidden = false;
  refs.shareTitle.textContent = payload.title || "공유된 옷장";
  refs.shareItems.innerHTML = (payload.items || []).map((item) => `
    <article class="item-tile">
      <div class="image-slot placeholder">${escapeHtml(getInitial(item))}</div>
      <div class="item-title">
        <h3>${escapeHtml(item.name || "이름 없는 제품")}</h3>
        <p>${escapeHtml([item.brand, item.sizeLabel, item.category].filter(Boolean).join(" · ") || "정보 없음")}</p>
        <div class="chip-row">
          ${item.color ? `<span class="chip"><span class="color-dot" style="--dot:${escapeAttr(colorToHex(item.color))}"></span>${escapeHtml(item.color)}</span>` : ""}
          ${item.parentCategory ? `<span class="chip">${escapeHtml(item.parentCategory)}</span>` : ""}
        </div>
      </div>
      <div class="price-line">${escapeHtml(item.purchasePrice ? formatWon(item.purchasePrice) : "가격 없음")}</div>
    </article>
  `).join("");
}

function renderShareError(message) {
  refs.appShell.hidden = true;
  refs.shareView.hidden = false;
  refs.shareTitle.textContent = message;
  refs.shareItems.innerHTML = "";
}

function sanitizeItemForExport(item) {
  return {
    id: item.id,
    name: item.name,
    productUrl: item.productUrl,
    memo: item.memo,
    parentCategory: item.parentCategory,
    category: item.category,
    brand: item.brand,
    color: item.color,
    sizeLabel: item.sizeLabel,
    shoeSize: item.shoeSize,
    retailPrice: item.retailPrice,
    purchasePrice: item.purchasePrice,
    purchaseDate: item.purchaseDate,
    owned: item.owned,
    measurements: item.measurements || {},
    externalImageUrl: item.externalImageUrl || "",
    externalImageEdit: item.externalImageEdit || defaultImageEdit(),
    updatedAt: item.updatedAt
  };
}

function encodeSharePayload(payload) {
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeSharePayload(encoded) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch (error) {
    console.warn(error);
    return null;
  }
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

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
  const match = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
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
  const value = normalizeColor(color);
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

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function hashString(input) {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
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

let toastTimer = null;
function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => refs.toast.classList.remove("show"), 2600);
}
