export interface ClosetItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  parentCategory: string;
  color: string;
  sizeLabel: string;
  shoeSize?: string;
  retailPrice: number | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  owned: boolean;
  measurements: Record<string, number>;
  imageIds: string[];
  primaryImageId: string | null;
  remoteImages: {
    id?: string;
    mime?: string;
    publicUrl?: string;
    signedUrl?: string;
    storageBucket?: string;
    storagePath?: string;
    storageProvider?: string;
    url?: string;
  }[];
  externalImageUrl: string;
  guestSample?: boolean;
  source?: string;
}

export interface AnalysisSummary {
  totalCount: number;
  ownedCount: number;
  totalPurchasePrice: number;
  totalRetailPrice: number;
  retailPriceCount: number;
  totalDiscount: number;
  averageDiscountRate: number;
  averagePurchasePrice: number;
  missingPriceCount: number;
}

export interface ColorStats {
  color: string;
  count: number;
  ratio: number; // 0~1
  totalPurchasePrice: number;
  averagePurchasePrice: number;
}

export interface BrandStats {
  brand: string;
  count: number; // owned 기준 (또는 토글 기준)
  totalPurchasePrice: number;
  totalRetailPrice: number;
  totalDiscount: number;
  averageDiscountRate: number;
  averagePurchasePrice: number;
  categories: Record<string, number>;
  categorySizes: Record<string, Record<string, number>>;
  topCategory: string;
  topColor: string;
  lastPurchaseDate: string | null;
}

export interface MeasurementRange {
  min: number;
  p25: number;
  p75: number;
  max: number;
  count: number;
}

export type CategoryMeasurementRanges = Record<string, Record<string, Record<string, MeasurementRange>>>;
