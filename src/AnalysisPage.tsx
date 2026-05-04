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
      <div className="analysis-header-banner">
        <header className="analysis-header">
          <div className="analysis-header-title">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">옷장 인사이트</h2>
            <p className="text-sm text-muted-foreground mt-1">나만의 옷장 데이터를 기반으로 한 종합 분석 대시보드</p>
          </div>
	          <div className="analysis-header-actions">
	            <ToggleGroup 
	              type="single" 
	              value={ownedOnly ? "owned" : "all"} 
	              onValueChange={(val) => { if (val) setOwnedOnly(val === "owned"); }}
	              className="analysis-scope-toggle"
	            >
	              <ToggleGroupItem value="owned" aria-label="보유 중" className="analysis-scope-toggle-item">
	                <BoxSelect className="size-3.5" />
	                보유 중
	              </ToggleGroupItem>
	              <ToggleGroupItem value="all" aria-label="전체" className="analysis-scope-toggle-item">
	                <Infinity className="size-3.5" />
	                전체
	              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </header>
      </div>

      <main className="analysis-content">
        <SummarySection summary={summary} />
        <ConsumptionSection items={filteredItems} />
        <ColorSection stats={colorStats} />
        <MeasurementSection ranges={measurementRanges} items={filteredItems} />
        <BrandSection stats={brandStats} />
      </main>
    </div>
  );
}
