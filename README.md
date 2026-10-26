# SIKAP Admin Web Dashboard (`sikap-admin`)

**Sistema para sa Impormal na Kasanayan at Aktibong Pangkabuhayan (SIKAP)** — Next.js 14 (App Router, TypeScript, Tailwind CSS) administrative portal for identity verification, moderation, and provincial labor analytics in Sorsogon Province.

---

## Core Modules (`/dashboard/*`)

- **Executive Overview (`/dashboard`)**: Real-time KPI statcards, recruitment funnel charts, category breakdowns, and municipal distribution across all 15 municipalities of Sorsogon.
- **Identity Verification Queue (`/dashboard/verifications`)**: Lightbox inspector with zoom, rotation, and PDF rendering for government IDs and selfies (`Approved`, `Rejected`, `Correction Needed`).
- **User Management (`/dashboard/users`)**: Role badges, dual-role status, account suspension controls, and user-to-user blocked relationship auditing.
- **Job Moderation (`/dashboard/jobs`)**: Compensation auditing with normalized hourly wages, slot utilization tracking, and soft deletion/restoration.
- **Content Moderation (`/dashboard/moderation`)**: Two-tier profanity dictionary management (`block` vs. `flag`), live Server-Sent Events (SSE) auto-flag stream, and user report triage.
- **AI Macroeconomic Insights (`/dashboard/analytics/ai-insights`)**: Google Gemini 1.5 Flash labor market analysis with suspect wage filtering (`< ₱50/hr`) and on-demand cache refresh.
- **Universal Data Export (`/dashboard/export-reports`)**: Styled Excel (`.xlsx`), CSV, and PDF report generation.
- **Support & Audit Logs (`/dashboard/support`, `/dashboard/logs`)**: Helpdesk ticket resolution and immutable administrative activity logs.

---

## Quick Start

```bash
npm install
# Configure NEXT_PUBLIC_API_URL in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
