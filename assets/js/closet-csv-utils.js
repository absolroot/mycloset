"use strict";

(function exposeClosetCsvUtils() {
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

  function buildCsv(rows) {
    return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  }

  function csvEscape(value) {
    const text = escapeSpreadsheetFormula(String(value ?? ""));
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function escapeSpreadsheetFormula(value) {
    return /^[\t\r\n =+\-@]/.test(value) ? `'${value}` : value;
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

  function dateStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  window.closetCsvUtils = {
    parseCsv,
    buildCsv,
    downloadFile,
    dateStamp
  };
})();
