import { useMemo, useState } from "react";
import { BrandStats } from "../../closet/analysisTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";

type BrandSort = "count" | "purchase";

export function BrandSection({ stats }: { stats: BrandStats[] }) {
  const formatWon = (value: number) => `${value.toLocaleString("ko-KR")}원`;
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});
  const [sort, setSort] = useState<BrandSort>("count");

  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => {
      if (sort === "purchase") {
        return (
          b.totalPurchasePrice - a.totalPurchasePrice ||
          b.count - a.count ||
          b.totalRetailPrice - a.totalRetailPrice ||
          a.brand.localeCompare(b.brand, "ko-KR")
        );
      }

      return (
        b.count - a.count ||
        b.totalPurchasePrice - a.totalPurchasePrice ||
        b.totalRetailPrice - a.totalRetailPrice ||
        a.brand.localeCompare(b.brand, "ko-KR")
      );
    });
  }, [sort, stats]);

  const toggleBrand = (brand: string) => {
    setExpandedBrands(prev => ({ ...prev, [brand]: !prev[brand] }));
  };

  return (
    <section className="analysis-section">
      <div className="analysis-section-heading">
        <h3 className="section-title">브랜드 랭킹</h3>
        <Select value={sort} onValueChange={(value) => setSort(value as BrandSort)}>
          <SelectTrigger className="period-select-trigger brand-sort-select" aria-label="브랜드 랭킹 정렬">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="shadcn-select-content" position="popper">
            <SelectItem className="text-xs" value="count">개수 순</SelectItem>
            <SelectItem className="text-xs" value="purchase">금액 순</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="analysis-grid brand-grid">
        {sortedStats.map((stat, idx) => {
          const isExpanded = expandedBrands[stat.brand];
          const discountRate = stat.totalRetailPrice > 0 && stat.totalRetailPrice > stat.totalPurchasePrice
            ? ((stat.totalRetailPrice - stat.totalPurchasePrice) / stat.totalRetailPrice) * 100
            : 0;
          return (
            <Card key={stat.brand} className="analysis-glass-card brand-card">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="brand-card-title text-base flex justify-between items-center gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="brand-rank">{idx + 1}</span>
                    <span className="truncate">{stat.brand}</span>
                  </span>
                  <span className="brand-count-pill">
                    {stat.count}개
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
	                <ul className="text-sm space-y-2">
	                  <li className="flex justify-between items-center">
	                    <span className="text-muted-foreground">정가</span>
	                    <span className="font-medium">{formatWon(stat.totalRetailPrice)}</span>
	                  </li>
	                  <li className="flex justify-between items-center">
	                    <span className="text-muted-foreground">구매가</span>
	                    <span className="brand-purchase-total">
                        {discountRate > 0 ? <em>-{discountRate.toFixed(0)}%</em> : null}
                        <strong>{formatWon(stat.totalPurchasePrice)}</strong>
                      </span>
	                    </li>
	                  <li className="flex flex-col gap-2 mt-3 pt-3 border-t border-border/40">
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(stat.categories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                        <span key={cat} className="brand-category-pill">
                          {cat} {count}
                        </span>
                      ))}
                    </div>
                  </li>
                </ul>

                <div className="mt-4 pt-3 border-t border-border/40">
                  <button 
                    type="button" 
                    className="brand-size-toggle"
                    onClick={() => toggleBrand(stat.brand)}
                  >
                    카테고리 및 사이즈별 보유 현황
                    {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </button>
                  
                  {isExpanded && stat.categorySizes && (
                    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      {Object.entries(stat.categorySizes).map(([cat, sizes]) => (
                        <div key={cat} className="text-xs bg-muted/30 p-2 rounded-md">
                          <div className="font-semibold mb-1 text-foreground">{cat} <span className="text-muted-foreground font-normal">({stat.categories[cat]}개)</span></div>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(sizes).map(([size, count]) => (
                              <span key={size} className="bg-background border border-border/50 px-1.5 py-0.5 rounded text-[10px]">
                                {size} <span className="text-muted-foreground ml-0.5">({count}개)</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sortedStats.length === 0 && (
          <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
        )}
      </div>
    </section>
  );
}
