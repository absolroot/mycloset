import { useEffect, useId, useMemo, useRef, useState } from "react"
import { CalendarIcon, ImagePlus, LinkIcon, Plus, Save, Share2, SlidersHorizontal, Trash2, X } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"

const NONE_VALUE = "__closet_none__"
const CUSTOM_VALUE = "__custom__"
const COLOR_MAP: Record<string, string> = {
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
  퍼플: "#6f42c1",
  "와인/퍼플": "linear-gradient(135deg, #7b1f32 0 50%, #6f42c1 50% 100%)",
  핑크: "#f4a6b8",
  옐로우: "#fbbc04",
  오렌지: "#f29900",
  골드: "#c6a15b",
}

type ImageEdit = {
  offsetX: number
  offsetY: number
  scale: number
}

type PrimaryImage = {
  editable: boolean
  edit: ImageEdit
  externalUrl: boolean
  localId: string
  remoteId?: string
  remoteUrl: string
  storagePath?: string
}

type ClosetItem = {
  brand: string
  category: string
  color: string
  externalImageEdit?: ImageEdit
  externalImageUrl?: string
  id: string
  measurements?: Record<string, number | string>
  memo: string
  name: string
  owned: boolean
  parentCategory: string
  productUrl: string
  purchaseDate: string
  purchasePrice: number | null
  retailPrice: number | null
  shoeSize: string
  sizeLabel: string
}

type MeasurementField = {
  custom?: boolean
  key?: string
  label: string
  unit?: string
}

type MeasurementRow = MeasurementField & {
  value: string
}

type DetailPayload = {
  autocompleteOptions?: Partial<Record<AutocompleteField, string[]>>
  childCategoryOptions: string[]
  colorOptions?: string[]
  initial: string
  item: ClosetItem
  measurementFields: MeasurementField[]
  parentCategoryOptions: string[]
  primaryImage: PrimaryImage
}

type DetailForm = {
  brand: string
  category: string
  color: string
  memo: string
  name: string
  owned: boolean
  parentCategory: string
  productUrl: string
  purchaseDate: string
  purchasePrice: string
  retailPrice: string
  shoeSize: string
  sizeLabel: string
}

type AutocompleteField = "brand" | "sizeLabel" | "shoeSize"

type ClosetBridge = {
  addImageFromUrl: (url: string) => Promise<unknown>
  closeDetail: () => void
  deleteSelectedItem: () => Promise<unknown>
  getChildCategoryOptions: (parentCategory: string) => string[]
  getAutocompleteOptions: (field?: AutocompleteField) => string[] | Partial<Record<AutocompleteField, string[]>>
  getColorOptions: () => string[]
  getFilterSnapshot?: () => unknown
  getImageUrl: (imageId: string) => Promise<string>
  getMeasurementFieldsForItem: (item: Partial<Omit<ClosetItem, "measurements">> & { measurements?: Record<string, unknown> }) => MeasurementField[]
  getParentCategoryOptions: () => string[]
  isShoeCategory: (item: Partial<ClosetItem>) => boolean
  removeSelectedImage: () => Promise<unknown>
  resetFilters?: () => void
  saveImageEdit: (edit: ImageEdit) => Promise<unknown>
  saveSelectedItem: (item: DetailForm & { measurements: Record<string, string> }) => Promise<unknown>
  setFilters?: (nextPartialFilters: unknown) => void
  shareSelectedItem: () => Promise<unknown> | void
  subscribeFilters?: (listener: (snapshot: unknown) => void) => () => void
  uploadImageFile: (file: File) => Promise<unknown>
}

declare global {
  interface Window {
    closetBridge?: ClosetBridge
  }
}

function itemToForm(item: ClosetItem): DetailForm {
  return {
    brand: item.brand || "",
    category: item.category || "",
    color: normalizeColorName(item.color),
    memo: item.memo || "",
    name: item.name || "",
    owned: Boolean(item.owned),
    parentCategory: item.parentCategory || "",
    productUrl: item.productUrl || "",
    purchaseDate: item.purchaseDate || "",
    purchasePrice: priceToInput(item.purchasePrice),
    retailPrice: priceToInput(item.retailPrice),
    shoeSize: item.shoeSize || "",
    sizeLabel: item.sizeLabel || "",
  }
}

function priceToInput(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return ""
  return Number(value).toLocaleString("ko-KR")
}

function dateFromString(value: string) {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function dateToString(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function buildMeasurementRows(fields: MeasurementField[], measurements: Record<string, unknown> = {}): MeasurementRow[] {
  return fields.map((field) => {
    const value = measurements[field.label]
    return {
      ...field,
      value: value === null || value === undefined ? "" : String(value),
    }
  })
}

function rowsToMeasurements(rows: MeasurementRow[]) {
  return rows.reduce<Record<string, string>>((acc, row) => {
    const label = row.label.trim()
    const value = row.value.trim()
    if (label && value) acc[label] = value
    return acc
  }, {})
}

function normalizeEdit(edit?: Partial<ImageEdit>): ImageEdit {
  return {
    offsetX: Number(edit?.offsetX ?? 0),
    offsetY: Number(edit?.offsetY ?? 0),
    scale: Number(edit?.scale ?? 1),
  }
}

function imageStyle(edit: ImageEdit) {
  return {
    "--image-scale": String(edit.scale),
    "--image-x": `${edit.offsetX}%`,
    "--image-y": `${edit.offsetY}%`,
  } as React.CSSProperties
}

function uniqueMeasurementLabel(rows: MeasurementRow[]) {
  const labels = new Set(rows.map((row) => row.label))
  let label = "추가 실측"
  let index = 1

  while (labels.has(label)) {
    index += 1
    label = `추가 실측 ${index}`
  }

  return label
}

function cleanOptions(options: Array<string | undefined>) {
  return [...new Set(options.map((option) => (option || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"))
}

function normalizeColorName(value?: string) {
  const first = String(value || "").split(/[,，]/)[0]?.trim() || ""
  if (first === "그레이" || first === "실버") return "그레이/실버"
  return first
}

function cleanColorOptions(options: Array<string | undefined>) {
  return cleanOptions(options.map(normalizeColorName))
}

function getBridgeAutocompleteOptions(field: AutocompleteField) {
  const options = window.closetBridge?.getAutocompleteOptions?.(field)
  return Array.isArray(options) ? options : []
}

function colorToHex(color: string) {
  const raw = String(color || "").trim()
  const rawDirect = COLOR_MAP[raw]
  if (rawDirect) return rawDirect

  const value = normalizeColorName(color)
  const direct = COLOR_MAP[value]
  if (direct) return direct
  const found = Object.keys(COLOR_MAP).find((key) => value.includes(key))
  return found ? COLOR_MAP[found] : "#c4c7c5"
}

function CategoryIcon({ category }: { category: string }) {
  if (category === "상의") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4 L17 4 L22 9 L18 12 L18 21 L6 21 L6 12 L2 9 Z" />
        <path d="M9 4 C9 6.5 15 6.5 15 4" />
      </svg>
    )
  }
  if (category === "하의") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3 L17 3 L19 21 L13 21 L12 9 L11 21 L5 21 Z" />
        <path d="M12 3 L12 6" />
      </svg>
    )
  }
  if (category === "아우터") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3 L18 3 L22 10 L18 13 L18 21 L6 21 L6 13 L2 10 Z" />
        <path d="M12 3 L12 21" />
        <path d="M8 3 L12 10 L16 3" />
      </svg>
    )
  }
  if (category === "신발") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14 C4 14 8 13 10 13 C12 13 14 15 18 15 L22 15 C22 18 19 20 16 20 L4 20 C3 20 2 19 2 18 L2 15 C2 14 3 14 4 14 Z" />
        <path d="M10 13 L8 8 C7 6 5 5 4 5 L2 5" />
      </svg>
    )
  }
  if (category === "가방") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 8 L19 8 L20 21 L4 21 Z" />
        <path d="M8 8 V5 C8 3.5 16 3.5 16 5 V8" />
      </svg>
    )
  }
  if (category === "악세사리") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="6" />
        <path d="M10 6 L10 2 L14 2 L14 6" />
        <path d="M10 18 L10 22 L14 22 L14 18" />
      </svg>
    )
  }
  if (category === "__custom__") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5 V19 M5 12 H19" />
      </svg>
    )
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 C10.5 3 9 4 9 5.5 C9 7 10 8 11 8 L12 9 L3 17 H21 Z" />
    </svg>
  )
}

export function ClosetDetailDialog() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [payload, setPayload] = useState<DetailPayload | null>(null)
  const [form, setForm] = useState<DetailForm | null>(null)
  const [measurementRows, setMeasurementRows] = useState<MeasurementRow[]>([])
  const [childOptions, setChildOptions] = useState<string[]>([])
  const [customParentMode, setCustomParentMode] = useState(false)
  const [customParent, setCustomParent] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [customColor, setCustomColor] = useState("")
  const [customColorMode, setCustomColorMode] = useState(false)
  const [imageSrc, setImageSrc] = useState("")
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [imageUrlOpen, setImageUrlOpen] = useState(false)
  const [imageEditOpen, setImageEditOpen] = useState(false)
  const [imageEdit, setImageEdit] = useState<ImageEdit>(normalizeEdit())
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    const handleDetailChange = (event: Event) => {
      const detail = (event as CustomEvent<DetailPayload | null>).detail
      setPayload(detail)
      setForm(detail ? itemToForm(detail.item) : null)
      setMeasurementRows(detail ? buildMeasurementRows(detail.measurementFields, detail.item.measurements) : [])
      setChildOptions(detail?.childCategoryOptions || [])
      setCustomParentMode(false)
      setCustomParent("")
      setCustomCategory("")
      setCustomColor("")
      setCustomColorMode(false)
      setImageUrlInput("")
      setImageUrlOpen(false)
      setImageEditOpen(false)
      setImageEdit(normalizeEdit(detail?.primaryImage.edit))

      if (detail) {
        if (detail.item.parentCategory && !detail.parentCategoryOptions.includes(detail.item.parentCategory)) {
          setCustomParentMode(true)
          setCustomParent(detail.item.parentCategory)
        }

        if (detail.item.category && !detail.childCategoryOptions.includes(detail.item.category)) {
          setCustomCategory(detail.item.category)
        }
      }
    }

    window.addEventListener("closet:detail-change", handleDetailChange)
    return () => window.removeEventListener("closet:detail-change", handleDetailChange)
  }, [])

  useEffect(() => {
    let active = true

    async function loadImage() {
      if (!payload) {
        setImageSrc("")
        return
      }

      if (payload.primaryImage.remoteUrl) {
        setImageSrc(payload.primaryImage.remoteUrl)
        return
      }

      if (payload.primaryImage.localId) {
        const url = await window.closetBridge?.getImageUrl(payload.primaryImage.localId)
        if (active) setImageSrc(url || "")
        return
      }

      setImageSrc("")
    }

    loadImage()
    return () => {
      active = false
    }
  }, [payload])

  const parentOptions = payload?.parentCategoryOptions || []
  const CORE_PARENT_CATEGORIES = ["아우터", "상의", "하의", "신발", "가방", "악세사리"]
  const allParentCategories = [...CORE_PARENT_CATEGORIES, ...parentOptions.filter((o) => !CORE_PARENT_CATEGORIES.includes(o))]

  const baseColorOptions = cleanColorOptions([...(payload?.colorOptions || []), ...(window.closetBridge?.getColorOptions?.() || [])])
  const colorOptions = cleanColorOptions([...baseColorOptions, !customColorMode ? form?.color : undefined])
  const autocompleteOptions = (field: AutocompleteField) =>
    cleanOptions([...(payload?.autocompleteOptions?.[field] || []), ...getBridgeAutocompleteOptions(field)])
  const selectedDate = dateFromString(form?.purchaseDate || "")
  const categoryIsCustom = Boolean(form?.category && !childOptions.includes(form.category))
  const colorIsCustom = customColorMode
  const showShoeSize = useMemo(
    () => window.closetBridge?.isShoeCategory({ parentCategory: form?.parentCategory || "", category: form?.category || "" }) || false,
    [form?.category, form?.parentCategory]
  )
  const primaryImage = payload?.primaryImage
  const hasImage = Boolean(imageSrc)

  const updateField = <Key extends keyof DetailForm>(key: Key, value: DetailForm[Key]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  const syncMeasurementTemplate = (parentCategory: string, category: string, currentRows = measurementRows) => {
    const measurements = rowsToMeasurements(currentRows)
    const fields =
      window.closetBridge?.getMeasurementFieldsForItem({
        category,
        measurements,
        parentCategory,
      }) || []

    setMeasurementRows(buildMeasurementRows(fields, measurements))
  }

  const handleParentChange = (value: string) => {
    if (!form) return

    if (value === CUSTOM_VALUE) {
      setCustomParentMode(true)
      const nextParent = customParent || ""
      setForm({ ...form, category: "", parentCategory: nextParent, shoeSize: "" })
      setChildOptions(window.closetBridge?.getChildCategoryOptions(nextParent) || [])
      syncMeasurementTemplate(nextParent, "")
      return
    }

    setCustomParentMode(false)
    const nextParent = value === NONE_VALUE ? "" : value
    setCustomParent("")
    setCustomCategory("")
    setForm({ ...form, category: "", parentCategory: nextParent, shoeSize: "" })
    setChildOptions(window.closetBridge?.getChildCategoryOptions(nextParent) || [])
    syncMeasurementTemplate(nextParent, "")
  }

  const handleCategoryChange = (value: string) => {
    if (!form) return

    if (value === CUSTOM_VALUE) {
      const nextCategory = customCategory || ""
      setForm({ ...form, category: nextCategory })
      syncMeasurementTemplate(form.parentCategory, nextCategory)
      return
    }

    const nextCategory = value === NONE_VALUE ? "" : value
    setCustomCategory("")
    setForm({ ...form, category: nextCategory })
    syncMeasurementTemplate(form.parentCategory, nextCategory)
  }

  const handleCustomParentChange = (value: string) => {
    if (!form) return
    setCustomParent(value)
    setForm({ ...form, category: "", parentCategory: value, shoeSize: "" })
    setChildOptions(window.closetBridge?.getChildCategoryOptions(value) || [])
    syncMeasurementTemplate(value, "")
  }

  const handleCustomCategoryChange = (value: string) => {
    if (!form) return
    setCustomCategory(value)
    setForm({ ...form, category: value })
    syncMeasurementTemplate(form.parentCategory, value)
  }

  const handleColorChange = (value: string) => {
    if (!form) return

    if (value === CUSTOM_VALUE) {
      setCustomColorMode(true)
      setCustomColor("")
      setForm({ ...form, color: "" })
      return
    }

    const nextColor = value === NONE_VALUE ? "" : normalizeColorName(value)
    setCustomColor("")
    setCustomColorMode(false)
    setForm({ ...form, color: nextColor })
  }

  const handleCustomColorChange = (value: string) => {
    if (!form) return
    setCustomColor(value)
    setForm({ ...form, color: value })
  }

  const handleSave = async () => {
    if (!form) return
    await window.closetBridge?.saveSelectedItem({
      ...form,
      measurements: rowsToMeasurements(measurementRows),
    })
  }

  const handleUpload = async (file?: File) => {
    if (!file) return
    await window.closetBridge?.uploadImageFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handlePaste = async (event: React.ClipboardEvent<HTMLFormElement>) => {
    const clipboard = event.clipboardData
    const imageItem = Array.from(clipboard.items).find((item) => item.kind === "file" && item.type.startsWith("image/"))
    const imageFile = imageItem?.getAsFile() || Array.from(clipboard.files).find((file) => file.type.startsWith("image/"))

    if (!imageFile) return

    event.preventDefault()
    await handleUpload(imageFile)
  }

  const handleImageUrlSave = async () => {
    await window.closetBridge?.addImageFromUrl(imageUrlInput)
    setImageUrlInput("")
    setImageUrlOpen(false)
  }

  const handleImageEditSave = async () => {
    await window.closetBridge?.saveImageEdit(imageEdit)
    setImageEditOpen(false)
  }

  return (
    <Dialog open={Boolean(payload)} onOpenChange={(open) => !open && window.closetBridge?.closeDetail()}>
      <DialogContent className="detail-form detail-dialog-content" showCloseButton={false}>
        {payload && form ? (
          <form
            className="detail-form-contents"
            onPaste={handlePaste}
            onSubmit={(event) => {
              event.preventDefault()
              handleSave()
            }}
          >
            <div className="detail-header">
              <div className="detail-title-stack">
                <DialogTitle asChild>
                  <h2>{form.name || "새 제품"}</h2>
                </DialogTitle>
                <DialogDescription className="sr-only">제품 정보와 사진, 구매 정보, 실측을 편집합니다.</DialogDescription>
              </div>
              <Button aria-label="닫기" className="icon-button" type="button" variant="ghost" onClick={() => window.closetBridge?.closeDetail()}>
                <X className="size-5" />
              </Button>
            </div>

            <ScrollArea className="detail-scroll">
              <div className="detail-main">
                <div className="detail-media">
                  <div className={hasImage ? "detail-cover" : "detail-cover placeholder"} data-image-cover>
                    {hasImage ? (
                      <img className="detail-cover-img" src={imageSrc} style={imageStyle(imageEdit)} alt="" />
                    ) : (
                      <span className="detail-cover-initial">{payload.initial}</span>
                    )}

                    <div className="unified-image-toolbar">
                      <Button aria-label="사진 업로드" className="icon-button" type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                        <ImagePlus className="size-5" />
                      </Button>
                      <Button aria-label="URL로 추가" className="icon-button" type="button" variant="ghost" onClick={() => setImageUrlOpen((open) => !open)}>
                        <LinkIcon className="size-5" />
                      </Button>
                      {primaryImage?.editable ? (
                        <Button aria-label="사진 편집" className="icon-button" type="button" variant="ghost" onClick={() => setImageEditOpen((open) => !open)}>
                          <SlidersHorizontal className="size-5" />
                        </Button>
                      ) : null}
                      {primaryImage?.localId || primaryImage?.remoteId || primaryImage?.externalUrl ? (
                        <Button aria-label="사진 삭제" className="icon-button" type="button" variant="ghost" onClick={() => window.closetBridge?.removeSelectedImage()}>
                          <Trash2 className="size-5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(event) => handleUpload(event.target.files?.[0])} />

                  {imageUrlOpen ? (
                    <div className="image-url-row">
                      <Input value={imageUrlInput} type="url" placeholder="이미지 URL (https://...)" onChange={(event) => setImageUrlInput(event.target.value)} />
                      <Button className="button secondary" type="button" variant="outline" onClick={handleImageUrlSave}>
                        확인
                      </Button>
                    </div>
                  ) : null}

                  {imageEditOpen && primaryImage?.editable ? (
                    <div className="image-editor">
                      <ImageSlider label="크기" max={2.5} min={0.5} step={0.01} value={imageEdit.scale} onChange={(scale) => setImageEdit((edit) => ({ ...edit, scale }))} />
                      <ImageSlider label="가로 위치" max={50} min={-50} step={1} value={imageEdit.offsetX} onChange={(offsetX) => setImageEdit((edit) => ({ ...edit, offsetX }))} />
                      <ImageSlider label="세로 위치" max={50} min={-50} step={1} value={imageEdit.offsetY} onChange={(offsetY) => setImageEdit((edit) => ({ ...edit, offsetY }))} />
                      <div className="image-editor-actions">
                        <Button
                          className="button secondary compact"
                          type="button"
                          variant="outline"
                          onClick={() => setImageEdit(normalizeEdit(payload.primaryImage.edit))}
                        >
                          초기화
                        </Button>
                        <Button className="button primary compact" type="button" onClick={handleImageEditSave}>
                          편집 저장
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

	                <div className="detail-body">
	                  <fieldset className="form-section">
	                    <legend>기본 정보</legend>
	                    <div className="form-grid">
	                      <label className="checkbox-row wide">
	                        <Checkbox checked={form.owned} onCheckedChange={(checked) => updateField("owned", checked === true)} />
	                        <span>보유 중</span>
	                      </label>
	                      <TextField label="제품명" required value={form.name} className="wide" onChange={(value) => updateField("name", value)} />
	                      <div className="field wide">
                        <span>
                          상위 카테고리<span className="required-mark">*</span>
                        </span>
                        <div className="category-grid">
                          {allParentCategories.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              className={`category-grid-btn ${!customParentMode && form.parentCategory === opt ? "active" : ""}`}
                              onClick={() => handleParentChange(opt)}
                            >
                              <div className="icon">
                                <CategoryIcon category={opt} />
                              </div>
                              <span className="label">{opt}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            className={`category-grid-btn ${customParentMode ? "active" : ""}`}
                            onClick={() => handleParentChange(CUSTOM_VALUE)}
                          >
                            <div className="icon">
                              <CategoryIcon category="__custom__" />
                            </div>
                            <span className="label">+ 추가</span>
                          </button>
                        </div>
                      </div>
                      {customParentMode ? (
                        <TextField label="새 상위 카테고리" value={customParent} className="wide" onChange={handleCustomParentChange} />
                      ) : null}
                      <SelectField
                        label="상세 카테고리"
                        value={categoryIsCustom ? CUSTOM_VALUE : form.category || NONE_VALUE}
                        options={childOptions}
                        placeholder="선택 안 함"
                        customLabel="+ 새 카테고리 추가"
                        onChange={handleCategoryChange}
                      />
                      {categoryIsCustom || (!form.category && customCategory) ? (
                        <TextField label="새 카테고리" value={customCategory} className="wide" onChange={handleCustomCategoryChange} />
                      ) : null}
                      <AutocompleteTextField label="브랜드" value={form.brand} options={autocompleteOptions("brand")} onChange={(value) => updateField("brand", value)} />
                      <SelectField
                        label="색상"
                        value={colorIsCustom ? CUSTOM_VALUE : form.color || NONE_VALUE}
	                        options={colorOptions}
	                        placeholder="선택 안 함"
	                        customLabel="+ 새 색상 추가"
	                        className=""
	                        showColorDots
	                        onChange={handleColorChange}
	                      />
                      {colorIsCustom ? <TextField label="새 색상" value={customColor} className="wide" onChange={handleCustomColorChange} /> : null}
                      <AutocompleteTextField label="사이즈" value={form.sizeLabel} options={autocompleteOptions("sizeLabel")} onChange={(value) => updateField("sizeLabel", value)} />
                      {showShoeSize ? (
                        <AutocompleteTextField label="신발 사이즈" value={form.shoeSize} options={autocompleteOptions("shoeSize")} onChange={(value) => updateField("shoeSize", value)} />
                      ) : null}
                    </div>
                  </fieldset>

                  <fieldset className="form-section">
                    <legend>구매 정보</legend>
                    <div className="form-grid">
                      <TextField label="제품 URL" value={form.productUrl} className="wide" type="url" onChange={(value) => updateField("productUrl", value)} />
                      <TextField label="정가" value={form.retailPrice} inputMode="numeric" onChange={(value) => updateField("retailPrice", value)} />
                      <TextField label="실구매가" value={form.purchasePrice} inputMode="numeric" onChange={(value) => updateField("purchasePrice", value)} />
                      <Label className="field">
                        <span>구매일</span>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button className="date-trigger" type="button" variant="outline">
                              <CalendarIcon className="size-4" />
                              {form.purchaseDate || "날짜 선택"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="calendar-popover">
                            <Calendar
                              captionLayout="dropdown"
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                updateField("purchaseDate", date ? dateToString(date) : "")
                                setCalendarOpen(false)
                              }}
                            />
                            <Button className="button secondary full" type="button" variant="outline" onClick={() => updateField("purchaseDate", "")}>
                              날짜 지우기
                            </Button>
                          </PopoverContent>
                        </Popover>
                      </Label>
	                    </div>
	                  </fieldset>

	                  <fieldset className="form-section">
	                    <legend>메모</legend>
	                    <Textarea aria-label="메모" value={form.memo} onChange={(event) => updateField("memo", event.target.value)} />
	                  </fieldset>

                  <div className="section-heading">
                    <h3 className="section-title">실측</h3>
                    <Button
                      className="button secondary compact"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const label = uniqueMeasurementLabel(measurementRows)
                        setMeasurementRows((rows) => [...rows, { custom: true, label, unit: "cm", value: "" }])
                      }}
                    >
                      <Plus className="size-4" />
                      실측 추가
                    </Button>
                  </div>
                  <div className="measure-grid">
                    {measurementRows.map((row, index) => (
                      <label data-measure-row key={`${row.label}-${index}`}>
                        {row.custom ? (
                          <Input
                            className="measure-label-input"
                            value={row.label}
                            placeholder="실측명"
                            onChange={(event) =>
                              setMeasurementRows((rows) =>
                                rows.map((candidate, candidateIndex) => (candidateIndex === index ? { ...candidate, label: event.target.value } : candidate))
                              )
                            }
                          />
                        ) : (
                          <span>{row.label}</span>
                        )}
                        <Input
                          inputMode="decimal"
                          value={row.value}
                          placeholder={row.unit || "cm"}
                          onChange={(event) =>
                            setMeasurementRows((rows) =>
                              rows.map((candidate, candidateIndex) => (candidateIndex === index ? { ...candidate, value: event.target.value } : candidate))
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="detail-actions">
              <Button className="button danger" type="button" variant="destructive" onClick={() => window.closetBridge?.deleteSelectedItem()}>
                <Trash2 className="size-4" />
                삭제
              </Button>
              <div className="topbar-actions">
                <Button className="button secondary" type="button" variant="outline" onClick={() => window.closetBridge?.shareSelectedItem()}>
                  <Share2 className="size-4" />
                  공유 링크
                </Button>
                <Button className="button primary" type="submit">
                  <Save className="size-4" />
                  저장
                </Button>
              </div>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function TextField({
  className = "",
  inputMode,
  label,
  onChange,
  required = false,
  type = "text",
  value,
}: {
  className?: string
  inputMode?: React.ComponentProps<"input">["inputMode"]
  label: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  value: string
}) {
  return (
    <Label className={`field ${className}`}>
      <span>
        {label}
        {required ? <span className="required-mark">*</span> : null}
      </span>
      <Input inputMode={inputMode} required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </Label>
  )
}

function AutocompleteTextField({
  className = "",
  inputMode,
  label,
  onChange,
  options,
  required = false,
  type = "text",
  value,
}: {
  className?: string
  inputMode?: React.ComponentProps<"input">["inputMode"]
  label: string
  onChange: (value: string) => void
  options: string[]
  required?: boolean
  type?: string
  value: string
}) {
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const query = value.trim().toLocaleLowerCase("ko-KR")
  const suggestions = useMemo(() => {
    const ranked = cleanOptions(options)
      .filter((option) => !query || option.toLocaleLowerCase("ko-KR").includes(query))
      .sort((a, b) => {
        const aValue = a.toLocaleLowerCase("ko-KR")
        const bValue = b.toLocaleLowerCase("ko-KR")
        const aStarts = query && aValue.startsWith(query)
        const bStarts = query && bValue.startsWith(query)
        if (aStarts !== bStarts) return aStarts ? -1 : 1
        return a.localeCompare(b, "ko")
      })

    return ranked.slice(0, 8)
  }, [options, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [suggestions.length, value])

  const showList = open && suggestions.length > 0

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion)
    setOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true)
      return
    }

    if (!showList) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % suggestions.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === "Enter") {
      event.preventDefault()
      selectSuggestion(suggestions[activeIndex] || suggestions[0])
    } else if (event.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <Label className={`field autocomplete-field ${className}`}>
      <span>
        {label}
        {required ? <span className="required-mark">*</span> : null}
      </span>
      <div className="autocomplete-shell">
        <Input
          aria-autocomplete="list"
          aria-controls={showList ? listboxId : undefined}
          aria-expanded={showList}
          aria-activedescendant={showList ? `${listboxId}-${activeIndex}` : undefined}
          inputMode={inputMode}
          required={required}
          role="combobox"
          type={type}
          value={value}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {showList ? (
          <div className="autocomplete-list" id={listboxId} role="listbox">
            {suggestions.map((suggestion, index) => (
              <button
                aria-selected={index === activeIndex}
                className={index === activeIndex ? "active" : ""}
                id={`${listboxId}-${index}`}
                key={suggestion}
                role="option"
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectSuggestion(suggestion)
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Label>
  )
}

function SelectField({
  className = "wide",
  customLabel,
  label,
  onChange,
  options,
  placeholder,
  required = false,
  showColorDots = false,
  value,
}: {
  className?: string
  customLabel: string
  label: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
  required?: boolean
  showColorDots?: boolean
  value: string
}) {
  return (
    <div className={`field ${className}`}>
      <span>
        {label}
        {required ? <span className="required-mark">*</span> : null}
      </span>
      <Select value={value || NONE_VALUE} onValueChange={onChange}>
        <SelectTrigger className="detail-select-trigger">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="shadcn-select-content" position="popper">
          <SelectItem value={NONE_VALUE}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {showColorDots ? <ColorOptionLabel label={option} /> : option}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_VALUE}>{customLabel}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function ColorOptionLabel({ label }: { label: string }) {
  return (
    <span className="select-color-option">
      <span className="color-dot" style={{ "--dot": colorToHex(label) } as React.CSSProperties} />
      <span>{label}</span>
    </span>
  )
}

function ImageSlider({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string
  max: number
  min: number
  onChange: (value: number) => void
  step: number
  value: number
}) {
  return (
    <label className="image-slider-row">
      <span>
        {label} <strong>{value}</strong>
      </span>
      <Slider max={max} min={min} step={step} value={[value]} onValueChange={([nextValue]) => onChange(nextValue ?? value)} />
    </label>
  )
}
