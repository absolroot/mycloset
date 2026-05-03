import { CategoryMeasurementRanges } from "../../closet/analysisTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ruler } from "lucide-react";

const FIELD_LABELS: Record<string, string> = {
  total_length: "총장",
  shoulder: "어깨",
  chest: "가슴",
  sleeve: "소매",
  waist: "허리",
  thigh: "허벅지",
  rise: "밑위",
  hem: "밑단",
  width: "폭",
  height: "높이",
  temple_length: "다리길이",
  circumference: "둘레길이",
  lens_width: "렌즈길이",
  bridge_width: "브릿지길이",
  brim_length: "챙길이"
};

export function MeasurementSection({ ranges }: { ranges: CategoryMeasurementRanges }) {
  const categories = Object.keys(ranges);

  return (
    <section className="analysis-section">
      <h3 className="section-title">내 몸에 맞는 사이즈 (보유 중 기준)</h3>
      <div className="analysis-grid">
        {categories.map((cat) => (
          <Card key={cat} className="analysis-glass-card">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base flex items-center gap-2">
                <Ruler className="size-4 text-primary" />
                {cat}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="compact-table-container">
                <table className="compact-table modern-table">
                  <thead>
                    <tr>
                      <th>항목</th>
                      <th>권장 실측 (25~75%)</th>
                      <th>표본</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(ranges[cat]).map(([field, range]) => (
                      <tr key={field}>
                        <td className="font-medium text-foreground">{FIELD_LABELS[field] || field}</td>
                        <td className="font-semibold text-primary">
                          {range.p25.toFixed(1)} <span className="text-muted-foreground mx-1 font-normal">~</span> {range.p75.toFixed(1)}
                        </td>
                        <td className="text-muted-foreground text-xs">{range.count}개</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground">실측 데이터가 부족합니다.</p>
        )}
      </div>
    </section>
  );
}
