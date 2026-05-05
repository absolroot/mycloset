"use strict";

(function exposeClosetFormUtils() {
  const {
    cleanText,
    escapeAttr,
    escapeHtml,
    parseNumber
  } = window.closetFormatUtils;

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

  function refreshChildCategorySelect(form, options = {}) {
    const childSelect = form?.querySelector('[data-category-select="child"]');
    if (!childSelect) return;

    const previous = readCategoryValue(form, "category");
    const parent = readCategoryValue(form, "parentCategory");
    const categoryOptions = options.getChildCategoryOptions(parent);
    const keepPrevious = previous && categoryOptions.includes(previous);
    const useCustom = previous && !options.resetInvalid && !keepPrevious;
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

  function refreshShoeSizeVisibility(form, options = {}) {
    const field = form?.querySelector(".shoe-size-field");
    if (!field) return;

    const parentCategory = readCategoryValue(form, "parentCategory");
    const category = readCategoryValue(form, "category");
    const visible = options.isShoeCategory({ parentCategory, category });
    field.classList.toggle("is-hidden", !visible);
    const input = field.querySelector("[name='shoeSize']");
    if (input && !visible) input.value = "";
  }

  function refreshMeasurementGridFromForm(form, options = {}) {
    const grid = form?.querySelector(".measure-grid");
    if (!grid) return;

    const measurements = collectMeasurementsFromForm(form);
    const item = {
      parentCategory: readCategoryValue(form, "parentCategory"),
      category: readCategoryValue(form, "category"),
      measurements
    };
    grid.innerHTML = options.getMeasurementFieldsForItem(item)
      .map((field) => options.measureFieldHtml(field, measurements[field.label]))
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

  window.closetFormUtils = {
    collectMeasurementsFromForm,
    readCategoryValue,
    refreshChildCategorySelect,
    refreshMeasurementGridFromForm,
    refreshShoeSizeVisibility,
    syncCategoryCustomInput,
    uniqueCustomMeasurementLabel
  };
})();
