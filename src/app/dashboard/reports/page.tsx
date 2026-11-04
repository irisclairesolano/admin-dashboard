'use client';

/**
 * ============================================================================
 * FILE OVERVIEW: Community Safety & Moderation Reports Route Alias (`/dashboard/reports`)
 * ============================================================================
 * (a) Purpose in the SIKAP Admin Dashboard:
 *     Acts as a clean route alias (`/dashboard/reports`) that re-exports the
 *     unified Community Moderation & Incident Reports workstation
 *     (`@/app/dashboard/moderation/page`). This ensures deep-links from AI
 *     Insights (`actionLink`), notification badges, and legacy bookmarks resolve
 *     seamlessly to the live moderation queue.
 *
 * (b) Key Admin Features & RBAC Rules:
 *     - Inherits full `admin`-only RBAC protection and moderation capabilities:
 *       filtering by violation category (`fake_account`, `inappropriate_job`,
 *       `harassment`, `other`), inspecting reported targets, and executing
 *       3-tier enforcement actions (Dismiss, Resolve/Warn, Suspend/Ban User).
 *
 * (c) Data Flow (Route Alias -> `ModerationPage` -> `useSSEReports` & Admin API):
 *     - Delegates rendering and state management directly to `ModerationPage`,
 *       which coordinates with `useSSEReports` (`src/hooks/useSSEReports.ts`)
 *       to clear unread report badges upon viewing and updates incident statuses
 *       via `adminApi.getReports` / `adminApi.resolveReport`.
 * ============================================================================
 */

import ModerationPage from '@/app/dashboard/moderation/page';

// ── ROUTE RE-EXPORT TO UNIFIED MODERATION WORKSTATION ────────────────────────
export default ModerationPage;
