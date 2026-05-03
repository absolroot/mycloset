import { AnalysisSummary } from "../../closet/analysisTypes";
import { Card, CardContent } from "@/components/ui/card";
import { PackageOpen, CreditCard, Tag, AlertTriangle } from "lucide-react";

export function SummarySection({ summary }: { summary: AnalysisSummary }) {
  const formatWon = (value: number) => `${value.toLocaleString("ko-KR")}원`;

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
            <div className="summary-icon-wrapper bg-blue-500/10 text-blue-500">
              <CreditCard className="size-5" />
            </div>
            <div className="summary-meta">
              <span className="summary-label">구매 총액</span>
              <div className="summary-value">{formatWon(summary.totalPurchasePrice)}</div>
              <p className="summary-desc">평균 단가 <strong>{formatWon(Math.round(summary.averagePurchasePrice))}</strong></p>
            </div>
          </CardContent>
        </Card>

        <Card className="summary-hero-card">
          <CardContent className="summary-hero-content">
            <div className="summary-icon-wrapper bg-green-500/10 text-green-500">
              <Tag className="size-5" />
            </div>
            <div className="summary-meta">
              <span className="summary-label">정가 대비 절감액</span>
              <div className="summary-value text-green-600 dark:text-green-400">{formatWon(summary.totalDiscount)}</div>
              <p className="summary-desc">평균 할인율 <strong>{summary.averageDiscountRate.toFixed(1)}%</strong></p>
            </div>
          </CardContent>
        </Card>

        <Card className="summary-hero-card">
          <CardContent className="summary-hero-content">
            <div className="summary-icon-wrapper bg-orange-500/10 text-orange-500">
              <AlertTriangle className="size-5" />
            </div>
            <div className="summary-meta">
              <span className="summary-label">데이터 상태</span>
              <div className="summary-value">{summary.missingPriceCount}개</div>
              <p className="summary-desc">가격 정보 누락 항목</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
