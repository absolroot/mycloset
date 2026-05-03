import { ColorStats } from "../../closet/analysisTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// colorToHex를 window에서 가져와야 함
const getColorHex = (colorName: string) => {
  // @ts-ignore
  if (window.closetFormatUtils && window.closetFormatUtils.colorToHex) {
    // @ts-ignore
    return window.closetFormatUtils.colorToHex(colorName) || "#ccc";
  }
  return "#ccc";
};

export function ColorSection({ stats }: { stats: ColorStats[] }) {
  const formatWon = (value: number) => `${value.toLocaleString("ko-KR")}원`;

  return (
    <section className="analysis-section">
      <Card className="analysis-glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">색상 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="color-stacked-bar">
            {stats.map(stat => (
              <div 
                key={stat.color} 
                className="color-stacked-segment" 
                style={{ width: `${stat.ratio * 100}%`, backgroundColor: getColorHex(stat.color) }}
                title={`${stat.color} - ${(stat.ratio * 100).toFixed(1)}%`}
              />
            ))}
          </div>
          
          <div className="swatch-grid mt-6">
            {stats.map((stat) => (
              <div key={stat.color} className="swatch-item">
                <div 
                  className="swatch-color" 
                  style={{ backgroundColor: getColorHex(stat.color) }}
                />
                <div className="swatch-info">
                  <div className="swatch-name">{stat.color}</div>
                  <div className="swatch-desc">
                    <span className="font-medium text-foreground">{stat.count}개</span> ({(stat.ratio * 100).toFixed(1)}%)
                    <br/>
                    {formatWon(stat.totalPurchasePrice)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
