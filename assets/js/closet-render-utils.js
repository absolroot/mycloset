"use strict";

(function exposeClosetRenderUtils() {
  const {
    colorToHex,
    escapeAttr,
    escapeHtml
  } = window.closetFormatUtils;

  function normalizeRating(value) {
    if (value === null || value === undefined || value === "") return null;
    const rating = Number(value);
    return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
  }

  function itemInitial(item) {
    return (item.brand || item.name || "?").trim().slice(0, 1).toUpperCase();
  }

  function renderItemCard(item, options = {}) {
    const primaryImage = options.primaryImage || {};
    const active = item.id === options.selectedId ? " active" : "";
    const archived = item.owned ? "" : " is-archived";
    const colorStyle = `--dot:${colorToHex(item.color)}`;
    const title = item.name || "이름 없는 제품";
    const meta = [item.sizeLabel, item.category].filter(Boolean).join(" · ");

    return `
      <button class="item-tile${active}${archived}" data-action="select-item" data-id="${escapeAttr(item.id)}" type="button">
        ${renderImageSlot(item, primaryImage)}
        <div class="item-title">
          ${item.brand ? `<span class="item-brand">${escapeHtml(item.brand)}</span>` : ""}
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(meta || "정보 없음")}</p>
          <div class="chip-row">
            ${item.color ? `<span class="chip"><span class="color-dot" style="${escapeAttr(colorStyle)}"></span>${escapeHtml(item.color)}</span>` : ""}
            ${item.parentCategory ? `<span class="chip">${escapeHtml(item.parentCategory)}</span>` : ""}
            ${renderRatingChip(item.rating)}
          </div>
        </div>
        ${renderPriceLine(item)}
      </button>
    `;
  }

  function renderRatingChip(value) {
    const rating = normalizeRating(value);
    if (!rating) return "";
    return `<span class="chip rating-chip" aria-label="평점 ${rating}점"><span aria-hidden="true">★</span>${rating}</span>`;
  }

  function hasPurchasePrice(value) {
    return value !== null && value !== undefined && String(value).trim() !== "" && Number.isFinite(Number(value));
  }

  function formatPurchasePriceLabel(value) {
    return hasPurchasePrice(value) ? formatWonSuffix(Number(value)) : "가격 없음";
  }

  function formatWonSuffix(value) {
    return `${Number(value).toLocaleString("ko-KR")}원`;
  }

  function renderPriceLine(item) {
    const hasRetail = hasPurchasePrice(item.retailPrice);
    const hasPurchase = hasPurchasePrice(item.purchasePrice);
    const retailPrice = Number(item.retailPrice);
    const purchasePrice = Number(item.purchasePrice);

    if (hasRetail && hasPurchase && retailPrice !== purchasePrice) {
      return `
        <div class="price-line price-line-stacked">
          <span class="price-retail">${escapeHtml(formatWonSuffix(retailPrice))}</span>
          <span class="price-purchase">${escapeHtml(formatWonSuffix(purchasePrice))}</span>
        </div>
      `;
    }

    return `<div class="price-line">${escapeHtml(formatPurchasePriceLabel(item.purchasePrice))}</div>`;
  }

  function renderImageSlot(item, primaryImage) {
    if (primaryImage.externalUrl && primaryImage.remoteUrl) {
      const imageStyle = `background-image:url("${primaryImage.remoteUrl}")`;
      return `<div class="image-slot" style="${escapeAttr(imageStyle)}"></div>`;
    }

    if (primaryImage.remoteUrl) {
      return `<div class="image-slot" data-remote-item-id="${escapeAttr(item.id)}" data-remote-image-id="${escapeAttr(primaryImage.remoteId || "")}" data-remote-url="${escapeAttr(primaryImage.remoteUrl)}"></div>`;
    }

    if (primaryImage.localId) {
      return `<div class="image-slot" data-image-id="${escapeAttr(primaryImage.localId)}"></div>`;
    }

    return `<div class="image-slot placeholder">${escapeHtml(itemInitial(item))}</div>`;
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

  window.closetRenderUtils = {
    itemInitial,
    measureFieldHtml,
    renderItemCard,
    renderPriceLine
  };
})();
