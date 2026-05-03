import { ClosetItem } from "../../closet/analysisTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";

export function ConsumptionSection({ items }: { items: ClosetItem[] }) {
  const formatWon = (value: number) => `${value.toLocaleString("ko-KR")}원`;

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

  const catStats = Array.from(catMap.entries())
    .map(([cat, stat]) => ({ cat, ...stat }))
    .sort((a, b) => b.total - a.total);

  const maxTotal = catStats.length > 0 ? catStats[0].total : 1;

  // 할인율 상위
  const discounted = items
    .filter((i) => i.retailPrice && i.purchasePrice && i.retailPrice > i.purchasePrice)
    .map((i) => ({
      item: i,
      discount: (i.retailPrice as number) - (i.purchasePrice as number),
      rate: (((i.retailPrice as number) - (i.purchasePrice as number)) / (i.retailPrice as number)) * 100,
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  return (
    <section className="analysis-section">
      <h3 className="section-title">소비 및 할인 지표</h3>
      <div className="analysis-grid">
        <Card className="analysis-glass-card">
          <CardHeader>
            <CardTitle className="text-base">카테고리별 구매액</CardTitle>
          </CardHeader>
          <CardContent className="chart-content">
            {catStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
            ) : (
              <div className="bar-chart modern-bar-chart">
                {catStats.map((stat, idx) => (
                  <div key={stat.cat} className="bar-row modern-bar-row" style={{ animationDelay: `${idx * 100}ms` }}>
                    <div className="bar-label-top flex justify-between text-xs mb-1">
                      <span className="font-medium">{stat.cat}</span>
                      <span className="text-muted-foreground">{formatWon(stat.total)}</span>
                    </div>
                    <div className="bar-track modern-bar-track">
                      <div className="bar-fill modern-bar-fill" style={{ width: `${(stat.total / maxTotal) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="analysis-glass-card relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <TrendingDown className="size-24" />
          </div>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="size-4 text-green-500" />
              할인율 TOP 5
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            {discounted.length === 0 ? (
              <p className="text-sm text-muted-foreground">할인 구매 데이터가 없습니다.</p>
            ) : (
              <ul className="compact-list modern-list">
                {discounted.map(({ item, rate }) => (
                  <li key={item.id} className="compact-list-item modern-list-item">
                    <div className="item-info">
                      <strong className="text-sm">{item.name || "이름 없음"}</strong>
                      <span className="text-xs text-muted-foreground">{item.brand || "브랜드 없음"}</span>
                    </div>
                    <div className="item-badge bg-green-500/10 text-green-600 dark:text-green-400 font-semibold text-sm px-2.5 py-0.5 rounded-full">
                      {rate.toFixed(0)}%
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
