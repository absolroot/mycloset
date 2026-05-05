import { useEffect, useRef, useState } from "react";
import { ClosetItem } from "../../closet/analysisTypes";
import { calculatePeriodPurchases } from "../../closet/analysisUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, Calendar, ShoppingBag, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ConsumptionSection({ items }: { items: ClosetItem[] }) {
  const periodChartScrollRef = useRef<HTMLDivElement | null>(null);
  const formatWon = (value: number) => `${value.toLocaleString("ko-KR")}원`;
  const formatCompactWon = (value: number) => {
    if (value <= 0) return "0";
    if (value >= 10000) {
      const man = value / 10000;
      return `${man >= 100 ? Math.round(man).toLocaleString("ko-KR") : man.toFixed(1)}만`;
    }
    return value.toLocaleString("ko-KR");
  };
  const [period, setPeriod] = useState<"1m" | "3m" | "6m" | "1y" | "3y" | "all">("6m");

  // 카테고리별 통계
  const catMap = new Map<string, { count: number; total: number }>();
  for (const item of items) {
    if (item.purchasePrice == null) continue;
    const cat = item.category || item.parentCategory || "미입력";
    if (!catMap.has(cat)) catMap.set(cat, { count: 0, total: 0 });
    const stat = catMap.get(cat)!;
    stat.count++;
    stat.total += item.purchasePrice;
  }

  const sortedCats = Array.from(catMap.entries())
    .map(([cat, stat]) => ({ cat, ...stat }))
    .sort((a, b) => b.total - a.total);

  const maxTotalCat = sortedCats.length > 0 ? Math.max(...sortedCats.map(c => c.total)) : 1;

  // 월별 통계
  const periodStats = calculatePeriodPurchases(items, period);
  const maxPeriod = periodStats.length > 0 ? Math.max(...periodStats.map(m => m.total)) : 1;

  useEffect(() => {
    const scrollEl = periodChartScrollRef.current;
    if (!scrollEl) return;

    requestAnimationFrame(() => {
      scrollEl.scrollLeft = scrollEl.scrollWidth - scrollEl.clientWidth;
    });
  }, [period, periodStats.length]);

  // 최근 구매 아이템
  const recentItems = [...items]
    .filter(i => i.purchaseDate)
    .sort((a, b) => b.purchaseDate!.localeCompare(a.purchaseDate!))
    .slice(0, 5);

  // 할인율 상위
  const discounted = items
    .filter((i) => i.retailPrice && i.purchasePrice && i.retailPrice > i.purchasePrice)
    .map((i) => ({
      item: i,
      discount: (i.retailPrice as number) - (i.purchasePrice as number),
      rate: (((i.retailPrice as number) - (i.purchasePrice as number)) / (i.retailPrice as number)) * 100,
    }))
    .sort((a, b) => b.rate - a.rate);

  const getImageUrl = (item: ClosetItem) => {
    if (item.primaryImageId && item.remoteImages) {
       const img = item.remoteImages.find(i => i?.id === item.primaryImageId || i?.url?.includes(item.primaryImageId!));
       if (img) return img.signedUrl || img.publicUrl || img.url || "";
    }
    if (item.remoteImages && item.remoteImages.length > 0) {
      return item.remoteImages[0].signedUrl || item.remoteImages[0].publicUrl || item.remoteImages[0].url || "";
    }
    return item.externalImageUrl;
  };

  const openItem = (id: string) => {
    window.closetBridge?.openItem?.(id);
  };

  return (
    <section className="analysis-section flex flex-col gap-4">
      <h3 className="section-title">소비 및 최근 동향</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* 소비 트렌드 (2칸 차지) */}
        <Card className="lg:col-span-2 analysis-glass-card h-full">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              시기별 소비 트렌드
            </CardTitle>
            <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
              <SelectTrigger className="period-select-trigger w-[92px] h-7 px-2 text-[11px]">
                <SelectValue placeholder="기간 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="text-xs" value="1m">최근 1개월</SelectItem>
                <SelectItem className="text-xs" value="3m">최근 3개월</SelectItem>
                <SelectItem className="text-xs" value="6m">최근 6개월</SelectItem>
                <SelectItem className="text-xs" value="1y">최근 1년</SelectItem>
                <SelectItem className="text-xs" value="3y">최근 3년</SelectItem>
                <SelectItem className="text-xs" value="all">전체</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pt-4">
            {periodStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">구매 일자 데이터가 없습니다.</p>
            ) : (
	              <div ref={periodChartScrollRef} className="w-full overflow-x-auto pb-4">
		                <div className="flex items-end justify-around gap-1 w-full min-w-[300px] h-52 pt-4 px-2 border-b border-border/50">
		                  {periodStats.map(stat => {
		                    const heightPercent = stat.total > 0 ? Math.max((stat.total / maxPeriod) * 100, 2) : 0;
		                    return (
		                      <div key={stat.label} className="period-bar-column flex flex-col items-center justify-end h-full gap-2 group flex-1">
                            <div className="period-bar-stack">
                              <span className={`period-bar-value ${stat.total === 0 ? "is-zero" : ""}`}>{formatCompactWon(stat.total)}</span>
                              {stat.total > 0 ? (
                                <div 
                                  className="w-full max-w-[32px] bg-primary/80 hover:bg-primary rounded-t-sm transition-all relative"
                                  style={{ height: `${heightPercent}%` }}
                                />
                              ) : null}
                            </div>
	                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{stat.label}</span>
	                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 카테고리별 구매액 (1칸, 스크롤) */}
        <Card className="analysis-glass-card h-full">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="size-4 text-primary" />
              카테고리 소비 지표
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sortedCats.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">데이터가 없습니다.</p>
            ) : (
              <ScrollArea className="h-[210px] w-full px-4 pt-4">
                <div className="flex flex-col gap-4 pb-4">
                  {sortedCats.map((stat, idx) => (
                    <div key={stat.cat} className="flex flex-col gap-1.5 group">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium flex items-center gap-2">
                          <span className="w-4 text-center text-muted-foreground">{idx + 1}</span>
                          {stat.cat}
                        </span>
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">{formatWon(stat.total)}</span>
                      </div>
                      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden ml-6" style={{ width: 'calc(100% - 1.5rem)' }}>
                        <div 
                          className="bg-primary/70 h-full rounded-full transition-all group-hover:bg-primary" 
                          style={{ width: `${(stat.total / maxTotalCat) * 100}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* 최근 구매 아이템 (2칸 차지) */}
        <Card className="lg:col-span-2 analysis-glass-card h-full">
          <CardHeader className="analysis-compact-card-header border-b border-border/40">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              최근 옷장 추가 리스트
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {recentItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {recentItems.map(item => (
	                  <button key={item.id} type="button" onClick={() => openItem(item.id)} className="recent-item-card border border-border/60 hover:border-ring rounded-md p-2 bg-card flex flex-col gap-2 transition-all text-left">
	                    <div 
	                      className="w-full aspect-[4/5] bg-muted bg-center bg-cover rounded overflow-hidden shadow-sm" 
                      style={{ backgroundImage: `url(${getImageUrl(item)})` }}
                    />
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <div className="font-medium text-sm truncate">{item.name || "이름 없음"}</div>
	                      <div className="text-xs text-muted-foreground truncate">{item.brand || "브랜드 없음"}</div>
	                      <div className="text-[10px] text-muted-foreground mt-0.5">{item.purchaseDate}</div>
	                    </div>
	                  </button>
	                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 할인율 랭킹 (1칸) */}
        <Card className="analysis-glass-card discount-status-card relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <TrendingDown className="size-24" />
          </div>
          <CardHeader className="analysis-compact-card-header border-b border-border/40 relative z-10 shrink-0">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="size-4 text-green-500" />
              할인율 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 relative z-10 flex-1 min-h-0">
            {discounted.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">할인 구매 데이터가 없습니다.</p>
            ) : (
              <ScrollArea className="discount-status-scroll w-full px-4">
                <ul className="modern-list text-sm pb-4">
	                  {discounted.map(({ item, discount, rate }) => (
		                    <li key={item.id} className="py-2 border-b border-border/40 last:border-0">
			                      <div className="discount-item-body">
	                            <div className="discount-item-head">
	                              <strong>{item.name || "이름 없음"}</strong>
	                              <span className="discount-rate-inline">{rate.toFixed(0)}%</span>
	                            </div>
			                        <div className="discount-item-meta">
	                              <span>{item.brand || "브랜드 없음"} · {formatWon(item.retailPrice || 0)} → {formatWon(item.purchasePrice || 0)}</span>
	                              <small>-{formatCompactWon(discount)}</small>
	                            </div>
		                      </div>
		                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
