import { BRAND_CONFIG } from "../brand/brandConfig"

export const LEGAL_CONFIG = {
  serviceName: BRAND_CONFIG.serviceName,
  englishName: BRAND_CONFIG.englishName,
  tagline: BRAND_CONFIG.tagline,
  operatorName: `${BRAND_CONFIG.serviceName} 운영자`,
  privacyOfficer: `${BRAND_CONFIG.serviceName} 운영자`,
  contactLabel: "GitHub 이슈(https://github.com/absolroot/mycloset/issues) 또는 서비스 운영자가 별도로 고지한 문의 채널",
  effectiveDate: "2026년 5월 5일",
  copyrightYear: 2026,
} as const
