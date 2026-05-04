"use strict";

(function exposeClosetExportUtils() {
  function normalizeRating(value) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1 || number > 5) return 0;
    return number;
  }

  function defaultImageEdit() {
    return { scale: 1, offsetX: 0, offsetY: 0 };
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
      rating: normalizeRating(item.rating),
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

  async function fetchBackupImageBlob(url) {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
    return response.blob();
  }

  function backupImagePath(itemId, imageId, mime) {
    return `images/${safeZipPathSegment(itemId)}/${safeZipPathSegment(imageId)}${extensionForMime(mime)}`;
  }

  function safeZipPathSegment(value) {
    return String(value ?? "")
      .trim()
      .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "_")
      .replace(/^\.+$/, "_")
      .slice(0, 120) || "unknown";
  }

  function extensionForMime(mime) {
    const normalized = String(mime ?? "").trim().toLowerCase().split(";")[0];
    if (normalized === "image/jpeg") return ".jpg";
    if (normalized === "image/png") return ".png";
    if (normalized === "image/gif") return ".gif";
    if (normalized === "image/avif") return ".avif";
    if (normalized === "image/svg+xml") return ".svg";
    if (normalized === "image/webp") return ".webp";
    return ".bin";
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function createZipBlob(files) {
    const encoder = new TextEncoder();
    const parts = [];
    const centralParts = [];
    let offset = 0;

    for (const file of files) {
      const data = new Uint8Array(await file.blob.arrayBuffer());
      const nameBytes = encoder.encode(file.name.replace(/\\/g, "/"));
      const crc = crc32(data);
      const date = file.lastModified ? new Date(file.lastModified) : new Date();
      const dosTime = toDosTime(date);
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(localHeader.buffer);

      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, dosTime.time, true);
      localView.setUint16(12, dosTime.date, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, data.byteLength, true);
      localView.setUint32(22, data.byteLength, true);
      localView.setUint16(26, nameBytes.length, true);
      localHeader.set(nameBytes, 30);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, dosTime.time, true);
      centralView.setUint16(14, dosTime.date, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, data.byteLength, true);
      centralView.setUint32(24, data.byteLength, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint32(42, offset, true);
      centralHeader.set(nameBytes, 46);

      parts.push(localHeader, data);
      centralParts.push(centralHeader);
      offset += localHeader.byteLength + data.byteLength;
    }

    const centralStart = offset;
    const centralSize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, centralStart, true);

    return new Blob([...parts, ...centralParts, endRecord], { type: "application/zip" });
  }

  function toDosTime(date) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
  }

  const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < table.length; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1;
      }
      table[index] = value >>> 0;
    }
    return table;
  })();

  function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (const byte of data) {
      crc = CRC32_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  window.closetExportUtils = {
    backupImagePath,
    createZipBlob,
    decodeSharePayload,
    downloadBlob,
    encodeSharePayload,
    fetchBackupImageBlob,
    sanitizeItemForExport
  };
})();
