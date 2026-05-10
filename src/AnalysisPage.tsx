import { useEffect, useState, useMemo } from "react";
import { ClosetItem } from "./closet/analysisTypes";
import { calculateSummary, calculateColorStats, calculateBrandStats, calculateMeasurementRanges } from "./closet/analysisUtils";
import { SummarySection } from "./components/analysis/SummarySection";
import { ConsumptionSection } from "./components/analysis/ConsumptionSection";
import { ColorSection } from "./components/analysis/ColorSection";
import { BrandSection } from "./components/analysis/BrandSection";
import { MeasurementSection } from "./components/analysis/MeasurementSection";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { BoxSelect, Infinity, Plus } from "lucide-react";

type AnalysisBridgeWindow = Window & {
  closetBridge?: {
    getAnalysisItems?: () => ClosetItem[];
    subscribeFilters?: (listener: () => void) => () => void;
  };
};

function formatCompactWon(value: number) {
  if (value <= 0) return ""
  if (value >= 100000000) return `${(value / 100000000).toFixed(1).replace(/\.0$/, "")}억`
  if (value >= 10000) return `${Math.round(value / 10000).toLocaleString("ko-KR")}만`
  return value.toLocaleString("ko-KR")
}

function isGuestSampleItem(item: ClosetItem) {
  return Boolean(item.guestSample || item.name?.trim().startsWith("예시)"));
}

export default function AnalysisPage() {
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [ownedOnly, setOwnedOnly] = useState(true);

  useEffect(() => {
    const fetchItems = () => {
      const nextItems = (window as AnalysisBridgeWindow).closetBridge?.getAnalysisItems?.();
      if (nextItems) setItems(nextItems);
    };

    fetchItems();

    const handleFiltersChange = () => {
      fetchItems();
    };

    window.addEventListener("closet:filters-change", handleFiltersChange);
    const unsubscribe = (window as AnalysisBridgeWindow).closetBridge?.subscribeFilters?.(() => fetchItems()) ?? (() => {});

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
  const sampleCount = useMemo(() => filteredItems.filter(isGuestSampleItem).length, [filteredItems]);
  const ownCount = Math.max(0, filteredItems.length - sampleCount);
  const isSampleOnly = sampleCount > 0 && ownCount === 0;
  const titleScope = ownedOnly ? "보유" : "전체";
  const analysisTitle = `${titleScope} ${filteredItems.length.toLocaleString("ko-KR")}개 분석`;

  useEffect(() => {
    const purchaseSummary = formatCompactWon(summary.totalPurchasePrice);
    const title = purchaseSummary ? `${analysisTitle} · 구매 ${purchaseSummary}원` : analysisTitle;
    window.dispatchEvent(new CustomEvent("closet:analysis-title-change", { detail: { title } }));
  }, [analysisTitle, summary.totalPurchasePrice]);

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

      {isSampleOnly ? (
        <section className="analysis-sample-banner" aria-label="예시 데이터 안내">
          <div>
            <strong>예시 데이터 기준 미리보기입니다</strong>
            <p>샘플 {sampleCount.toLocaleString("ko-KR")}개로 분석 구조를 보여주고 있습니다. 내 제품을 하나 저장하면 개인 옷장 기준으로 바뀝니다.</p>
          </div>
          <Button className="button primary" data-action="new-item" type="button">
            <Plus className="size-4" />
            내 제품 추가
          </Button>
        </section>
      ) : null}

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
