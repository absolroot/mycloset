"use strict";

const DEFAULT_CSV_FILE = "Closet 137abb41507c80699008e26e88fa26d9_all (2).csv";
const DB_NAME = "closet-pwa";
const TEMP_DB_NAME = "closet-pwa-temporary";
const TEMP_MODE_STORAGE_KEY = "closet-temporary-mode";
const GUEST_MODE_STORAGE_KEY = TEMP_MODE_STORAGE_KEY;
const DB_VERSION = 1;
const FULL_PULL_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const SIGNED_IMAGE_URL_MAX_AGE_MS = 45 * 60 * 1000;
const SYNC_CATEGORY_ROWS = false;
const HIDDEN_FILTER_COLOR_OPTIONS = new Set(["블루", "네이비", "카키", "와인"]);
const DEFAULT_COLOR_OPTIONS = window.closetFormatUtils.DEFAULT_COLOR_OPTIONS;
const PUBLIC_INFORMATION_PATHS = new Set(["/about", "/terms", "/privacy"]);
const {
  MEASURE_FIELDS,
  MEASUREMENT_BY_LABEL,
  MEASUREMENT_BY_KEY,
  MEASUREMENT_DB_ID_BY_KEY
} = window.closetMeasurementUtils;
const {
  DEFAULT_CATEGORY_TREE,
  CHILD_CATEGORY_ORDER
} = window.closetCategoryUtils;
const {
  cleanText,
  normalizeColor,
  normalizeItemColor,
  parsePrice,
  compareDate,
  sortByUpdated,
  uniqueValues,
  sortColorOptions,
  groupBy,
  formatWon,
  formatNumber,
  escapeHtml,
  escapeAttr
} = window.closetFormatUtils;
const {
  downloadBlob,
  sanitizeItemForExport
} = window.closetExportUtils;
const {
  createZipBackup,
  getRemoteImageUrl: getBackupRemoteImageUrl
} = window.closetBackupUtils;
const {
  all: storageAll,
  get: storageGet,
  metaValue: storageMetaValue,
  openDatabase: storageOpenDatabase,
  put: storagePut,
  remove: storageRemove,
  setMetaValue: storageSetMetaValue
} = window.closetStorageUtils;
const {
  applyImageUrl,
  defaultImageEdit,
  isFreshRemoteImageCache,
  normalizeImageEdit,
  normalizeImageUrl
} = window.closetImageStateUtils;
const {
  normalizeImageLocator,
  remoteImageCacheKey,
  remoteImageUrl
} = window.closetImageProviderUtils;
const {
  collectMeasurementsFromForm,
  readCategoryValue,
  refreshChildCategorySelect: refreshChildCategorySelectControl,
  refreshMeasurementGridFromForm: refreshMeasurementGridControl,
  refreshShoeSizeVisibility: refreshShoeSizeVisibilityControl,
  syncCategoryCustomInput,
  uniqueCustomMeasurementLabel
} = window.closetFormUtils;
const {
  itemInitial,
  measureFieldHtml: renderMeasureFieldHtml,
  renderItemCard: renderItemCardHtml
} = window.closetRenderUtils;
const {
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
} = window.closetItemUtils;
const {
  createClient: createSupabaseClient,
  createSignedImageUrlMap,
  deleteImage: deleteSupabaseImage,
  deleteItem: deleteSupabaseItem,
  ensureCategoryRowsForItem: ensureSupabaseCategoryRowsForItem,
  fetchMeasurementDefinitions,
  fetchPullData,
  findOrCreateColor: findOrCreateSupabaseColor,
  isMissingRelationError,
  itemFromRow: supabaseItemFromRow,
  itemToRow: supabaseItemToRow,
  remoteImageFromRow,
  replaceMeasurements: replaceSupabaseMeasurements,
  signInWithGoogle,
  signOut: signOutOfSupabase,
  uploadItemImages,
  upsertItem: upsertSupabaseItem
} = window.closetSupabaseUtils;
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
    ratings: [],
    sort: "category"
  },
  selectedId: null,
  draftItem: null,
  view: "grid",
  imageUrls: new Map(),
  remoteImageCachePromises: new Map(),
  supabase: null,
  session: null,
  supabaseReady: false,
  ratingColumnAvailable: true,
  syncing: false,
  categoryCache: new Map(),
  colorCache: new Map(),
  pendingItemIds: new Set(),
  pendingDeleteIds: new Set(),
  pendingImageDeletes: new Map(),
  syncTimer: null,
  lastSyncError: null,
  lastSyncedAt: null,
  authPrompted: false,
  lastDetailSignature: "",
  temporary: false
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
  state.temporary = readTemporaryModePreference();

  state.db = await openDatabase();

  if (state.temporary) {
    await startTemporarySession({ silent: true });
    return;
  }

  await restorePendingSync();
  if (shouldInitializeSupabaseOnBoot()) {
    await initSupabase();
  } else {
    updateSyncButton();
  }

  if (isPublicInformationPath()) {
    state.items = [];
    state.selectedId = null;
    state.loading = false;
    render();
    return;
  }

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
  refs.toast = document.querySelector("#toast");
}

function exposeReactBridge() {
	window.closetBridge = {
			  addImageFromUrl: addImageFromUrlValue,
			  closeDetail,
			  deleteSelectedItem,
			  duplicateSelectedItem,
		  getAuthSnapshot,
		  getAutocompleteOptions,
	  getChildCategoryOptions,
	  getColorOptions,
	    getFilterSnapshot,
	    getImageUrl,
	    cacheRemoteImage,
		    getMeasurementFieldsForItem,
	    getParentCategoryOptions,
	    isShoeCategory,
	    openItem: selectItem,
	    removeSelectedImage,
    resetFilters,
	    saveImageEdit: saveImageEditFromOptions,
	    saveSelectedItemRating,
	    saveSelectedItem: saveSelectedItemFromData,
    setFilters,
    subscribeFilters,
    getAnalysisItems: () => state.items.map(item => ({...item})),
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

function readTemporaryModePreference() {
  const params = new URLSearchParams(window.location.search);
  const requested = ["guest", "local", "temp", "temporary", "demo", "test"].some((key) => params.has(key));
  if (requested) {
    window.localStorage.setItem(GUEST_MODE_STORAGE_KEY, "1");
    return true;
  }

  return window.localStorage.getItem(GUEST_MODE_STORAGE_KEY) === "1";
}

async function startTemporarySession(options = {}) {
  state.temporary = true;
  window.localStorage.setItem(GUEST_MODE_STORAGE_KEY, "1");

  if (state.db?.name !== TEMP_DB_NAME) {
    state.db?.close?.();
    state.db = await openDatabase();
  }

  state.supabase = null;
  state.supabaseReady = false;
  state.session = null;

  state.pendingItemIds.clear();
  state.pendingDeleteIds.clear();
  state.pendingImageDeletes.clear();
  clearTimeout(state.syncTimer);
  updateSyncButton();

  state.loading = true;
  render();

  await loadLocalItems();
  if (!state.items.length) {
    await importDefaultCsv({ silent: true, useTempImages: true });
  }
  await loadLocalItems();

  state.loading = false;
  render();
  if (!isPublicInformationPath()) {
    navigateToAppRoot({ replace: true });
  }
  if (!options.silent) showToast("게스트 모드가 시작되었습니다. 데이터는 이 기기에만 저장됩니다.");
}

async function exitTemporarySession() {
  window.localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
  state.temporary = false;
  showToast("게스트 모드를 종료했습니다. 새로고침하면 로그인 모드로 돌아갑니다.");
  window.setTimeout(() => window.location.reload(), 650);
}

function getTemporaryImageUrl(index) {
  const urls = Array.isArray(window.WARDROBE_TEMP_IMAGE_URLS) ? window.WARDROBE_TEMP_IMAGE_URLS : [];
  return urls[index % urls.length] || "";
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
    const input = container?.querySelector('input[type="hidden"]');
    if (!container || !input) {
      return;
    }
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
    case "logout":
      requestLogout();
      break;
    case "login":
      requestGoogleLogin();
      break;
    case "start-temporary":
      startTemporarySession();
      break;
    case "exit-temporary":
      exitTemporarySession();
      break;
    case "close-detail":
      closeDetail();
      break;
    case "delete-item":
      deleteSelectedItem();
      break;
    case "duplicate-item":
      duplicateSelectedItem();
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
    case "export-zip":
      exportZipBackup();
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
    default:
      break;
  }
}

async function handleDocumentSubmit(event) {
  const authForm = event.target.closest("#authForm");
  if (authForm) {
    event.preventDefault();
    await requestGoogleLogin();
    return;
  }

  const form = event.target.closest("#itemForm");
  if (!form) return;

  event.preventDefault();
  if (!requireAuthenticatedMutation()) return;
  await saveSelectedItemFromForm(form);
}

async function openDatabase() {
  return storageOpenDatabase({ name: getDatabaseName(), version: DB_VERSION });
}

function getDatabaseName() {
  return state.temporary ? TEMP_DB_NAME : DB_NAME;
}

function dbAll(storeName) {
  return storageAll(state.db, storeName);
}

function dbGet(storeName, key) {
  return storageGet(state.db, storeName, key);
}

function dbPut(storeName, value) {
  return storagePut(state.db, storeName, value);
}

function dbDelete(storeName, key) {
  return storageRemove(state.db, storeName, key);
}

async function dbMetaValue(key) {
  return storageMetaValue(state.db, key);
}

async function dbSetMetaValue(key, value) {
  await storageSetMetaValue(state.db, key, value);
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
	    const normalized = normalizeItemData(item);
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

async function importDefaultCsv(options = {}) {
  try {
    const response = await fetch(`./${encodeURIComponent(DEFAULT_CSV_FILE)}`);
    if (!response.ok) throw new Error(`CSV fetch failed: ${response.status}`);
    const text = await response.text();
    const items = csvToItems(text, { getTemporaryImageUrl, useTempImages: Boolean(options.useTempImages) });
    await upsertItems(items);
    await loadLocalItems();
    if (!options.silent) showToast(`${items.length}개 제품을 CSV에서 가져왔습니다.`);
  } catch (error) {
    console.warn(error);
    if (!options.silent) showToast("CSV 자동 가져오기에 실패했습니다. 파일 선택으로 가져올 수 있습니다.");
  }
}

async function upsertItems(items) {
  for (const item of items) {
    const normalized = normalizeItemData(item);
    const existing = await dbGet("items", normalized.id);
    const merged = existing ? mergeImportedItem(existing, normalized) : normalized;
    await dbPut("items", normalizeItemData(merged));
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
    const items = csvToItems(text, { getTemporaryImageUrl, useTempImages: state.temporary });
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
    : state.filters.parentCategory === "all" ? "전체" : state.filters.parentCategory;
  refs.resultTitle.textContent = title;
  refs.resultCount.textContent = `${items.length}개`;
  refs.itemList.className = state.view === "list" ? "item-grid list" : "item-grid";
  refs.emptyState.hidden = items.length > 0;

  refs.itemList.innerHTML = items
    .map((item) => renderItemCardHtml(item, { primaryImage: getPrimaryImage(item), selectedId: state.selectedId }))
    .join("");
  hydrateImages();
  hydrateRemoteImages();
}

function renderDetail() {
  const item = getSelectedItem();
  if (!item) {
    refs.detailPanel.classList.remove("open");
    refs.detailPanel.hidden = true;
    document.body.classList.remove("modal-open");
    if (state.lastDetailSignature) {
      state.lastDetailSignature = "";
      emitDetailChange(null);
    }
    return;
  }

  refs.detailPanel.hidden = false;
  refs.detailPanel.classList.add("open");
  document.body.classList.add("modal-open");
  const payload = buildDetailPayload(item);
  const signature = detailPayloadSignature(payload);
  if (signature !== state.lastDetailSignature) {
    state.lastDetailSignature = signature;
    emitDetailChange(payload);
  }
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
	    initial: itemInitial(item)
	  };
	}

function emitDetailChange(payload) {
  window.dispatchEvent(new CustomEvent("closet:detail-change", { detail: payload }));
}

function detailPayloadSignature(payload) {
  if (!payload?.item) return "";
  const item = payload.item;
  const primary = payload.primaryImage || {};
  return JSON.stringify({
    item,
    primaryImage: {
      editable: primary.editable,
      edit: primary.edit,
      externalUrl: primary.externalUrl,
      localId: primary.localId,
      remoteId: primary.remoteId,
      remoteUrl: primary.remoteUrl,
      storagePath: primary.storagePath
    },
    childCategoryOptions: payload.childCategoryOptions,
    parentCategoryOptions: payload.parentCategoryOptions,
    colorOptions: payload.colorOptions,
    measurementFields: payload.measurementFields
  });
}

function addCustomMeasureField() {
  const grid = refs.detailPanel.querySelector(".measure-grid");
  if (!grid) return;

  const label = uniqueCustomMeasurementLabel(grid);
  grid.insertAdjacentHTML("beforeend", renderMeasureFieldHtml({ label, custom: true, unit: "cm" }, ""));
  const added = grid.querySelector(`[data-measure-label="${CSS.escape(label)}"]`);
  added?.focus();
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
  return sortChildCategoryOptions(parent, uniqueValues([...defaults, ...fromItems]));
}

function sortChildCategoryOptions(parentCategory, values) {
  const order = CHILD_CATEGORY_ORDER[parentCategory];
  if (!order) return values;

  const orderMap = new Map(order.map((category, index) => [category, index]));
  return [...values].sort((a, b) => {
    const aIndex = orderMap.has(a) ? orderMap.get(a) : Number.POSITIVE_INFINITY;
    const bIndex = orderMap.has(b) ? orderMap.get(b) : Number.POSITIVE_INFINITY;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.localeCompare(b, "ko");
  });
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

function getAuthSnapshot() {
  const user = state.session?.user || null;
  const metadata = user?.user_metadata || {};
  const displayName = cleanText(metadata.full_name || metadata.name || user?.email || "");
  const avatarUrl = cleanText(metadata.avatar_url || metadata.picture || "");
  const status = state.temporary ? "guest" : user ? "signed-in" : "signed-out";

  return {
    status,
    displayName,
    email: cleanText(user?.email || ""),
    avatarUrl,
    syncing: state.syncing,
    supabaseReady: state.supabaseReady,
    hasPendingSync: hasPendingSync(),
    lastSyncedAt: state.lastSyncedAt || "",
    lastSyncError: Boolean(state.lastSyncError),
    itemCount: state.items.length
  };
}

function emitAuthChange() {
  window.dispatchEvent(new CustomEvent("closet:auth-state-change", { detail: getAuthSnapshot() }));
}

function setFilters(nextPartialFilters = {}) {
  const nextFilters = window.closetFilterUtils.applyFilterPatch(state.filters, nextPartialFilters, {
    cleanText,
    normalizeColor,
    getChildCategoryOptions
  });
  if (sameFilterState(state.filters, nextFilters)) return;
  state.filters = nextFilters;
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

function sameFilterState(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function rememberColorOption(color) {
  const value = normalizeColor(color);
  if (!value || DEFAULT_COLOR_OPTIONS.includes(value) || state.colorOptions.includes(value)) return;
  state.colorOptions = uniqueValues([...state.colorOptions, value]);
}

function refreshChildCategorySelect(form, opts = {}) {
  refreshChildCategorySelectControl(form, { ...opts, getChildCategoryOptions });
}

function refreshShoeSizeVisibility(form) {
  refreshShoeSizeVisibilityControl(form, { isShoeCategory });
}

function refreshMeasurementGridFromForm(form) {
  refreshMeasurementGridControl(form, {
    getMeasurementFieldsForItem,
    measureFieldHtml: renderMeasureFieldHtml
  });
}

function getVisibleItems() {
  return window.closetFilterUtils.getVisibleItems(state.items, state.filters, {
    normalizeColor,
    compareDate,
    sortByUpdated
  });
}

function selectItem(id) {
  if (state.draftItem?.id !== id) state.draftItem = null;
  state.selectedId = id;
  renderItemList();
  renderDetail();
}

function closeDetail() {
  if (state.draftItem?.id === state.selectedId) state.draftItem = null;
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
    rating: null,
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

  state.draftItem = item;
  state.selectedId = item.id;
  render();
}

async function duplicateSelectedItem() {
  if (!requireAuthenticatedMutation()) return { ok: false };
  const item = getSelectedItem();
  if (!item) return { ok: false };

  if (isDraftItem(item)) {
    showToast("제품 정보를 먼저 저장한 뒤 복제해 주세요.");
    return { ok: false };
  }

  const now = new Date().toISOString();
  const measurements = { ...(item.measurements || {}) };
  const duplicated = normalizeItemData({
    ...item,
    id: `item-${crypto.randomUUID()}`,
    measurements,
    measurementsDirty: Object.keys(measurements).length > 0,
    imageIds: [],
    primaryImageId: null,
    remoteImages: [],
    imagesDirty: false,
    externalImageUrl: item.externalImageUrl || "",
    externalImageEdit: normalizeImageEdit(item.externalImageEdit || defaultImageEdit()),
    source: "manual",
    raw: {
      ...(item.raw || {}),
      duplicatedFrom: item.id
    },
    createdAt: now,
    updatedAt: now
  });

  state.draftItem = duplicated;
  state.selectedId = duplicated.id;
  render();
  showToast("복제본을 만들었습니다. 필요한 항목을 수정한 뒤 저장해 주세요.");
  return { ok: true, item: clonePlainItem(duplicated) };
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
	    rating: normalizeRating(formData.get("rating")),
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

async function saveSelectedItemFromData(data, options = {}) {
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
	    rating: normalizeRating(data.rating),
	    measurements: sanitizeMeasurementData(data.measurements),
    updatedAt: new Date().toISOString()
  };
  updated.measurementsDirty = item.measurementsDirty || !sameMeasurements(item.measurements, updated.measurements);

  await saveItem(updated);
  rememberColorOption(updated.color);
  replaceLocalItem(updated);
  render();
  if (!options.silent) showToast("저장했습니다.");
  queueAutoSyncItem(updated.id);
  return { ok: true, item: clonePlainItem(updated) };
}

async function saveSelectedItemRating(value) {
  if (!requireAuthenticatedMutation()) return { ok: false };
  const item = getSelectedItem();
  if (!item) return { ok: false };

  const updated = {
    ...item,
    rating: normalizeRating(value),
    updatedAt: new Date().toISOString()
  };

  if (isDraftItem(item)) {
    state.draftItem = updated;
    render();
    return { ok: true, item: clonePlainItem(updated) };
  }

  await saveItem(updated);
  replaceLocalItem(updated);
  render();
  queueAutoSyncItem(updated.id);
  await persistPendingSync();
  await syncQueuedChanges({ silent: true });
  return { ok: true, item: clonePlainItem(updated) };
}

async function saveItem(item) {
  await dbPut("items", normalizeItemData(item));
}

function replaceLocalItem(item) {
  item = normalizeItemData(item);
  if (state.draftItem?.id === item.id) state.draftItem = null;
  const index = state.items.findIndex((candidate) => candidate.id === item.id);
  if (index >= 0) state.items[index] = item;
  else state.items.unshift(item);
}

async function deleteSelectedItem() {
  if (!requireAuthenticatedMutation()) return;
  const item = getSelectedItem();
  if (!item) return;

  if (isDraftItem(item)) {
    state.draftItem = null;
    state.selectedId = null;
    render();
    return;
  }

  const confirmed = window.confirm(`"${item.name}" 제품을 삭제할까요?`);
  if (!confirmed) return;

  await queueDeleteItemImages(item);

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

async function uploadSelectedImageFile(file, itemData) {
  if (!requireAuthenticatedMutation()) return { ok: false };
  let item = getSelectedItem();
  if (!file || !item) return { ok: false };
  item = await ensureSelectedItemSavedForImage(itemData);
  if (!item) return { ok: false };

  const image = await compressImage(file, item.id);
  await dbPut("images", image);
  await queueDeleteItemImages(item, [image.id]);

  const updated = {
    ...item,
    imageIds: [image.id],
    primaryImageId: image.id,
    remoteImages: [],
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

async function addImageFromUrlValue(value, itemData) {
  if (!requireAuthenticatedMutation()) return { ok: false };
  let item = getSelectedItem();
  const url = normalizeImageUrl(value);
  if (!item) return { ok: false };
  if (!url) {
    showToast("올바른 이미지 URL을 입력해 주세요.");
    return { ok: false };
  }
  item = await ensureSelectedItemSavedForImage(itemData);
  if (!item) return { ok: false };

  await attachExternalImageUrl(item, url);
  return { ok: true };
}

async function ensureSelectedItemSavedForImage(itemData) {
  let item = getSelectedItem();
  if (!item) return null;
  if (!isDraftItem(item)) return item;

  if (!itemData) {
    showToast("제품 정보를 먼저 저장한 뒤 이미지를 추가해 주세요.");
    return null;
  }

  const result = await saveSelectedItemFromData(itemData, { silent: true });
  if (!result?.ok) return null;
  return getSelectedItem() || result.item || null;
}

async function attachImageToItem(item, image, message) {
  await dbPut("images", image);
  await queueDeleteItemImages(item, [image.id]);

  const updated = {
    ...item,
    imageIds: [image.id],
    primaryImageId: image.id,
    remoteImages: [],
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
  await queueDeleteItemImages(item);

  const updated = {
    ...item,
    imageIds: [],
    primaryImageId: null,
    remoteImages: [],
    imagesDirty: true,
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
  if (isDraftItem(item)) {
    showToast("제품 정보를 먼저 저장한 뒤 이미지 편집을 저장해 주세요.");
    return { ok: false };
  }
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
  if (isDraftItem(item)) return;
  const primary = getPrimaryImage(item);

  const hasImage = Boolean(item.externalImageUrl || item.primaryImageId || (item.imageIds || []).length || primary.remoteId || (item.remoteImages || []).length);
  if (!hasImage) return;

  await queueDeleteItemImages(item);

  const clearedItem = {
    ...item,
    imageIds: [],
    primaryImageId: null,
    remoteImages: [],
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

  await saveItem(clearedItem);
  replaceLocalItem(clearedItem);
  render();
  showToast("사진을 삭제했습니다.");
  queueAutoSyncItem(clearedItem.id);
}

async function hydrateImages() {
  const slots = Array.from(document.querySelectorAll("[data-image-id]"));
  for (const slot of slots) {
    const imageId = slot.dataset.imageId;
    if (!imageId) continue;

    try {
      const url = await getImageUrl(imageId);
      if (!url) continue;

      applyImageUrl(slot, url);
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

async function hydrateRemoteImages() {
  const slots = Array.from(document.querySelectorAll("[data-remote-image-id]"));
  const seen = new Set();

  for (const slot of slots) {
    const imageId = slot.dataset.remoteImageId;
    const itemId = slot.dataset.remoteItemId;
    if (!imageId || !itemId) continue;

    const key = `${itemId}:${imageId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const url = await cacheRemoteImage(itemId, imageId);
      const fallbackUrl = slot.dataset.remoteUrl || "";
      const imageUrl = url || fallbackUrl;
      if (!imageUrl) continue;

      slots
        .filter((candidate) => candidate.dataset.remoteItemId === itemId && candidate.dataset.remoteImageId === imageId)
        .forEach((candidate) => applyImageUrl(candidate, imageUrl));
    } catch (error) {
      console.warn("Remote image cache failed", error);
    }
  }
}

async function cacheRemoteImage(itemId, imageId) {
  const item = state.items.find((candidate) => candidate.id === itemId) || (getSelectedItem()?.id === itemId ? getSelectedItem() : null);
  const remote = (item?.remoteImages || []).find((candidate) => candidate?.id === imageId);
  if (!item || !remote) return "";

  const cacheKey = `${item.id}:${remote.id}`;
  if (state.remoteImageCachePromises.has(cacheKey)) return state.remoteImageCachePromises.get(cacheKey);

  const promise = cacheRemoteImageUncached(item, remote)
    .finally(() => state.remoteImageCachePromises.delete(cacheKey));
  state.remoteImageCachePromises.set(cacheKey, promise);
  return promise;
}

async function cacheRemoteImageUncached(item, remote) {
  const existing = await dbGet("images", remote.id);
  if (existing?.blob && (!existing.cachedFromRemote || isFreshRemoteImageCache(existing, remote, item.updatedAt))) {
    await promoteCachedRemoteImage(item, remote);
    return getImageUrl(remote.id);
  }

  const fallbackRecord = existing?.blob ? existing : null;
  const remoteUrl = remoteImageUrl(remote);
  if (!remoteUrl) return fallbackRecord ? getImageUrl(remote.id) : "";
  const locator = normalizeImageLocator(remote);

  try {
    const response = await fetch(remoteUrl, { mode: "cors", cache: "force-cache" });
    if (!response.ok) throw new Error(`Remote image fetch failed: ${response.status}`);

    const blob = await response.blob();
    const cached = {
      id: remote.id,
      itemId: item.id,
      blob,
      mime: blob.type || remote.mime || "image/webp",
      width: remote.width || existing?.width || null,
      height: remote.height || existing?.height || null,
      storagePath: locator.storagePath,
      storageProvider: locator.storageProvider,
      storageBucket: locator.storageBucket,
      needsUpload: false,
      cachedFromRemote: true,
      remoteItemUpdatedAt: item.updatedAt || "",
      createdAt: existing?.createdAt || new Date().toISOString(),
      cachedAt: new Date().toISOString()
    };

    await dbPut("images", cached);
    revokeImageUrl(remote.id);
    await promoteCachedRemoteImage(item, remote);
    return getImageUrl(remote.id);
  } catch (error) {
    console.warn("Remote image could not be cached", error);
    return fallbackRecord ? getImageUrl(remote.id) : "";
  }
}

async function promoteCachedRemoteImage(item, remote) {
  const current = state.items.find((candidate) => candidate.id === item.id);
  if (!current || (current.primaryImageId && current.primaryImageId !== remote.id)) return;

  const updated = {
    ...current,
    imageIds: uniqueValues([remote.id, ...(current.imageIds || [])]),
    primaryImageId: current.primaryImageId || remote.id,
    imagesDirty: false
  };

  await dbPut("items", normalizeItemData(updated));
  replaceLocalItem(updated);
}

async function resolveLocalImageState(existing, remoteImages, itemUpdatedAt) {
  if (!existing) return { imageIds: [], primaryImageId: null };

  const remoteById = new Map((remoteImages || []).filter((remote) => remote?.id).map((remote) => [remote.id, remote]));
  const imageIds = [];

  for (const imageId of existing.imageIds || []) {
    if (!imageId) continue;

    const record = await dbGet("images", imageId);
    if (record?.cachedFromRemote) {
      const remote = remoteById.get(imageId);
      if (remote && isFreshRemoteImageCache(record, remote, itemUpdatedAt)) {
        imageIds.push(imageId);
      }
      continue;
    }

    imageIds.push(imageId);
  }

  const uniqueImageIds = uniqueValues(imageIds);
  let primaryImageId = uniqueImageIds.includes(existing.primaryImageId) ? existing.primaryImageId : null;
  if (!primaryImageId) {
    const primaryRemote = (remoteImages || []).find((remote) => remote?.isPrimary && uniqueImageIds.includes(remote.id));
    primaryImageId = primaryRemote?.id || uniqueImageIds[0] || null;
  }

  return { imageIds: uniqueImageIds, primaryImageId };
}

function getSelectedItem() {
  if (state.draftItem?.id === state.selectedId) return state.draftItem;
  return state.items.find((item) => item.id === state.selectedId);
}

function isDraftItem(item) {
  return Boolean(item && state.draftItem?.id === item.id);
}

function exportJson() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: state.items.map(sanitizeItemForExport)
  };
  window.closetCsvUtils.downloadFile(`closet-backup-${window.closetCsvUtils.dateStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
}

async function exportZipBackup() {
  try {
    showToast("이미지 포함 백업을 준비하고 있습니다.");

    const { zipBlob, skippedImages } = await createZipBackup(state.items, {
      defaultImageEdit,
      getImageRecord: (imageId) => dbGet("images", imageId),
      getRemoteImageUrl: (remoteImage) => getBackupRemoteImageUrl(remoteImage, state.supabase),
      normalizeImageEdit
    });

    downloadBlob(`closet-backup-${window.closetCsvUtils.dateStamp()}.zip`, zipBlob);
    const skippedCount = skippedImages.length;
    showToast(skippedCount ? `ZIP 백업을 내보냈습니다. 이미지 ${skippedCount}개는 포함하지 못했습니다.` : "ZIP 백업을 내보냈습니다.");
  } catch (error) {
    console.error(error);
    showToast("ZIP 백업을 만들지 못했습니다.");
  }
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
	    "평점",
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
	    item.rating ?? "",
	    item.productUrl,
    item.memo,
    ...MEASURE_FIELDS.map((field) => item.measurements?.[field] ?? "")
  ]);

  const csv = window.closetCsvUtils.buildCsv([headers, ...rows]);
  window.closetCsvUtils.downloadFile(`closet-${window.closetCsvUtils.dateStamp()}.csv`, csv, "text/csv;charset=utf-8");
}

async function initSupabase() {
  if (state.temporary) {
    state.supabase = null;
    state.supabaseReady = false;
    state.session = null;
    updateSyncButton();
    return;
  }

  const config = window.WARDROBE_CONFIG || {};
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    state.supabaseReady = false;
    updateSyncButton();
    return;
  }

  try {
    const createClient = window.WARDROBE_SUPABASE_CREATE_CLIENT;
    state.supabase = createSupabaseClient(config, createClient);
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

      const previousSession = state.session;
      const sameUser = Boolean(previousSession?.user?.id && session?.user?.id === previousSession.user.id);
      state.session = session || null;
      updateSyncButton();
      if (session) {
        resetSupabaseLookupCaches();
        state.authPrompted = false;
        navigateToAppRoot({ replace: true });
        if (!sameUser || event === "USER_UPDATED") {
          resumeAuthenticatedSession();
        }
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

function shouldInitializeSupabaseOnBoot() {
  if (state.temporary) return false;
  return hasSupabaseAuthCallback() || hasCachedSupabaseSession();
}

function hasSupabaseAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.has("code") || hashParams.has("access_token") || hashParams.has("refresh_token");
}

function hasCachedSupabaseSession() {
  const config = window.WARDROBE_CONFIG || {};
  if (!config.supabaseUrl || !config.supabaseAnonKey) return false;

  const keys = [];
  try {
    const projectRef = new URL(config.supabaseUrl).hostname.split(".")[0];
    if (projectRef) keys.push(`sb-${projectRef}-auth-token`);
  } catch (error) {
    console.warn("Supabase URL could not be parsed for cached session detection", error);
  }

  try {
    if (keys.some((key) => window.localStorage.getItem(key))) return true;
    return Object.keys(window.localStorage).some((key) => /^sb-.+-auth-token$/.test(key));
  } catch (error) {
    console.warn("Cached Supabase session could not be read", error);
    return false;
  }
}

function updateSyncButton() {
  emitAuthChange();
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
  return !isPublicInformationPath() && !state.temporary && !state.session;
}

function requireAuthenticatedMutation() {
  if (state.temporary || state.session) return true;
  showAuthDialog();
  showToast("로그인 후 사용할 수 있습니다.");
  return false;
}

function showAuthDialog(options = {}) {
  if (!shouldRequireAuth()) return;
  if (options.once && state.authPrompted) return;

  state.authPrompted = true;
  navigateToLogin({ replace: true });
}

function navigateToLogin(options = {}) {
  if (window.location.pathname === "/login") return;
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method]({}, "", "/login");
  window.dispatchEvent(new Event("popstate"));
}

function navigateToAppRoot(options = {}) {
  if (window.location.pathname === "/") return;
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method]({}, "", "/");
  window.dispatchEvent(new Event("popstate"));
}

function isPublicInformationPath(pathname = window.location.pathname) {
  return PUBLIC_INFORMATION_PATHS.has(pathname);
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
  if (state.temporary) return;
  state.pendingDeleteIds.delete(itemId);
  state.pendingItemIds.add(itemId);
  schedulePendingSyncPersist();
  scheduleAutoSync();
}

function queueAutoSyncItems(itemIds) {
  if (state.temporary) return;
  itemIds.filter(Boolean).forEach((itemId) => {
    state.pendingDeleteIds.delete(itemId);
    state.pendingItemIds.add(itemId);
  });
  schedulePendingSyncPersist();
  scheduleAutoSync();
}

function queueAutoDelete(itemId) {
  if (!itemId) return;
  if (state.temporary) return;
  state.pendingItemIds.delete(itemId);
  state.pendingDeleteIds.add(itemId);
  schedulePendingSyncPersist();
  scheduleAutoSync();
}

async function queueDeleteItemImages(item, keepImageIds = []) {
  if (!item) return;
  const keep = new Set((keepImageIds || []).filter(Boolean));
  const remoteById = new Map((item.remoteImages || []).filter((remote) => remote?.id).map((remote) => [remote.id, remote]));
  const queued = new Set();

  for (const imageId of item.imageIds || []) {
    if (!imageId || keep.has(imageId) || queued.has(imageId)) continue;
    const image = await dbGet("images", imageId);
    const remote = remoteById.get(imageId);
    queueAutoDeleteImage(imageId, image?.storagePath ? image : remote || "");
    await dbDelete("images", imageId);
    revokeImageUrl(imageId);
    queued.add(imageId);
  }

  for (const remote of item.remoteImages || []) {
    const imageId = remote?.id;
    if (!imageId || keep.has(imageId) || queued.has(imageId)) continue;
    queueAutoDeleteImage(imageId, remote);
    queued.add(imageId);
  }
}

function queueAutoDeleteImage(imageId, storageLocator = "") {
  if (!imageId) return;
  if (state.temporary) return;
  state.pendingImageDeletes.set(imageId, storageLocator);
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
      await deleteSupabaseImage(state.supabase, imageId, storagePath);
      state.pendingImageDeletes.delete(imageId);
      await persistPendingSync();
    }

    for (const itemId of [...state.pendingDeleteIds]) {
      await deleteSupabaseItem(state.supabase, itemId);
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
  const wasTemporary = state.temporary;
  if (wasTemporary) {
    state.temporary = false;
    window.localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
    emitAuthChange();
  }

  if (!state.supabase) {
    await initSupabase();
  }

  if (!state.supabase) {
    if (wasTemporary) {
      state.temporary = true;
      window.localStorage.setItem(GUEST_MODE_STORAGE_KEY, "1");
      emitAuthChange();
    }
    showToast("Supabase 설정 또는 네트워크 연결을 확인해주세요.");
    return;
  }

  const { error } = await signInWithGoogle(state.supabase, `${window.location.origin}${window.location.pathname}`);

  if (error) {
    showToast(error.message);
    return;
  }
}

async function requestLogout() {
  if (!state.supabase || !state.session) return;

  try {
    if (hasPendingSync()) {
      await syncQueuedChanges({ silent: true });
    }

    const { error } = await signOutOfSupabase(state.supabase);
    if (error) {
      showToast(error.message);
      return;
    }

    showToast("로그아웃했습니다.");
  } finally {
    updateSyncButton();
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
      await deleteSupabaseImage(state.supabase, imageId, storagePath);
    }
    for (const itemId of [...state.pendingDeleteIds]) {
      await deleteSupabaseItem(state.supabase, itemId);
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
  if (SYNC_CATEGORY_ROWS) {
    await ensureSupabaseCategoryRowsForItem(state.supabase, item, userId, {
      categoryCache: state.categoryCache,
      cleanText
    });
  }
  await ensureColorRowForItem(item, userId);
  const row = supabaseItemToRow(item, userId, { normalizeRating });

  const { ratingColumnAvailable } = await upsertSupabaseItem(state.supabase, row);
  state.ratingColumnAvailable = ratingColumnAvailable;

  await pushMeasurementsToSupabase(item);

  await pushImagesToSupabase(item, userId);
}

async function pushMeasurementsToSupabase(item) {
  if (!item.measurementsDirty) return;

  await replaceSupabaseMeasurements(state.supabase, item, MEASUREMENT_BY_LABEL);

  const cleanItem = { ...item, measurementsDirty: false };
  item.measurementsDirty = false;
  await dbPut("items", cleanItem);
  replaceLocalItem(cleanItem);
}

async function ensureColorRowForItem(item, userId) {
  const name = cleanText(item.color);
  if (!name) return;
  rememberColorOption(name);

  if (DEFAULT_COLOR_OPTIONS.includes(name)) return;

  try {
    await findOrCreateSupabaseColor(state.supabase, state.colorCache, name, userId);
  } catch (error) {
    if (isMissingRelationError(error)) {
      console.warn("colors table is not available yet. Run supabase/schema.sql to persist custom color options.", error);
      return;
    }
    throw error;
  }
}

function hydrateColorOptions(rows) {
  state.colorOptions = uniqueValues((rows || []).map((row) => normalizeColor(row.name)));
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

  hydrateMeasurementDefinitionIds(await fetchMeasurementDefinitions(state.supabase));
}

async function pushImagesToSupabase(item, userId) {
  const imageIds = item.imageIds || [];
  const images = [];

  for (const imageId of imageIds) {
    const image = await dbGet("images", imageId);
    if (!image?.blob) continue;
    images.push(image);
  }

  const { uploadedImages, itemImagesDirty } = await uploadItemImages(state.supabase, item, userId, images);
  if (!uploadedImages.length && itemImagesDirty === item.imagesDirty) return;

  for (const image of uploadedImages) {
    await dbPut("images", image);
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
  const {
    colorRows,
    definitionRows,
    imageRows,
    incremental,
    itemRows,
    measureRows,
    pulledAt
  } = await fetchPullData(state.supabase, { since });

  if (!incremental) {
    hydrateMeasurementDefinitionIds(definitionRows);
    hydrateColorOptions(colorRows);
  }

  const measurementsByItem = groupBy(measureRows, "item_id");
  const imagesByItem = groupBy(imageRows, "item_id");
  const signedUrlByPath = await createSignedImageUrlMap(state.supabase, imageRows);
  const remoteIds = new Set(itemRows.map((row) => row.id));

  if (!incremental) {
    await pruneLocalItems(remoteIds);
  }

  for (const row of itemRows) {
    const remoteImages = (imagesByItem.get(row.id) || []).map((image) => {
      const locator = normalizeImageLocator({
        storagePath: image.storage_path,
        storageProvider: image.storage_provider,
        storageBucket: image.storage_bucket
      });
      const signedUrl = signedUrlByPath.get(remoteImageCacheKey(locator)) || signedUrlByPath.get(locator.storagePath) || "";
      return remoteImageFromRow(image, signedUrl);
    });

    const existing = await dbGet("items", row.id);
    const localImageState = await resolveLocalImageState(existing, remoteImages, row.updated_at);
    const item = supabaseItemFromRow(row, {
      cleanText,
      defaultImageEdit,
      existing,
      localImageState,
      measurementsByItem,
      normalizeColor,
      normalizeImageEdit,
      normalizeRating,
      remoteImages
    });

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

let toastTimer = null;
function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => refs.toast.classList.remove("show"), 2600);
}
