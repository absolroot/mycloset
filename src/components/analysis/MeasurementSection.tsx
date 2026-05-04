import { useEffect, useState, useMemo } from "react";
import { CategoryMeasurementRanges, ClosetItem } from "../../closet/analysisTypes";
import { Card, CardContent } from "@/components/ui/card";

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

const HOME_CATEGORY_ORDER = ["상의", "아우터", "하의", "원피스", "신발", "가방", "패션소품", "주얼리"];
const CHILD_CATEGORY_ORDER: Record<string, string[]> = {
  상의: ["티셔츠 (긴팔)", "티셔츠 (반팔)", "셔츠 (긴팔)", "셔츠 (반팔)", "니트", "니트베스트", "가디건", "집업", "스웨트셔츠", "후디"],
  아우터: ["코트", "블레이저", "야상", "패딩", "바람막이/플리스", "재킷"],
  하의: ["슬랙스", "치노/퍼티그", "데님", "린넨/나일론", "스웨트/코듀로이", "반바지"],
  신발: ["스니커즈", "구두", "샌들", "부츠"],
  가방: ["백팩", "크로스백", "토트백"],
  악세사리: ["아이웨어", "모자", "벨트", "넥타이", "머플러/장갑", "시계/팔찌/반지", "지갑"],
  패션소품: ["아이웨어", "모자", "벨트", "넥타이", "머플러/장갑", "시계/팔찌/반지", "지갑"],
};

function sortChildCategories(parentCategory: string, categories: string[]) {
  const order = CHILD_CATEGORY_ORDER[parentCategory];
  if (!order) return [...categories].sort((a, b) => a.localeCompare(b, "ko-KR"));

  const orderMap = new Map(order.map((category, index) => [category, index]));
  return [...categories].sort((a, b) => {
    const aIndex = orderMap.get(a) ?? Number.POSITIVE_INFINITY;
    const bIndex = orderMap.get(b) ?? Number.POSITIVE_INFINITY;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.localeCompare(b, "ko-KR");
  });
}

export function MeasurementSection({ ranges, items }: { ranges: CategoryMeasurementRanges; items: ClosetItem[] }) {
  const parentCategories = useMemo(() => {
    return Object.keys(ranges).sort((a, b) => {
      const idxA = HOME_CATEGORY_ORDER.indexOf(a);
      const idxB = HOME_CATEGORY_ORDER.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [ranges]);

  const [activeParent, setActiveParent] = useState<string>(parentCategories[0] || "");

  const childCategories = useMemo(() => {
    return activeParent && ranges[activeParent] ? sortChildCategories(activeParent, Object.keys(ranges[activeParent])) : [];
  }, [ranges, activeParent]);

  const [activeChild, setActiveChild] = useState<string>("");

  useEffect(() => {
    if (parentCategories.length > 0 && (!activeParent || !parentCategories.includes(activeParent))) {
      setActiveParent(parentCategories[0]);
    }
  }, [parentCategories, activeParent]);

  // Update active child when parent changes
  useEffect(() => {
    if (childCategories.length > 0 && !childCategories.includes(activeChild)) {
      setActiveChild(childCategories[0]);
    } else if (childCategories.length === 0) {
      setActiveChild("");
    }
  }, [childCategories, activeChild]);

  const sizeStats = useMemo(() => {
    if (!activeParent || !activeChild) return [];

    const map = new Map<string, number>();
    for (const item of items) {
      if (!item.owned) continue;
      if ((item.parentCategory || "미입력") !== activeParent) continue;
      if ((item.category || "기타") !== activeChild) continue;

      const size = item.shoeSize || item.sizeLabel || "사이즈 없음";
      map.set(size, (map.get(size) || 0) + 1);
    }

    const total = Array.from(map.values()).reduce((sum, count) => sum + count, 0);
    return Array.from(map.entries())
      .map(([size, count]) => ({
        size,
        count,
        ratio: total > 0 ? count / total : 0,
      }))
      .sort((a, b) => b.count - a.count || a.size.localeCompare(b.size));
  }, [activeParent, activeChild, items]);

  if (parentCategories.length === 0) {
    return (
      <section className="analysis-section">
        <h3 className="section-title">내 몸에 맞는 사이즈 (보유 중 기준)</h3>
        <p className="text-sm text-muted-foreground">실측 데이터가 부족합니다.</p>
      </section>
    );
  }

  const currentFields = (activeParent && activeChild && ranges[activeParent]?.[activeChild]) || {};

  return (
    <section className="analysis-section">
      <h3 className="section-title">내 몸에 맞는 사이즈 (보유 중 기준)</h3>
      <Card className="analysis-glass-card">
        <CardContent className="flex flex-col gap-4">
          <div className="measurement-category-control">
            <div className="measurement-parent-tabs">
              {parentCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveParent(cat)}
                  className={`measurement-parent-tab ${activeParent === cat ? "is-active" : ""}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {childCategories.length > 0 && (
              <div className="measurement-child-tabs">
                {childCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveChild(cat)}
                    className={`measurement-child-tab ${activeChild === cat ? "is-active" : ""}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
            {sizeStats.length > 0 && (
              <div className="measurement-size-summary" aria-label={`${activeChild} 사이즈 옵션 분포`}>
                {sizeStats.map(stat => (
                  <span key={stat.size} className="measurement-size-chip">
                    <span>{stat.size}</span>
                    <strong>{stat.count}개</strong>
                    <em>{Math.round(stat.ratio * 100)}%</em>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="compact-table-container">
            <table className="compact-table modern-table">
              <thead>
                <tr>
                  <th className="w-1/4">항목</th>
                  <th className="w-1/2">권장 실측 (25~75%)</th>
                  <th className="w-1/4">표본</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(currentFields).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-muted-foreground text-sm py-4">실측 데이터가 없습니다.</td>
                  </tr>
                ) : (
                  Object.entries(currentFields).map(([field, range]) => (
                    <tr key={field}>
                      <td className="font-medium text-foreground">{FIELD_LABELS[field] || field}</td>
                      <td className="font-semibold text-primary">
                        {range.p25.toFixed(1)} <span className="text-muted-foreground mx-1 font-normal">~</span> {range.p75.toFixed(1)}
                      </td>
                      <td className="text-muted-foreground text-xs">{range.count}개</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
