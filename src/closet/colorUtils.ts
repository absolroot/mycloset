export const COLOR_MAP: Record<string, string> = {
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
  골드: "#c6a15b",
}

export function normalizeColorName(value?: string) {
  const first = String(value || "").split(/[,，]/)[0]?.trim() || ""
  if (first === "그레이" || first === "실버") return "그레이/실버"
  return first
}

export function colorToHex(color: string) {
  const raw = String(color || "").trim()
  const rawDirect = COLOR_MAP[raw]
  if (rawDirect) return rawDirect

  const value = normalizeColorName(raw)
  const direct = COLOR_MAP[value]
  if (direct) return direct
  const found = Object.keys(COLOR_MAP).find((key) => value.includes(key))
  return found ? COLOR_MAP[found] : "#c4c7c5"
}
