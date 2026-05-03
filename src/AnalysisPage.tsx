import { useEffect, useState, useMemo } from "react";
import { ClosetItem } from "./closet/analysisTypes";
import { calculateSummary, calculateColorStats, calculateBrandStats, calculateMeasurementRanges } from "./closet/analysisUtils";
import { SummarySection } from "./components/analysis/SummarySection";
import { ConsumptionSection } from "./components/analysis/ConsumptionSection";
import { ColorSection } from "./components/analysis/ColorSection";
import { BrandSection } from "./components/analysis/BrandSection";
import { MeasurementSection } from "./components/analysis/MeasurementSection";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BoxSelect, Infinity } from "lucide-react";

export default function AnalysisPage() {
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [ownedOnly, setOwnedOnly] = useState(true);

  useEffect(() => {
    const fetchItems = () => {
      // @ts-ignore
      if (window.closetBridge && window.closetBridge.getAnalysisItems) {
        // @ts-ignore
        setItems(window.closetBridge.getAnalysisItems());
      }
    };

    fetchItems();

    const handleFiltersChange = () => {
      fetchItems();
    };

    window.addEventListener("closet:filters-change", handleFiltersChange);
    // fallback if app.js uses subscribeFilters
    // @ts-ignore
    let unsubscribe = () => {};
    // @ts-ignore
    if (window.closetBridge && window.closetBridge.subscribeFilters) {
      // @ts-ignore
      unsubscribe = window.closetBridge.subscribeFilters(() => fetchItems());
    }

    return () => {
      window.removeEventListener("closet:filters-change", handleFiltersChange);
      unsubscribe();
    };
  }, []);

  const filteredItems = useMemo(() => {
    return ownedOnly ? items.filter((item) => item.owned) : items;
  }, [items, ownedOnly]);

  const summary = useMemo(() => calculateSummary(filteredItems), [filteredItems]);
  const colorStats = useMemo(() => calculateColorStats(filteredItems), [filteredItems]);
  const brandStats = useMemo(() => calculateBrandStats(filteredItems), [filteredItems]);
  const measurementRanges = useMemo(() => calculateMeasurementRanges(filteredItems), [filteredItems]);

  return (
    <div className="analysis-page">
      <header className="analysis-header">
        <div className="analysis-header-title">
          <h2>옷장 분석</h2>
          <p className="text-sm text-muted-foreground">내 옷장의 소비 패턴과 브랜드, 사이즈를 분석합니다.</p>
        </div>
        <div className="analysis-header-actions">
          <ToggleGroup type="single" value={ownedOnly ? "owned" : "all"} onValueChange={(val) => { if (val) setOwnedOnly(val === "owned"); }}>
            <ToggleGroupItem value="owned" aria-label="보유 중">
              <BoxSelect className="size-4 mr-2" />
              보유 중
            </ToggleGroupItem>
            <ToggleGroupItem value="all" aria-label="전체">
              <Infinity className="size-4 mr-2" />
              전체
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </header>

      <main className="analysis-content">
        <SummarySection summary={summary} />
        
        <div className="analysis-dashboard-grid">
          <div className="analysis-column">
            <ConsumptionSection items={filteredItems} />
            <BrandSection stats={brandStats} />
          </div>
          <div className="analysis-column">
            <ColorSection stats={colorStats} />
            <MeasurementSection ranges={measurementRanges} />
          </div>
        </div>
      </main>
    </div>
  );
}
