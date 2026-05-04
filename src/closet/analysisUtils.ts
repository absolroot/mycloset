import { ClosetItem, AnalysisSummary, ColorStats, BrandStats, CategoryMeasurementRanges, MeasurementRange } from "./analysisTypes";

export function calculateSummary(items: ClosetItem[]): AnalysisSummary {
  const summary: AnalysisSummary = {
    totalCount: items.length,
    ownedCount: items.filter(i => i.owned).length,
    totalPurchasePrice: 0,
    totalRetailPrice: 0,
    retailPriceCount: 0,
    totalDiscount: 0,
    averageDiscountRate: 0,
    averagePurchasePrice: 0,
    missingPriceCount: 0,
  };

  let validPurchaseCount = 0;
  let validDiscountCount = 0;
  let discountRateSum = 0;

  for (const item of items) {
    const hasPurchase = item.purchasePrice !== null && item.purchasePrice !== undefined;
    const hasRetail = item.retailPrice !== null && item.retailPrice !== undefined;

    if (!hasPurchase && !hasRetail) {
      summary.missingPriceCount++;
    } else if (!hasPurchase) {
      summary.missingPriceCount++;
    } else {
      const pPrice = item.purchasePrice as number;
      summary.totalPurchasePrice += pPrice;
      validPurchaseCount++;

      if (hasRetail) {
        const rPrice = item.retailPrice as number;
        summary.totalRetailPrice += rPrice;
        summary.retailPriceCount++;
        
        if (rPrice > pPrice) {
          const discount = rPrice - pPrice;
          summary.totalDiscount += discount;
          discountRateSum += (discount / rPrice) * 100;
          validDiscountCount++;
        }
      }
    }
  }

  if (validPurchaseCount > 0) {
    summary.averagePurchasePrice = summary.totalPurchasePrice / validPurchaseCount;
  }
  if (validDiscountCount > 0) {
    summary.averageDiscountRate = discountRateSum / validDiscountCount;
  }

  return summary;
}

export function calculateColorStats(items: ClosetItem[]): ColorStats[] {
  const colorMap = new Map<string, ColorStats>();

  for (const item of items) {
    const color = item.color || "미입력";
    if (!colorMap.has(color)) {
      colorMap.set(color, {
        color,
        count: 0,
        ratio: 0,
        totalPurchasePrice: 0,
        averagePurchasePrice: 0,
      });
    }

    const stat = colorMap.get(color)!;
    stat.count++;
    
    if (item.purchasePrice != null) {
      stat.totalPurchasePrice += item.purchasePrice;
    }
  }

  const result = Array.from(colorMap.values()).sort((a, b) => b.count - a.count);
  const totalItems = items.length;

  for (const stat of result) {
    stat.ratio = totalItems > 0 ? stat.count / totalItems : 0;
    stat.averagePurchasePrice = stat.count > 0 ? stat.totalPurchasePrice / stat.count : 0;
  }

  return result;
}

export function calculateBrandStats(items: ClosetItem[]): BrandStats[] {
  const brandMap = new Map<string, BrandStats>();

  for (const item of items) {
    const brand = item.brand || "미입력";
    if (!brandMap.has(brand)) {
      brandMap.set(brand, {
        brand,
        count: 0,
        totalPurchasePrice: 0,
        totalRetailPrice: 0,
        totalDiscount: 0,
        averageDiscountRate: 0,
        averagePurchasePrice: 0,
        categories: {},
        categorySizes: {},
        topCategory: "",
        topColor: "",
        lastPurchaseDate: null,
      });
    }

    const stat = brandMap.get(brand)!;
    stat.count++;

    const pPrice = item.purchasePrice || 0;
    const rPrice = item.retailPrice || 0;

    if (item.retailPrice != null) {
      stat.totalRetailPrice += rPrice;
    }

    if (item.purchasePrice != null) {
      stat.totalPurchasePrice += pPrice;
      if (item.retailPrice != null && rPrice > pPrice) {
        stat.totalDiscount += (rPrice - pPrice);
      }
    }

    const cat = item.category || item.parentCategory || "미입력";
    stat.categories[cat] = (stat.categories[cat] || 0) + 1;

    const size = item.sizeLabel || item.shoeSize || "사이즈없음";
    if (!stat.categorySizes[cat]) stat.categorySizes[cat] = {};
    stat.categorySizes[cat][size] = (stat.categorySizes[cat][size] || 0) + 1;

    if (item.purchaseDate) {
      if (!stat.lastPurchaseDate || item.purchaseDate > stat.lastPurchaseDate) {
        stat.lastPurchaseDate = item.purchaseDate;
      }
    }
  }

  const result = Array.from(brandMap.values()).sort((a, b) => b.count - a.count);

  for (const stat of result) {
    stat.averagePurchasePrice = stat.count > 0 ? stat.totalPurchasePrice / stat.count : 0;
    // Discount rate logic relative to retail price sums
    if (stat.totalRetailPrice > 0) {
       stat.averageDiscountRate = (stat.totalDiscount / stat.totalRetailPrice) * 100;
    }

    let maxCatCount = 0;
    for (const [cat, count] of Object.entries(stat.categories)) {
      if (count > maxCatCount) {
        maxCatCount = count;
        stat.topCategory = cat;
      }
    }
  }

  return result;
}

// Percentile helper
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = lower + 1;
  const weight = index % 1;
  if (upper >= sorted.length) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function calculateMeasurementRanges(items: ClosetItem[]): CategoryMeasurementRanges {
  // Only calculate for owned items to estimate body size
  const ownedItems = items.filter(i => i.owned);
  const map: Record<string, Record<string, Record<string, number[]>>> = {};

  for (const item of ownedItems) {
    const parentCat = item.parentCategory || "미입력";
    const childCat = item.category || "기타";
    
    if (!map[parentCat]) map[parentCat] = {};
    if (!map[parentCat][childCat]) map[parentCat][childCat] = {};

    if (item.measurements) {
      for (const [field, value] of Object.entries(item.measurements)) {
        if (typeof value === 'number' && !isNaN(value)) {
          if (!map[parentCat][childCat][field]) map[parentCat][childCat][field] = [];
          map[parentCat][childCat][field].push(value);
        }
      }
    }
  }

  const result: CategoryMeasurementRanges = {};

  for (const [parentCat, children] of Object.entries(map)) {
    result[parentCat] = {};
    for (const [childCat, fields] of Object.entries(children)) {
      result[parentCat][childCat] = {};
      for (const [field, values] of Object.entries(fields)) {
        if (values.length >= 3) { // Require at least 3 items for a meaningful range
          result[parentCat][childCat][field] = {
            min: Math.min(...values),
            max: Math.max(...values),
            p25: percentile(values, 25),
            p75: percentile(values, 75),
            count: values.length,
          };
        }
      }
      if (Object.keys(result[parentCat][childCat]).length === 0) {
        delete result[parentCat][childCat];
      }
    }
    if (Object.keys(result[parentCat]).length === 0) {
      delete result[parentCat];
    }
  }

  return result;
}

export interface PeriodPurchase {
  label: string;
  total: number;
}

function compactWeekLabel(start: Date, end: Date): string {
  const startLabel = `${start.getMonth() + 1}/${start.getDate()}`;
  const endLabel = start.getMonth() === end.getMonth()
    ? `${end.getDate()}`
    : `${end.getMonth() + 1}/${end.getDate()}`;
  return `${startLabel}~${endLabel}`;
}

function startOfMondayWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function calculatePeriodPurchases(items: ClosetItem[], period: "1m" | "3m" | "6m" | "1y" | "3y" | "all"): PeriodPurchase[] {
  const now = new Date();
  const map = new Map<string, number>();
  const labels: string[] = [];
  const weekRanges: { label: string; start: Date; end: Date }[] = [];

  if (period === "1m") {
    const currentWeekStart = startOfMondayWeek(now);
    for (let i = 3; i >= 0; i--) {
      const start = new Date(currentWeekStart);
      start.setDate(currentWeekStart.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      const label = compactWeekLabel(start, end);
      weekRanges.push({ label, start, end });
      labels.push(label);
      map.set(label, 0);
    }
  } else {
    let monthsToSubtract = 0;
    if (period === "3m") monthsToSubtract = 3;
    else if (period === "6m") monthsToSubtract = 6;
    else if (period === "1y") monthsToSubtract = 12;
    else if (period === "3y") monthsToSubtract = 36;
    
    if (period === "all") {
       let oldestDate = now;
       for (const item of items) {
         if (item.purchaseDate) {
           const d = new Date(item.purchaseDate);
           if (d < oldestDate) oldestDate = d;
         }
       }
       monthsToSubtract = (now.getFullYear() - oldestDate.getFullYear()) * 12 + (now.getMonth() - oldestDate.getMonth()) + 1;
       if (monthsToSubtract > 120) monthsToSubtract = 120;
       if (monthsToSubtract < 6) monthsToSubtract = 6;
    }

    for (let i = monthsToSubtract - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getFullYear().toString().slice(2)}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      labels.push(label);
      map.set(label, 0);
    }
  }

  for (const item of items) {
    if (item.purchasePrice != null && item.purchaseDate) {
      const pDate = new Date(item.purchaseDate);
      if (period === "1m") {
        const week = weekRanges.find(range => pDate >= range.start && pDate <= range.end);
        if (week) {
          map.set(week.label, map.get(week.label)! + item.purchasePrice);
        }
      } else {
        const label = `${pDate.getFullYear().toString().slice(2)}-${String(pDate.getMonth() + 1).padStart(2, "0")}`;
        if (map.has(label)) {
          map.set(label, map.get(label)! + item.purchasePrice);
        } else if (period === "all") {
           map.set(label, (map.get(label) || 0) + item.purchasePrice);
           if (!labels.includes(label)) labels.push(label);
        }
      }
    }
  }

  if (period === "all") {
     labels.sort();
  }

  return labels.map(label => ({
    label,
    total: map.get(label) || 0
  }));
}
