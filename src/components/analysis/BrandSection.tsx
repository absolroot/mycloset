import { BrandStats } from "../../closet/analysisTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BrandSection({ stats }: { stats: BrandStats[] }) {
  const formatWon = (value: number) => `${value.toLocaleString("ko-KR")}원`;

  return (
    <section className="analysis-section">
      <h3 className="section-title">브랜드 랭킹</h3>
      <div className="analysis-grid brand-grid">
        {stats.map((stat, idx) => (
          <Card key={stat.brand} className="analysis-glass-card brand-card">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="brand-rank">{idx + 1}</span>
                  {stat.brand}
                </span>
                <span className="text-sm font-normal px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">
                  {stat.count}개
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <ul className="text-sm space-y-2">
                <li className="flex justify-between items-center">
                  <span className="text-muted-foreground">누적 구매액</span>
                  <span className="font-medium">{formatWon(stat.totalPurchasePrice)}</span>
                </li>
                {stat.totalDiscount > 0 && (
                  <li className="flex justify-between items-center text-green-600 dark:text-green-400">
                    <span className="text-xs">할인액 (평균 {stat.averageDiscountRate.toFixed(1)}%)</span>
                    <span className="font-medium text-xs">-{formatWon(stat.totalDiscount)}</span>
                  </li>
                )}
                <li className="flex justify-between items-center mt-3 pt-3 border-t border-border/40">
                  <span className="text-muted-foreground text-xs">최다 카테고리</span>
                  <span className="text-xs font-medium">{stat.topCategory || "-"}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        ))}
        {stats.length === 0 && (
          <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
        )}
      </div>
    </section>
  );
}
