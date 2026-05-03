"use strict";

const DEFAULT_CSV_FILE = "Closet 137abb41507c80699008e26e88fa26d9_all (2).csv";
const DB_NAME = "closet-pwa";
const DB_VERSION = 1;
const FULL_PULL_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const SIGNED_IMAGE_URL_MAX_AGE_MS = 45 * 60 * 1000;
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

const HIDDEN_FILTER_COLOR_OPTIONS = new Set(["블루", "와인"]);
const DEFAULT_COLOR_OPTIONS = window.closetFormatUtils.DEFAULT_COLOR_OPTIONS;
const {
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
} = window.closetFormatUtils;
const filterSubscribers = new Set();

const state = {
  db: null,
  items: [],
  colorOptions: [],
  loading: true,
  filters: {
    query: "",
    parentCategory: "all",
    childCategory: "all",
    brands: [],
    colors: [],
    owned: [],
    priceRanges: [],
    sort: "updated"
  },
  selectedId: null,
  view: "grid",
  imageUrls: new Map(),
  supabase: null,
  session: null,
  supabaseReady: false,
  syncing: false,
  categoryCache: new Map(),
  colorCache: new Map(),
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

  await restorePendingSync();
  await initSupabase();

  if (shouldRequireAuth()) {
    state.items = [];
    state.selectedId = null;
    state.loading = false;
    render();
    showAuthDialog({ once: true });
    return;
  }

  try {
    const pullOptions = await prepareSessionDataLoad();
    await pullFromSupabase({ silent: true, ...pullOptions });
  } catch (error) {
    console.error(error);
    showToast("Supabase 데이터를 불러오지 못했습니다.");
  } finally {
    state.loading = false;
  }

  render();
}

async function prepareSessionDataLoad() {
  if (!state.session) return {};

  const userId = state.session.user.id;
  const cachedUserId = await dbMetaValue("supabaseUserId");
  const lastRemotePullAt = await dbMetaValue("lastRemotePullAt");
  const lastFullRemotePullAt = await dbMetaValue("lastFullRemotePullAt");
  const lastSignedImageUrlRefreshAt = await dbMetaValue("lastSignedImageUrlRefreshAt");
  const sameUser = cachedUserId === userId;

  if (!sameUser) {
    await dbSetMetaValue("supabaseUserId", userId);
    return {};
  }

  if (hasPendingSync()) {
    await loadLocalItems();
    await syncQueuedChanges({ silent: true });
    return {};
  }

  await loadLocalItems();
  const hasRemoteImages = state.items.some((item) => (item.remoteImages || []).length);
  const signedImageUrlAge = lastSignedImageUrlRefreshAt
    ? Date.now() - new Date(lastSignedImageUrlRefreshAt).getTime()
    : Infinity;
  const shouldRefreshSignedImageUrls = hasRemoteImages && signedImageUrlAge > SIGNED_IMAGE_URL_MAX_AGE_MS;
  const canUseIncrementalPull = Boolean(
    state.items.length &&
    lastRemotePullAt &&
    lastFullRemotePullAt &&
    !shouldRefreshSignedImageUrls &&
    Date.now() - new Date(lastFullRemotePullAt).getTime() < FULL_PULL_MAX_AGE_MS
  );

  return canUseIncrementalPull ? { since: lastRemotePullAt } : {};
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
  refs.authDialog = document.querySelector("#authDialog");
  refs.authForm = document.querySelector("#authForm");
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
    getFilterSnapshot,
    getImageUrl,
    getMeasurementFieldsForItem,
    getParentCategoryOptions,
    isShoeCategory,
    removeSelectedImage,
    resetFilters,
    saveImageEdit: saveImageEditFromOptions,
    saveSelectedItem: saveSelectedItemFromData,
    shareSelectedItem,
    setFilters,
    subscribeFilters,
    uploadImageFile: uploadSelectedImageFile
  };
}

function bindEvents() {
  refs.searchInput?.addEventListener("input", () => {
    state.filters.query = refs.searchInput.value.trim();
    render();
  });

  refs.categoryFilter?.addEventListener("change", () => {
    state.filters.parentCategory = refs.categoryFilter.value;
    state.filters.childCategory = "all";
    render();
  });

  refs.brandFilter?.addEventListener("change", () => {
    state.filters.brands = refs.brandFilter.value === "all" ? [] : [refs.brandFilter.value];
    render();
  });

  refs.colorFilter?.addEventListener("change", () => {
    state.filters.colors = refs.colorFilter.value === "all" ? [] : [normalizeColor(refs.colorFilter.value)];
    render();
  });

  refs.sortFilter?.addEventListener("change", () => {
    state.filters.sort = refs.sortFilter.value;
    render();
  });

  refs.csvFileInput?.addEventListener("change", handleCsvFile);
  refs.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await requestGoogleLogin();
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
    state.filters.owned = ownedButton.dataset.owned === "all" ? [] : [ownedButton.dataset.owned];
    document.querySelectorAll("[data-owned]").forEach((button) => {
      button.classList.toggle("active", button.dataset.owned === "all" ? !state.filters.owned.length : state.filters.owned.includes(button.dataset.owned));
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
      if (!requireAuthenticatedMutation()) return;
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
  if (!requireAuthenticatedMutation()) return;
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

async function dbMetaValue(key) {
  const record = await dbGet("meta", key);
  return record?.value || "";
}

async function dbSetMetaValue(key, value) {
  await dbPut("meta", { key, value });
}

async function restorePendingSync() {
  const pending = await dbMetaValue("pendingSync");
  if (!pending || typeof pending !== "object") return;

  state.pendingItemIds = new Set(Array.isArray(pending.itemIds) ? pending.itemIds.filter(Boolean) : []);
  state.pendingDeleteIds = new Set(Array.isArray(pending.deleteIds) ? pending.deleteIds.filter(Boolean) : []);
  state.pendingImageDeletes = new Map(
    Array.isArray(pending.imageDeletes)
      ? pending.imageDeletes.filter((entry) => Array.isArray(entry) && entry[0])
      : []
  );
}

function serializePendingSync() {
  return {
    itemIds: [...state.pendingItemIds],
    deleteIds: [...state.pendingDeleteIds],
    imageDeletes: [...state.pendingImageDeletes.entries()]
  };
}

function schedulePendingSyncPersist() {
  persistPendingSync().catch((error) => console.warn("Pending sync state could not be saved", error));
}

async function persistPendingSync() {
  if (!state.db) return;
  await dbSetMetaValue("pendingSync", serializePendingSync());
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

async function pruneLocalItems(remoteIds) {
  const items = await dbAll("items");
  for (const item of items) {
    if (!remoteIds.has(item.id)) {
      await dbDelete("items", item.id);
      if (state.selectedId === item.id) state.selectedId = null;
    }
  }
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
  if (!requireAuthenticatedMutation()) {
    event.target.value = "";
    return;
  }

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
  const rows = window.closetCsvUtils.parseCsv(text);
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
      measurementsDirty: existing?.measurementsDirty ?? !sameMeasurements(existing?.measurements || {}, item.measurements || {}),
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
    measurementsDirty: Object.keys(measurements).length > 0,
    imageIds: [],
    primaryImageId: null,
    remoteImages: [],
    imagesDirty: false,
    externalImageUrl: "",
    externalImageEdit: defaultImageEdit(),
    source: "csv",
    sourceIndex: index,
    raw: row,
    createdAt: now,
    updatedAt: now
  };
}

function render() {
  syncFilterControls();
  renderFilterOptions();
  renderSummary();
  renderItemList();
  renderDetail();
  updateSyncButton();
  emitFilterChange();
}

function syncFilterControls() {
  if (refs.searchInput) refs.searchInput.value = state.filters.query;
  if (refs.sortFilter) refs.sortFilter.value = state.filters.sort;
  document.querySelectorAll("[data-owned]").forEach((button) => {
    button.classList.toggle("active", button.dataset.owned === "all" ? !state.filters.owned.length : state.filters.owned.includes(button.dataset.owned));
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
}

function renderFilterOptions() {
  fillSelect(refs.categoryFilter, getParentCategoryOptions(), "전체 카테고리", state.filters.parentCategory);
  fillSelect(refs.brandFilter, uniqueValues(state.items.map((item) => item.brand)), "전체 브랜드", state.filters.brands[0] || "all");
  fillSelect(refs.colorFilter, getFilterColorOptions(), "전체 색상", normalizeColor(state.filters.colors[0] || "all"));
}

function fillSelect(select, values, allLabel, selected) {
  if (!select) return;
  const options = [`<option value="all">${escapeHtml(allLabel)}</option>`]
    .concat(values.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`));
  select.innerHTML = options.join("");
  select.value = values.includes(selected) ? selected : "all";
  if (select.value !== selected) {
    if (select === refs.categoryFilter) state.filters.parentCategory = select.value;
    if (select === refs.brandFilter) state.filters.brands = select.value === "all" ? [] : [select.value];
    if (select === refs.colorFilter) state.filters.colors = select.value === "all" ? [] : [normalizeColor(select.value)];
  }
}

function renderSummary() {
  if (!refs.summaryRow) return;

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
  if (state.loading) {
    refs.resultTitle.textContent = "제품";
    refs.resultCount.textContent = "불러오는 중";
    refs.itemList.className = state.view === "list" ? "item-grid list" : "item-grid";
    refs.emptyState.hidden = true;
    refs.itemList.innerHTML = "";
    return;
  }

  const items = getVisibleItems();
  const title = state.filters.childCategory !== "all"
    ? state.filters.childCategory
    : state.filters.parentCategory === "all" ? "제품" : state.filters.parentCategory;
  refs.resultTitle.textContent = title;
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
  return window.closetFilterUtils.sortParentCategoryOptions(uniqueValues([
    ...Object.keys(DEFAULT_CATEGORY_TREE),
    ...state.items.map((item) => item.parentCategory)
  ]));
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
	  return sortColorOptions([
	    ...DEFAULT_COLOR_OPTIONS,
	    ...state.colorOptions,
	    ...state.items.map((item) => item.color)
	  ].filter((color) => color && !HIDDEN_FILTER_COLOR_OPTIONS.has(normalizeColor(color))));
		}

function getFilterSnapshot() {
  const visibleItems = getVisibleItems();
  const parentCategories = getParentCategoryOptions();
  const childCategories = state.filters.parentCategory === "all"
    ? uniqueValues(state.items.map((item) => item.category))
    : getChildCategoryOptions(state.filters.parentCategory);

  return window.closetFilterUtils.getFilterSnapshot({
    filters: state.filters,
    items: state.items,
    visibleItems,
    parentCategories,
    childCategories,
    brands: uniqueValues(state.items.map((item) => item.brand)),
    colors: getFilterColorOptions(),
    loading: state.loading
  });
}

function setFilters(nextPartialFilters = {}) {
  state.filters = window.closetFilterUtils.applyFilterPatch(state.filters, nextPartialFilters, {
    cleanText,
    normalizeColor,
    getChildCategoryOptions
  });
  render();
}

function resetFilters() {
  state.filters = window.closetFilterUtils.resetFilters(state.filters);
  render();
}

function subscribeFilters(listener) {
  if (typeof listener !== "function") return () => {};
  filterSubscribers.add(listener);
  listener(getFilterSnapshot());
  return () => filterSubscribers.delete(listener);
}

function emitFilterChange() {
  const snapshot = getFilterSnapshot();
  window.dispatchEvent(new CustomEvent("closet:filters-change", { detail: snapshot }));
  filterSubscribers.forEach((listener) => listener(snapshot));
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
  return window.closetFilterUtils.getVisibleItems(state.items, state.filters, {
    normalizeColor,
    compareDate,
    sortByUpdated
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
  if (!requireAuthenticatedMutation()) return;
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
    measurementsDirty: false,
    imageIds: [],
    primaryImageId: null,
    remoteImages: [],
    imagesDirty: false,
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
  if (!requireAuthenticatedMutation()) return;
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
    measurementsDirty: item.measurementsDirty || !sameMeasurements(item.measurements, measurements),
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
  if (!requireAuthenticatedMutation()) return { ok: false };
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
  updated.measurementsDirty = item.measurementsDirty || !sameMeasurements(item.measurements, updated.measurements);

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

function sameMeasurements(a = {}, b = {}) {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key, index) => key === bKeys[index] && Number(a[key]) === Number(b[key]));
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
  if (!requireAuthenticatedMutation()) return;
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

  for (const remote of item.remoteImages || []) {
    queueAutoDeleteImage(remote.id, remote.storagePath || "");
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
  if (!requireAuthenticatedMutation()) return { ok: false };
  const item = getSelectedItem();
  if (!file || !item) return { ok: false };

  const image = await compressImage(file, item.id);
  await dbPut("images", image);

  const updated = {
    ...item,
    imageIds: [image.id, ...(item.imageIds || []).filter((id) => id !== image.id)],
    primaryImageId: image.id,
    imagesDirty: true,
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
  showToast("사진을 압축해 저장했습니다.");
  queueAutoSyncItem(updated.id);
  return { ok: true, item: clonePlainItem(updated) };
}

async function compressImage(file, itemId) {
  return createEditedImage(file, itemId);
}

async function createEditedImage(sourceBlob, itemId, options = {}) {
  const imageUtils = window.closetImageUtils;
  if (!imageUtils?.createEditedImage) throw new Error("Image utilities are not loaded");
  return imageUtils.createEditedImage(sourceBlob, itemId, options);
}

async function addImageFromUrl() {
  const input = document.querySelector("#imageUrlInput");
  const url = normalizeImageUrl(input?.value);
  return addImageFromUrlValue(url);
}

async function addImageFromUrlValue(value) {
  if (!requireAuthenticatedMutation()) return { ok: false };
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
    imagesDirty: true,
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
  if (!requireAuthenticatedMutation()) return { ok: false };
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
    const previousImageId = item.primaryImageId || primary.remoteId || "";
    if (previousImageId) {
      const previous = await dbGet("images", previousImageId);
      image.id = previousImageId;
      image.storagePath = previous?.storagePath || primary.storagePath || "";
      image.needsUpload = true;
    }

    await dbPut("images", image);
    revokeImageUrl(image.id);

    const updated = {
      ...item,
      imageIds: [image.id, ...(item.imageIds || []).filter((id) => id !== image.id)],
      primaryImageId: image.id,
      imagesDirty: true,
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
  if (!requireAuthenticatedMutation()) return;
  const item = getSelectedItem();
  if (!item) return;
  const primary = getPrimaryImage(item);

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

  if (!item.primaryImageId && primary.remoteId) {
    queueAutoDeleteImage(primary.remoteId, primary.storagePath || "");
    const updated = {
      ...item,
      remoteImages: (item.remoteImages || []).filter((remote) => remote.id !== primary.remoteId),
      updatedAt: new Date().toISOString()
    };

    await saveItem(updated);
    replaceLocalItem(updated);
    render();
    showToast("사진을 삭제했습니다.");
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
    imagesDirty: true,
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
  return {
    localId: "",
    remoteId: remote?.id || "",
    storagePath: remote?.storagePath || "",
    remoteUrl,
    externalUrl: false,
    editable: Boolean(remoteUrl),
    edit: defaultImageEdit()
  };
}

function appendCacheBuster(url, version) {
  if (!url || !version) return url || "";

  try {
    const parsed = new URL(url);
    parsed.searchParams.set("v", String(version));
    return parsed.href;
  } catch (error) {
    return url;
  }
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
  window.closetCsvUtils.downloadFile(`closet-backup-${window.closetCsvUtils.dateStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
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

  const csv = window.closetCsvUtils.buildCsv([headers, ...rows]);
  window.closetCsvUtils.downloadFile(`closet-${window.closetCsvUtils.dateStamp()}.csv`, csv, "text/csv;charset=utf-8");
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
    state.supabaseReady = true;

    let initialAuthSettled = false;
    let settleInitialAuth = () => {};
    const initialAuth = new Promise((resolve) => {
      settleInitialAuth = resolve;
    });

    const settleInitialSession = (session) => {
      if (initialAuthSettled) return;
      initialAuthSettled = true;
      state.session = session || null;
      updateSyncButton();
      settleInitialAuth();
    };

    state.supabase.auth.onAuthStateChange((event, session) => {
      if (!initialAuthSettled || event === "INITIAL_SESSION") {
        settleInitialSession(session);
        return;
      }

      state.session = session || null;
      updateSyncButton();
      if (session) {
        resetSupabaseLookupCaches();
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

    const { data } = await state.supabase.auth.getSession();
    if (data.session) settleInitialSession(data.session);

    await Promise.race([
      initialAuth,
      new Promise((resolve) => window.setTimeout(resolve, 1500))
    ]);
    if (!initialAuthSettled) settleInitialSession(null);
  } catch (error) {
    console.warn("Supabase init failed", error);
    state.supabaseReady = false;
  }

  updateSyncButton();
}

function updateSyncButton() {
  return;
}

async function handleSyncButton() {
  if (!state.supabaseReady) {
    showToast("Supabase 설정 또는 네트워크 연결을 확인해주세요.");
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
  return !state.session;
}

function requireAuthenticatedMutation() {
  if (state.session) return true;
  showAuthDialog();
  showToast("로그인 후 사용할 수 있습니다.");
  return false;
}

function showAuthDialog(options = {}) {
  if (!refs.authDialog || !shouldRequireAuth()) return;
  if (options.once && state.authPrompted) return;

  state.authPrompted = true;
  if (!refs.authDialog.open) refs.authDialog.showModal();
}

async function resumeAuthenticatedSession() {
  state.loading = true;
  render();

  try {
    const pullOptions = await prepareSessionDataLoad();
    await pullFromSupabase({ silent: true, ...pullOptions });
  } catch (error) {
    console.error(error);
    showToast("Supabase 데이터를 불러오지 못했습니다.");
  } finally {
    state.loading = false;
    render();
  }
}

function resetSupabaseLookupCaches() {
  state.categoryCache.clear();
  state.colorCache.clear();
}

function queueAutoSyncItem(itemId) {
  if (!itemId) return;
  state.pendingDeleteIds.delete(itemId);
  state.pendingItemIds.add(itemId);
  schedulePendingSyncPersist();
  scheduleAutoSync();
}

function queueAutoSyncItems(itemIds) {
  itemIds.filter(Boolean).forEach((itemId) => {
    state.pendingDeleteIds.delete(itemId);
    state.pendingItemIds.add(itemId);
  });
  schedulePendingSyncPersist();
  scheduleAutoSync();
}

function queueAutoDelete(itemId) {
  if (!itemId) return;
  state.pendingItemIds.delete(itemId);
  state.pendingDeleteIds.add(itemId);
  schedulePendingSyncPersist();
  scheduleAutoSync();
}

function queueAutoDeleteImage(imageId, storagePath = "") {
  if (!imageId) return;
  state.pendingImageDeletes.set(imageId, storagePath);
  schedulePendingSyncPersist();
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
      await persistPendingSync();
    }

    for (const itemId of [...state.pendingDeleteIds]) {
      await deleteItemFromSupabase(itemId);
      state.pendingDeleteIds.delete(itemId);
      await persistPendingSync();
    }

    for (const itemId of [...state.pendingItemIds]) {
      const item = state.items.find((candidate) => candidate.id === itemId);
      if (item) await pushItemToSupabase(item);
      state.pendingItemIds.delete(itemId);
      await persistPendingSync();
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
    await persistPendingSync();
    updateSyncButton();
  }
}

function hasPendingSync() {
  return Boolean(state.pendingItemIds.size || state.pendingDeleteIds.size || state.pendingImageDeletes.size);
}

async function requestGoogleLogin() {
  if (!state.supabase) {
    showToast("Supabase 설정 또는 네트워크 연결을 확인해주세요.");
    return;
  }

  const { error } = await state.supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`
    }
  });

  if (error) {
    showToast(error.message);
    return;
  }
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
    await persistPendingSync();
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
  const hasUploadedImage = Boolean(item.primaryImageId || (item.imageIds || []).length);
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
    image_url: hasUploadedImage ? null : item.externalImageUrl || null,
    image_edit: item.externalImageEdit || {},
    size_label: item.sizeLabel || null,
    shoe_size: item.shoeSize || null,
    retail_price: item.retailPrice,
    purchase_price: item.purchasePrice,
    purchase_date: item.purchaseDate || null,
    owned: item.owned,
    raw: {
      ...(item.raw || {}),
      externalImageUrl: hasUploadedImage ? null : item.externalImageUrl || null,
      externalImageEdit: hasUploadedImage ? null : item.externalImageEdit || null
    },
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || new Date().toISOString()
  };

  const { error } = await state.supabase.from("items").upsert(row);
  if (error) throw error;

  await pushMeasurementsToSupabase(item);

  await pushImagesToSupabase(item, userId);
}

async function pushMeasurementsToSupabase(item) {
  if (!item.measurementsDirty) return;

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

  const cleanItem = { ...item, measurementsDirty: false };
  item.measurementsDirty = false;
  await dbPut("items", cleanItem);
  replaceLocalItem(cleanItem);
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
  const cacheKey = `${userId}:${parentId || "root"}:${name.toLocaleLowerCase("ko-KR")}`;
  const cached = state.categoryCache.get(cacheKey);
  if (cached) return cached;

  let query = state.supabase
    .from("categories")
    .select("id")
    .eq("name", name)
    .limit(1);

  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

  const { data, error } = await query;
  if (error) throw error;
  if (data?.[0]) {
    state.categoryCache.set(cacheKey, data[0]);
    return data[0];
  }

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
  state.categoryCache.set(cacheKey, inserted);
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
  const cacheKey = `${userId}:${name.toLocaleLowerCase("ko-KR")}`;
  const cached = state.colorCache.get(cacheKey);
  if (cached) return cached;

  const { data, error } = await state.supabase
    .from("colors")
    .select("id")
    .eq("name", name)
    .limit(1);

  if (error) throw error;
  if (data?.[0]) {
    state.colorCache.set(cacheKey, data[0]);
    return data[0];
  }

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
  state.colorCache.set(cacheKey, inserted);
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
  const images = [];

  for (const imageId of imageIds) {
    const image = await dbGet("images", imageId);
    if (!image?.blob) continue;
    images.push(image);
  }

  if (!images.length) return;
  const hasImageChanges = Boolean(item.imagesDirty || images.some((image) => !image.storagePath || image.needsUpload));
  if (!hasImageChanges) return;

  const { error: primaryResetError } = await state.supabase
    .from("item_images")
    .update({ is_primary: false })
    .eq("item_id", item.id);
  if (primaryResetError) throw primaryResetError;

  for (const image of images) {
    const storagePath = image.storagePath || `${userId}/${item.id}/${image.id}.webp`;
    const shouldUpload = !image.storagePath || image.needsUpload;
    if (shouldUpload) {
      const { error: uploadError } = await state.supabase.storage
        .from("wardrobe-images")
        .upload(storagePath, image.blob, {
          contentType: image.mime || image.blob.type || "image/webp",
          upsert: true
        });
      if (uploadError) throw uploadError;
    }

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

    if (shouldUpload || !image.storagePath || image.needsUpload) {
      await dbPut("images", { ...image, storagePath, needsUpload: false });
    }
  }

  if (item.imagesDirty) {
    const cleanItem = { ...item, imagesDirty: false };
    item.imagesDirty = false;
    await dbPut("items", cleanItem);
    replaceLocalItem(cleanItem);
  }
}

async function pullFromSupabase(options = {}) {
  if (!state.supabase || !state.session) return;
  const since = cleanText(options.since);
  const incremental = Boolean(since);
  const pulledAt = new Date().toISOString();

  let itemQuery = state.supabase
    .from("items")
    .select("*")
    .order("updated_at", { ascending: false });

  if (incremental) {
    itemQuery = itemQuery.gt("updated_at", since);
  }

  const { data: itemRows, error: itemError } = await itemQuery;
  if (itemError) throw itemError;

  const changedItemIds = (itemRows || []).map((row) => row.id);
  const definitionPromise = incremental
    ? Promise.resolve({ data: null, error: null })
    : state.supabase.from("measurement_definitions").select("*");
  const measurePromise = !incremental
    ? state.supabase.from("item_measurements").select("*")
    : !changedItemIds.length
      ? Promise.resolve({ data: [], error: null })
      : state.supabase
      .from("item_measurements")
      .select("*")
      .in("item_id", changedItemIds);
  const imagePromise = !incremental
    ? state.supabase.from("item_images").select("*").order("created_at", { ascending: false })
    : !changedItemIds.length
      ? Promise.resolve({ data: [], error: null })
      : state.supabase
      .from("item_images")
      .select("*")
      .in("item_id", changedItemIds)
      .order("created_at", { ascending: false });
  const colorPromise = incremental ? Promise.resolve([]) : fetchColorRows();

  const [{ data: definitionRows, error: definitionError }, { data: measureRows, error: measureError }, { data: imageRows, error: imageError }, colorRows] =
    await Promise.all([definitionPromise, measurePromise, imagePromise, colorPromise]);

  if (definitionError) throw definitionError;
  if (measureError) throw measureError;
  if (imageError) throw imageError;

  if (!incremental) {
    hydrateMeasurementDefinitionIds(definitionRows || []);
    hydrateColorOptions(colorRows || []);
  }

  const measurementsByItem = groupBy(measureRows || [], "item_id");
  const imagesByItem = groupBy(imageRows || [], "item_id");
  const signedUrlByPath = await createSignedImageUrlMap(imageRows || []);
  const remoteIds = new Set((itemRows || []).map((row) => row.id));

  if (!incremental) {
    await pruneLocalItems(remoteIds);
  }

  for (const row of itemRows || []) {
    const remoteImages = (imagesByItem.get(row.id) || []).map((image) => {
      const signedUrl = signedUrlByPath.get(image.storage_path) || "";
      return {
        id: image.id,
        storagePath: image.storage_path,
        signedUrl,
        isPrimary: image.is_primary,
        width: image.width,
        height: image.height
      };
    });

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
      measurementsDirty: false,
      imageIds: existing?.imageIds || [],
      primaryImageId: existing?.primaryImageId || null,
      remoteImages,
      imagesDirty: false,
      externalImageUrl: cleanText(row.image_url || row.raw?.externalImageUrl),
      externalImageEdit: normalizeImageEdit(row.image_edit || row.raw?.externalImageEdit || existing?.externalImageEdit || defaultImageEdit()),
      source: existing?.source || "supabase",
      raw: row.raw || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    await dbPut("items", item);
  }

  await dbSetMetaValue("supabaseUserId", state.session.user.id);
  await dbSetMetaValue("lastRemotePullAt", pulledAt);
  if (!incremental) {
    await dbSetMetaValue("lastFullRemotePullAt", pulledAt);
    await dbSetMetaValue("lastSignedImageUrlRefreshAt", pulledAt);
  }
  state.lastSyncedAt = pulledAt;

  await loadLocalItems();
  if (!options.silent) render();
}

async function createSignedImageUrlMap(imageRows) {
  const paths = uniqueValues((imageRows || []).map((image) => image.storage_path));
  const signedUrlByPath = new Map();
  if (!paths.length) return signedUrlByPath;

  const { data, error } = await state.supabase.storage
    .from("wardrobe-images")
    .createSignedUrls(paths, 3600);

  if (error) {
    console.warn("Signed image URLs could not be created", error);
    return signedUrlByPath;
  }

  (data || []).forEach((entry) => {
    if (entry?.path && entry?.signedUrl) {
      signedUrlByPath.set(entry.path, entry.signedUrl);
    }
  });

  return signedUrlByPath;
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

let toastTimer = null;
function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => refs.toast.classList.remove("show"), 2600);
}
