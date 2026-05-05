import { AnalysisSummary } from "../../closet/analysisTypes";
import { Card, CardContent } from "@/components/ui/card";
import { PackageOpen, CreditCard, Tag } from "lucide-react";

export function SummarySection({ summary }: { summary: AnalysisSummary }) {
  const formatWon = (value: number) => `${value.toLocaleString("ko-KR")}원`;
  const totalDiscountRate = summary.totalRetailPrice > 0 && summary.totalRetailPrice > summary.totalPurchasePrice
    ? ((summary.totalRetailPrice - summary.totalPurchasePrice) / summary.totalRetailPrice) * 100
    : 0;
  const discountLabel = totalDiscountRate > 0 ? `-${totalDiscountRate.toFixed(1)}%` : "0.0%";

  return (
    <section className="analysis-section">
      <div className="summary-hero-grid">
        <Card className="summary-hero-card">
          <CardContent className="summary-hero-content">
            <div className="summary-icon-wrapper bg-primary/10 text-primary">
              <PackageOpen className="size-5" />
            </div>
            <div className="summary-meta">
              <span className="summary-label">총 아이템</span>
              <div className="summary-value">{summary.totalCount}개</div>
              <p className="summary-desc">현재 보유 중 <strong>{summary.ownedCount}개</strong></p>
            </div>
          </CardContent>
        </Card>
        
	        <Card className="summary-hero-card">
	          <CardContent className="summary-hero-content">
	            <div className="summary-icon-wrapper is-retail">
	              <CreditCard className="size-5" />
	            </div>
	            <div className="summary-meta">
	              <span className="summary-label">정가 총액</span>
	              <div className="summary-value">{formatWon(summary.totalRetailPrice)}</div>
	              <p className="summary-desc">정가/구매가 입력 <strong>{summary.retailPriceCount}개</strong> 기준</p>
	            </div>
	          </CardContent>
	        </Card>

	        <Card className="summary-hero-card">
	          <CardContent className="summary-hero-content">
	            <div className="summary-icon-wrapper is-positive">
	              <Tag className="size-5" />
	            </div>
	            <div className="summary-meta">
	              <span className="summary-label">구매 총액</span>
	              <div className="summary-value is-positive"><span className="summary-discount-prefix">{discountLabel}</span> {formatWon(summary.totalPurchasePrice)}</div>
	              <p className="summary-desc">절감액 <strong>{formatWon(summary.totalDiscount)}</strong></p>
	            </div>
	          </CardContent>
	        </Card>
      </div>
    </section>
  );
}
