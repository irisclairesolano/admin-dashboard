/**
 * ============================================================================
 * FILE OVERVIEW: SIKAP Multi-Sheet ExcelJS (.xlsx) Workbook & Report Generators
 * ============================================================================
 * (a) Purpose in the SIKAP Admin Dashboard:
 *     1. `generateMasterExcelWorkbook`: Compiles an institutional, 7-worksheet
 *        `.xlsx` Excel workbook for LGU/PESO reporting and archival:
 *          - Sheet 1: Executive Summary (Live `COUNTA`, `COUNTIF`, `AVERAGE`, `SUM` KPI cards & data quality flags)
 *          - Sheet 2: Users Masterlist (Workers, Employers, Admins, KYC & operational status)
 *          - Sheet 3: Jobs & Placements (Postings, normalized hourly wages, and live fill % formulas)
 *          - Sheet 4: Municipal Demographics (Executive municipal roll-up + barangay breakdown)
 *          - Sheet 5: Verification Audit (KYC Gov ID / Selfie submission & rejection audit trail)
 *          - Sheet 6: Community Reports (Safety/moderation incidents and resolution timestamps)
 *          - Sheet 7: Wage Benchmarks (Cross-sheet `COUNTIF`, `AVERAGEIF`, `MINIFS`, `MAXIFS` by trade category)
 *     2. `exportMultiSectionExcel`: Shared styled `.xlsx` exporter used across all
 *        admin dashboard pages (Users, Jobs, Moderation, Support, Archives, Blacklist,
 *        Audit Logs, Overview, and Reports Center) alongside raw CSV export.
 *
 * (b) Key Admin Features & Styling Rules:
 *     - Lazy-loads `exceljs` via dynamic `import('exceljs')` so the spreadsheet bundle
 *       is only downloaded when an administrator triggers an Excel export.
 *     - Consistent Arial typography (11 pt body, 11 pt bold headers, 15 pt merged titles),
 *       restrained corporate Navy (`#1F3864`) / Slate (`#F8FAFC`) styling, semantic
 *       status cells, autofilters, frozen headers, wrapped long text, and landscape print setup.
 *     - Embeds both live Excel formulas (`formula`) AND pre-computed cached values (`result`)
 *       using exact dynamic row ranges.
 * ============================================================================
 */

import type ExcelJS from 'exceljs';
import { calculateNormalizedHourlyWage, formatCSVStatus, type CSVSection } from './csv';
import { humanizeModel } from '../../lib/constants';

export interface ExportDataPayload {
  users: any[];
  jobs: any[];
  verifications: any[];
  reports?: any[];
  analytics?: any;
  municipalSummary?: any[];
  municipalOverview?: any[];
}

// ── CORPORATE SPREADSHEET COLOR PALETTE & REUSABLE HEADER STYLING HELPERS ────
const NAVY = '1F3864';
const BLUE_HEADER = '2E5395';
const ICE_BLUE = 'EAF0FA';
const LIGHT_GRAY = 'F8FAFC';
const BORDER_GRAY = 'E2E8F0';
const DARK_TEXT = '1E293B';
const MUTED_TEXT = '475569';
const WHITE = 'FFFFFF';

const GREEN_FILL = 'ECFDF5';
const GREEN_TEXT = '065F46';
const YELLOW_FILL = 'FFFBEB';
const YELLOW_TEXT = '92400E';
const RED_FILL = 'FEF2F2';
const RED_TEXT = '991B1B';
const NEUTRAL_FILL = 'F1F5F9';

const CELL_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF' + BORDER_GRAY } },
  bottom: { style: 'thin', color: { argb: 'FF' + BORDER_GRAY } },
  left: { style: 'thin', color: { argb: 'FF' + BORDER_GRAY } },
  right: { style: 'thin', color: { argb: 'FF' + BORDER_GRAY } },
};

function configurePrintLayout(
  worksheet: ExcelJS.Worksheet,
  options: { landscape?: boolean; printTitlesRow?: string } = {}
) {
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: options.landscape === false ? 'portrait' : 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.4,
      right: 0.4,
      top: 0.5,
      bottom: 0.5,
      header: 0.25,
      footer: 0.25,
    },
    ...(options.printTitlesRow ? { printTitlesRow: options.printTitlesRow } : {}),
  };
}

function applyTitleBlock(worksheet: ExcelJS.Worksheet, title: string, subtitle: string, maxCol = 8) {
  // Row 1: Main Title (Merged)
  const titleRow = worksheet.getRow(1);
  titleRow.height = 38;
  worksheet.mergeCells(1, 1, 1, maxCol);
  const titleCell = titleRow.getCell(1);
  titleCell.value = `  ${title.toUpperCase()}`;
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + NAVY } };
  titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FF' + WHITE } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Row 2: Blank Spacer
  worksheet.getRow(2).height = 8;

  // Row 3: Subtitle Metadata (Merged)
  const subRow = worksheet.getRow(3);
  subRow.height = 22;
  worksheet.mergeCells(3, 1, 3, maxCol);
  const subCell = subRow.getCell(1);
  subCell.value = `  ${subtitle}`;
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GRAY } };
  subCell.font = { name: 'Arial', size: 10.5, italic: true, color: { argb: 'FF' + MUTED_TEXT } };
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };

  // Row 4: Blank Spacer
  worksheet.getRow(4).height = 10;
}

function applySectionHeader(worksheet: ExcelJS.Worksheet, rowNumber: number, title: string, maxCol = 8) {
  const row = worksheet.getRow(rowNumber);
  row.height = 26;
  worksheet.mergeCells(rowNumber, 1, rowNumber, maxCol);
  const cell = row.getCell(1);
  cell.value = `  ${title.toUpperCase()}`;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BLUE_HEADER } };
  cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF' + WHITE } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
}

function applyTableHeader(worksheet: ExcelJS.Worksheet, rowNumber: number, headers: string[]) {
  const row = worksheet.getRow(rowNumber);
  row.height = 28;
  headers.forEach((h, idx) => {
    const cell = row.getCell(idx + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + NAVY } };
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF' + WHITE } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF' + NAVY } },
      bottom: { style: 'medium', color: { argb: 'FF' + NAVY } },
      left: { style: 'thin', color: { argb: 'FF' + BLUE_HEADER } },
      right: { style: 'thin', color: { argb: 'FF' + BLUE_HEADER } },
    };
  });
}

function styleBodyRow(
  row: ExcelJS.Row,
  colCount: number,
  isZebra: boolean,
  skipCols: number[] = []
) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    if (!skipCols.includes(c)) {
      cell.font = { name: 'Arial', size: 11, color: { argb: 'FF' + DARK_TEXT } };
      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GRAY } };
      }
    }
    if (!cell.alignment) {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    } else {
      cell.alignment = { ...cell.alignment, vertical: 'middle' };
    }
    cell.border = CELL_BORDER;
  }
}

function formatStatusCell(cell: ExcelJS.Cell, status: string) {
  const s = String(status || '').toLowerCase();
  if (['approved', 'active', 'open', 'completed', 'resolved', 'hired', 'verified'].includes(s)) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN_FILL } };
    cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF' + GREEN_TEXT } };
  } else if (
    [
      'pending',
      'pending_review',
      'pending_email_verification',
      'pending_id_upload',
      'requested',
      'offer_sent',
      'in_progress',
      'closed_in_progress',
      'investigating',
    ].includes(s)
  ) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + YELLOW_FILL } };
    cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF' + YELLOW_TEXT } };
  } else if (
    ['rejected', 'banned', 'suspended', 'cancelled', 'dismissed', 'inactive', 'archived'].includes(s)
  ) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + RED_FILL } };
    cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF' + RED_TEXT } };
  } else {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + NEUTRAL_FILL } };
    cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF' + MUTED_TEXT } };
  }
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
}

function estimateWrappedRowHeight(text: string, colWidth: number, minHeight = 24): number {
  if (!text) return minHeight;
  const usableCharsPerLine = Math.max(12, Math.floor(colWidth * 0.9));
  const explicitLines = String(text).split(/\r?\n/);
  const totalLines = explicitLines.reduce(
    (sum, line) => sum + Math.max(1, Math.ceil(line.length / usableCharsPerLine)),
    0
  );
  return Math.max(minHeight, totalLines * 16 + 8);
}

function getVerificationStatus(u: any): string {
  const isApproved = u.verification_status === 'approved' || !!u.verification_badge;
  const isRejected = u.verification_status === 'rejected' || u.registration_status === 'rejected';
  const hasDocs =
    u.registration_status === 'pending_review' ||
    !!u.document_url ||
    !!u.document_back_url ||
    !!u.selfie_url ||
    (Array.isArray(u.business_documents) ? u.business_documents.length > 0 : !!u.business_documents);

  if (isApproved) return 'approved';
  if (isRejected) return 'rejected';
  if (hasDocs) return 'pending';
  return 'unverified';
}

export async function generateMasterExcelWorkbook(
  payload: ExportDataPayload,
  onProgress?: (stage: string) => void
): Promise<Blob> {
  const ExcelJSModule = await import('exceljs');
  const ExcelJSClass = (ExcelJSModule.default || ExcelJSModule) as typeof import('exceljs');
  const workbook = new ExcelJSClass.Workbook();
  workbook.creator = 'SIKAP Skills & Job Matching Platform';
  workbook.lastModifiedBy = 'SIKAP Platform Administrator';
  workbook.created = new Date();
  workbook.modified = new Date();

  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const { users = [], jobs = [], verifications = [], reports = [] } = payload;
  const lastUserRow = 5 + Math.max(users.length, 1);
  const lastJobRow = 5 + Math.max(jobs.length, 1);
  const lastVerifRow = 5 + Math.max(verifications.length, 1);
  const lastReportRow = 5 + Math.max(reports.length, 1);

  // =========================================================================
  // SHEET 1: EXECUTIVE SUMMARY
  // =========================================================================
  onProgress?.('Executive Summary');
  await new Promise<void>((r) => setTimeout(r, 0));

  const ws1 = workbook.addWorksheet('Executive Summary', {
    views: [{ showGridLines: false }],
  });
  ws1.columns = [
    { width: 24 }, { width: 16 }, { width: 22 }, { width: 16 },
    { width: 24 }, { width: 16 }, { width: 22 }, { width: 16 },
  ];
  configurePrintLayout(ws1, { landscape: true });

  applyTitleBlock(
    ws1,
    'SIKAP PLATFORM MASTER REPORT',
    `Complete Platform Snapshot  |  Generated ${timestamp}  |  Classification: Official Administrative Masterlist`,
    8
  );

  applySectionHeader(ws1, 5, 'KEY PERFORMANCE INDICATORS', 8);
  ws1.getRow(6).height = 8; // Spacer

  // KPI Row 1 (Row 7: Labels, Row 8: Values)
  const kpiRow7 = ws1.getRow(7);
  kpiRow7.height = 22;
  const kpiLabels1 = [
    { startCol: 1, endCol: 2, text: 'Total Registered Users' },
    { startCol: 3, endCol: 4, text: 'Total Jobs Posted' },
    { startCol: 5, endCol: 6, text: 'Pending Verifications' },
    { startCol: 7, endCol: 8, text: 'Moderation Reports' },
  ];
  kpiLabels1.forEach((k) => {
    ws1.mergeCells(7, k.startCol, 7, k.endCol);
    const c = kpiRow7.getCell(k.startCol);
    c.value = k.text;
    c.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF' + MUTED_TEXT } };
    c.alignment = { vertical: 'bottom', horizontal: 'center', wrapText: true };
  });

  const kpiRow8 = ws1.getRow(8);
  kpiRow8.height = 36;
  const kpiCards1 = [
    {
      startCol: 1,
      endCol: 2,
      formula: `COUNTA('Users Masterlist'!A6:A${lastUserRow})`,
      result: users.length,
    },
    {
      startCol: 3,
      endCol: 4,
      formula: `COUNTA('Jobs & Placements'!A6:A${lastJobRow})`,
      result: jobs.length,
    },
    {
      startCol: 5,
      endCol: 6,
      formula: `COUNTIF('Verification Audit'!D6:D${lastVerifRow},"*pending*")`,
      result: verifications.filter((v) => getVerificationStatus(v) === 'pending').length,
    },
    {
      startCol: 7,
      endCol: 8,
      formula: `COUNTA('Community Reports'!A6:A${lastReportRow})`,
      result: reports.length,
    },
  ];
  kpiCards1.forEach((card) => {
    ws1.mergeCells(8, card.startCol, 8, card.endCol);
    const cell = kpiRow8.getCell(card.startCol);
    cell.value = { formula: card.formula, result: card.result };
    cell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF' + NAVY } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = CELL_BORDER;
  });

  ws1.getRow(9).height = 10; // Spacer
  ws1.getRow(10).height = 6;

  // KPI Row 2 (Row 11: Labels, Row 12: Values)
  const kpiRow11 = ws1.getRow(11);
  kpiRow11.height = 22;
  const kpiLabels2 = [
    { startCol: 1, endCol: 2, text: 'Job Fill Rate' },
    { startCol: 3, endCol: 4, text: 'Avg. Hourly Wage' },
    { startCol: 5, endCol: 6, text: 'Open Job Postings' },
    { startCol: 7, endCol: 8, text: 'Total Applications' },
  ];
  kpiLabels2.forEach((k) => {
    ws1.mergeCells(11, k.startCol, 11, k.endCol);
    const c = kpiRow11.getCell(k.startCol);
    c.value = k.text;
    c.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF' + MUTED_TEXT } };
    c.alignment = { vertical: 'bottom', horizontal: 'center', wrapText: true };
  });

  const kpiRow12 = ws1.getRow(12);
  kpiRow12.height = 36;

  // Fill Rate: Slots Hired (Col M) / Slots Required (Col L)
  const totalSlotsReq = jobs.reduce((acc, j) => acc + (Number(j.slots) || 1), 0);
  const totalSlotsHired = jobs.reduce((acc, j) => acc + (Number(j.filled_slots ?? j.accepted_count) || 0), 0);
  ws1.mergeCells(12, 1, 12, 2);
  const cA12 = kpiRow12.getCell(1);
  cA12.value = {
    formula: `IFERROR(SUM('Jobs & Placements'!M6:M${lastJobRow})/SUM('Jobs & Placements'!L6:L${lastJobRow}),0)`,
    result: totalSlotsReq ? totalSlotsHired / totalSlotsReq : 0,
  };
  cA12.numFmt = '0.0%';
  cA12.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF' + NAVY } };
  cA12.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
  cA12.alignment = { vertical: 'middle', horizontal: 'center' };
  cA12.border = CELL_BORDER;

  // Avg Hourly Comp: Hourly Wage (PHP/hr) is Col K
  const validHourlyJobs = jobs
    .map((j) =>
      calculateNormalizedHourlyWage(j.compensation, j.rate_unit, j.duration, j.duration_unit, j.duration_type)
    )
    .filter((w) => w > 0);
  const avgHourlyComp =
    validHourlyJobs.length > 0
      ? validHourlyJobs.reduce((acc, w) => acc + w, 0) / validHourlyJobs.length
      : 0;
  ws1.mergeCells(12, 3, 12, 4);
  const cC12 = kpiRow12.getCell(3);
  cC12.value = {
    formula: `IFERROR(AVERAGE('Jobs & Placements'!K6:K${lastJobRow}),0)`,
    result: avgHourlyComp,
  };
  cC12.numFmt = '₱#,##0.00';
  cC12.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF' + NAVY } };
  cC12.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
  cC12.alignment = { vertical: 'middle', horizontal: 'center' };
  cC12.border = CELL_BORDER;

  // Open Jobs: Status is Col N
  ws1.mergeCells(12, 5, 12, 6);
  const cE12 = kpiRow12.getCell(5);
  cE12.value = {
    formula: `COUNTIF('Jobs & Placements'!N6:N${lastJobRow},"*open*")`,
    result: jobs.filter((j) => !j.deleted_at && String(j.status).toLowerCase().includes('open')).length,
  };
  cE12.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF' + NAVY } };
  cE12.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
  cE12.alignment = { vertical: 'middle', horizontal: 'center' };
  cE12.border = CELL_BORDER;

  // Total Applications: Applications is Col O
  const totalApps = jobs.reduce((acc, j) => acc + (Number(j.applications_count) || 0), 0);
  ws1.mergeCells(12, 7, 12, 8);
  const cG12 = kpiRow12.getCell(7);
  cG12.value = {
    formula: `SUM('Jobs & Placements'!O6:O${lastJobRow})`,
    result: totalApps,
  };
  cG12.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF' + NAVY } };
  cG12.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
  cG12.alignment = { vertical: 'middle', horizontal: 'center' };
  cG12.border = CELL_BORDER;

  ws1.getRow(13).height = 14;
  ws1.getRow(14).height = 8;

  // Section 2: User Base Composition
  applySectionHeader(ws1, 15, 'USER BASE COMPOSITION', 4);
  ws1.getRow(16).height = 6;

  applyTableHeader(ws1, 17, ['Role', 'Count', '% of Total', 'Notes']);
  ws1.getRow(17).height = 24;

  const workerCount = users.filter((u) => u.role === 'worker').length;
  const employerCount = users.filter((u) => u.role === 'employer').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  const roles = [
    {
      role: 'Worker',
      countFormula: `COUNTIF('Users Masterlist'!C6:C${lastUserRow},"worker")`,
      countVal: workerCount,
      note: 'Informal-sector & skilled trade workers',
    },
    {
      role: 'Employer',
      countFormula: `COUNTIF('Users Masterlist'!C6:C${lastUserRow},"employer")`,
      countVal: employerCount,
      note: 'Households & micro-business employers',
    },
    {
      role: 'Admin',
      countFormula: `COUNTIF('Users Masterlist'!C6:C${lastUserRow},"admin")`,
      countVal: adminCount,
      note: 'LGU / platform administrators',
    },
  ];

  roles.forEach((r, idx) => {
    const rowNum = 18 + idx;
    const rRow = ws1.getRow(rowNum);
    rRow.height = 24;

    const c1 = rRow.getCell(1);
    c1.value = r.role;
    c1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF' + DARK_TEXT } };
    c1.alignment = { vertical: 'middle', horizontal: 'left' };

    const c2 = rRow.getCell(2);
    c2.value = { formula: r.countFormula, result: r.countVal };
    c2.font = { name: 'Arial', size: 11, color: { argb: 'FF' + DARK_TEXT } };
    c2.alignment = { vertical: 'middle', horizontal: 'center' };

    const c3 = rRow.getCell(3);
    c3.value = {
      formula: `IFERROR(B${rowNum}/COUNTA('Users Masterlist'!A6:A${lastUserRow}),0)`,
      result: users.length ? r.countVal / users.length : 0,
    };
    c3.numFmt = '0.0%';
    c3.font = { name: 'Arial', size: 11, color: { argb: 'FF' + DARK_TEXT } };
    c3.alignment = { vertical: 'middle', horizontal: 'center' };

    const c4 = rRow.getCell(4);
    c4.value = r.note;
    c4.font = { name: 'Arial', size: 10.5, color: { argb: 'FF' + MUTED_TEXT } };
    c4.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    [c1, c2, c3, c4].forEach((cell) => {
      if (idx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GRAY } };
      }
      cell.border = CELL_BORDER;
    });
  });

  ws1.getRow(21).height = 14;

  // Section 3: Data Quality Flags
  applySectionHeader(ws1, 22, 'DATA QUALITY & INTEGRITY FLAGS', 8);
  ws1.getRow(23).height = 6;

  // Compute live flags
  const qualityFlags: { severity: string; text: string }[] = [];
  const testKeywords = ['test', 'asdf', 'sample', 'trial', 'qwerty'];
  jobs.forEach((j) => {
    const title = (j.title || '').toLowerCase();
    if (testKeywords.some((kw) => title.includes(kw)) || (title.length > 0 && title.length < 3)) {
      qualityFlags.push({
        severity: 'WARNING',
        text: `Potential test record in Jobs (ID #${j.id}: "${j.title}")`,
      });
    }
  });
  jobs.forEach((j) => {
    const filled = j.filled_slots ?? j.accepted_count ?? 0;
    if (j.status === 'completed' && filled === 0) {
      qualityFlags.push({
        severity: 'NOTICE',
        text: `Job #${j.id} ("${j.title}") marked completed with 0 recorded accepted worker slots.`,
      });
    }
  });
  users.forEach((u) => {
    if (u.phone && String(u.phone).replace(/\D/g, '').length < 10) {
      qualityFlags.push({
        severity: 'NOTICE',
        text: `User #${u.id} (${u.name}) has a truncated/short phone number (${u.phone}).`,
      });
    }
  });

  if (qualityFlags.length === 0) {
    qualityFlags.push({
      severity: 'PASS',
      text: 'All automated database integrity and consistency checks passed with zero anomalies.',
    });
  }

  qualityFlags.forEach((q, idx) => {
    const rNum = 24 + idx;
    const qRow = ws1.getRow(rNum);
    qRow.height = estimateWrappedRowHeight(q.text, 120, 26);

    const cSev = qRow.getCell(1);
    cSev.value = q.severity;
    if (q.severity === 'PASS') {
      cSev.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN_FILL } };
      cSev.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF' + GREEN_TEXT } };
    } else {
      cSev.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + YELLOW_FILL } };
      cSev.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF' + YELLOW_TEXT } };
    }
    cSev.alignment = { vertical: 'middle', horizontal: 'center' };
    cSev.border = CELL_BORDER;

    ws1.mergeCells(rNum, 2, rNum, 8);
    const cDesc = qRow.getCell(2);
    cDesc.value = q.text;
    cDesc.font = { name: 'Arial', size: 11, color: { argb: 'FF' + DARK_TEXT } };
    cDesc.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cDesc.border = CELL_BORDER;
    if (idx % 2 === 1) {
      cDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GRAY } };
    }
  });

  // =========================================================================
  // SHEET 2: USERS MASTERLIST
  // =========================================================================
  onProgress?.('Users Masterlist');
  await new Promise<void>((r) => setTimeout(r, 0));

  const ws2 = workbook.addWorksheet('Users Masterlist', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
  });
  ws2.columns = [
    { width: 10 }, { width: 26 }, { width: 14 }, { width: 30 },
    { width: 16 }, { width: 18 }, { width: 20 }, { width: 20 },
    { width: 18 }, { width: 18 }, { width: 22 },
  ];
  configurePrintLayout(ws2, { landscape: true, printTitlesRow: '1:5' });

  applyTitleBlock(
    ws2,
    'REGISTERED USERS DIRECTORY',
    'Complete registry of informal workers, employers, and administrators',
    11
  );
  applyTableHeader(ws2, 5, [
    'User ID', 'Full Name', 'Role', 'Email', 'Phone',
    'Municipality', 'Barangay', 'Verification Status',
    'Operational Status', 'Reputation Score', 'Date Registered',
  ]);
  ws2.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: lastUserRow, column: 11 },
  };

  if (users.length > 0) {
    users.forEach((u, idx) => {
      const rNum = 6 + idx;
      const row = ws2.getRow(rNum);
      row.height = 22;

      row.getCell(1).value = u.id;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).value = u.name || '';
      row.getCell(3).value = u.role ? u.role.toLowerCase() : 'user';
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).value = u.email || '';
      row.getCell(5).value = u.phone || '';
      row.getCell(6).value = u.municipality || 'Bulan';
      row.getCell(7).value = u.barangay || '';

      const verifCell = row.getCell(8);
      const verifStatus = getVerificationStatus(u);
      verifCell.value = verifStatus;
      formatStatusCell(verifCell, verifStatus);

      const opCell = row.getCell(9);
      const opStatus = u.is_suspended ? 'Suspended' : u.deleted_at ? 'Archived' : 'Active';
      opCell.value = opStatus;
      formatStatusCell(opCell, opStatus);

      const hasReviews =
        (u.ratings_count !== undefined && u.ratings_count > 0) ||
        (u.reviews_received_count !== undefined && u.reviews_received_count > 0) ||
        (u.reviews_count !== undefined && u.reviews_count > 0);
      const repValue =
        hasReviews && u.reputation_score
          ? Math.round(parseFloat(u.reputation_score) * 100) / 100
          : null;

      row.getCell(10).value = repValue !== null ? repValue : 'N/A';
      row.getCell(10).alignment = { horizontal: repValue !== null ? 'right' : 'center' };
      if (repValue !== null) {
        row.getCell(10).numFmt = '0.00';
      }

      if (u.created_at) {
        row.getCell(11).value = new Date(u.created_at);
        row.getCell(11).numFmt = 'yyyy-mm-dd hh:mm';
        row.getCell(11).alignment = { horizontal: 'center' };
      }

      styleBodyRow(row, 11, idx % 2 === 1, [8, 9]);
    });
  } else {
    const row = ws2.getRow(6);
    row.height = 26;
    ws2.mergeCells(6, 1, 6, 11);
    const c = row.getCell(1);
    c.value = 'No users matched the selected filters.';
    c.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF' + MUTED_TEXT } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = CELL_BORDER;
  }

  // =========================================================================
  // SHEET 3: JOBS & PLACEMENTS
  // =========================================================================
  onProgress?.('Jobs & Placements');
  await new Promise<void>((r) => setTimeout(r, 0));

  const ws3 = workbook.addWorksheet('Jobs & Placements', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
  });
  ws3.columns = [
    { width: 10 }, { width: 20 }, { width: 32 }, { width: 24 },
    { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 },
    { width: 16 }, { width: 14 }, { width: 22 }, { width: 15 },
    { width: 14 }, { width: 16 }, { width: 14 }, { width: 22 }, { width: 12 },
  ];
  configurePrintLayout(ws3, { landscape: true, printTitlesRow: '1:5' });

  applyTitleBlock(
    ws3,
    'JOB POSTINGS & OPPORTUNITIES',
    'All job listings created by employers across the platform',
    17
  );
  applyTableHeader(ws3, 5, [
    'Job ID', 'Reference Code', 'Job Title', 'Employer', 'Category',
    'Municipality', 'Barangay', 'Offered Comp (PHP)', 'Rate Unit', 'Duration',
    'Hourly Wage (PHP/hr)', 'Slots Required', 'Slots Hired', 'Status', 'Applications', 'Date Posted', 'Fill %',
  ]);
  ws3.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: lastJobRow, column: 17 },
  };

  if (jobs.length > 0) {
    jobs.forEach((j, idx) => {
      const rNum = 6 + idx;
      const row = ws3.getRow(rNum);
      row.height = 22;

      row.getCell(1).value = j.id;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).value = j.reference_number || `SKP-JOB-${j.id}`;
      row.getCell(3).value = j.title || '';
      row.getCell(4).value = j.employer?.name || '';
      row.getCell(5).value = j.category?.name || j.category || 'General';
      row.getCell(6).value = j.municipality || 'Bulan';
      row.getCell(7).value = j.barangay || '';

      const compCell = row.getCell(8);
      compCell.value = parseFloat(j.compensation) || 0;
      compCell.numFmt = '₱#,##0.00';
      compCell.alignment = { horizontal: 'right' };

      row.getCell(9).value = j.rate_unit
        ? String(j.rate_unit).replace(/_/g, ' ')
        : j.duration_type
        ? String(j.duration_type).replace(/_/g, ' ')
        : 'per day';
      row.getCell(9).alignment = { horizontal: 'center' };
      row.getCell(10).value = j.duration ? String(j.duration) : 'N/A';
      row.getCell(10).alignment = { horizontal: 'center' };

      const hourlyCell = row.getCell(11);
      hourlyCell.value = calculateNormalizedHourlyWage(
        j.compensation,
        j.rate_unit,
        j.duration,
        j.duration_unit,
        j.duration_type
      );
      hourlyCell.numFmt = '₱#,##0.00';
      hourlyCell.alignment = { horizontal: 'right' };

      const slotsReq = Number(j.slots) || 1;
      const slotsHired = Number(j.filled_slots ?? j.accepted_count) || 0;

      row.getCell(12).value = slotsReq;
      row.getCell(12).alignment = { horizontal: 'right' };
      row.getCell(13).value = slotsHired;
      row.getCell(13).alignment = { horizontal: 'right' };

      const statusCell = row.getCell(14);
      const jobStatus = j.deleted_at ? 'archived' : j.status || 'open';
      statusCell.value = jobStatus;
      formatStatusCell(statusCell, jobStatus);

      row.getCell(15).value = Number(j.applications_count) || 0;
      row.getCell(15).alignment = { horizontal: 'right' };

      if (j.created_at) {
        row.getCell(16).value = new Date(j.created_at);
        row.getCell(16).numFmt = 'yyyy-mm-dd hh:mm';
        row.getCell(16).alignment = { horizontal: 'center' };
      }

      const fillCell = row.getCell(17);
      fillCell.value = {
        formula: `IFERROR(M${rNum}/L${rNum},0)`,
        result: slotsReq ? slotsHired / slotsReq : 0,
      };
      fillCell.numFmt = '0.0%';
      fillCell.alignment = { horizontal: 'right' };

      styleBodyRow(row, 17, idx % 2 === 1, [14]);
    });
  } else {
    const row = ws3.getRow(6);
    row.height = 26;
    ws3.mergeCells(6, 1, 6, 17);
    const c = row.getCell(1);
    c.value = 'No job postings matched the selected filters.';
    c.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF' + MUTED_TEXT } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = CELL_BORDER;
  }

  // =========================================================================
  // SHEET 4: MUNICIPAL DEMOGRAPHICS
  // =========================================================================
  onProgress?.('Municipal Demographics');
  await new Promise<void>((r) => setTimeout(r, 0));

  const wsDemo = workbook.addWorksheet('Municipal Demographics', {
    views: [{ state: 'frozen', ySplit: 7, showGridLines: false }],
  });
  wsDemo.columns = [
    { width: 22 }, { width: 24 }, { width: 18 }, { width: 20 },
    { width: 20 }, { width: 16 }, { width: 22 }, { width: 20 },
  ];
  configurePrintLayout(wsDemo, { landscape: true, printTitlesRow: '1:7' });

  applyTitleBlock(
    wsDemo,
    'MUNICIPAL & BARANGAY DEMOGRAPHICS MASTER SUMMARY',
    `Workforce, employer density, and platform engagement across Bulan and neighboring municipalities | Generated ${timestamp}`,
    8
  );

  // Compute Demographics Aggregation if not provided in payload
  const demoSummaryMap = new Map<
    string,
    { municipality: string; barangay: string; workers: number; employers: number; jobs: number }
  >();
  users.forEach((u) => {
    const m = u.municipality || 'Bulan';
    const b = u.barangay || 'Unspecified';
    const key = `${m}-${b}`;
    if (!demoSummaryMap.has(key)) {
      demoSummaryMap.set(key, { municipality: m, barangay: b, workers: 0, employers: 0, jobs: 0 });
    }
    const entry = demoSummaryMap.get(key)!;
    if (u.role === 'employer') entry.employers += 1;
    else entry.workers += 1;
  });

  jobs.forEach((j) => {
    const m = j.municipality || 'Bulan';
    const b = j.barangay || 'Unspecified';
    const key = `${m}-${b}`;
    if (!demoSummaryMap.has(key)) {
      demoSummaryMap.set(key, { municipality: m, barangay: b, workers: 0, employers: 0, jobs: 0 });
    }
    demoSummaryMap.get(key)!.jobs += 1;
  });

  const demoSummaryList =
    payload.municipalSummary ||
    Array.from(demoSummaryMap.values()).sort((a, b) => {
      if (a.municipality !== b.municipality) return a.municipality.localeCompare(b.municipality);
      return b.workers + b.employers + b.jobs - (a.workers + a.employers + a.jobs);
    });

  const demoOverviewMap = new Map<
    string,
    {
      municipality: string;
      barangaysCount: number;
      workers: number;
      employers: number;
      jobs: number;
      totalImpact: number;
    }
  >();

  demoSummaryList.forEach((row) => {
    if (!demoOverviewMap.has(row.municipality)) {
      demoOverviewMap.set(row.municipality, {
        municipality: row.municipality,
        barangaysCount: 0,
        workers: 0,
        employers: 0,
        jobs: 0,
        totalImpact: 0,
      });
    }
    const entry = demoOverviewMap.get(row.municipality)!;
    entry.barangaysCount += 1;
    entry.workers += row.workers;
    entry.employers += row.employers;
    entry.jobs += row.jobs;
    entry.totalImpact += row.workers + row.employers + row.jobs;
  });

  const demoOverviewList =
    payload.municipalOverview ||
    Array.from(demoOverviewMap.values()).sort((a, b) => b.totalImpact - a.totalImpact);
  const totalDemoPlatformActivity = demoSummaryList.reduce(
    (acc, b) => acc + b.workers + b.employers + b.jobs,
    0
  );

  // SECTION 1: EXECUTIVE MUNICIPAL SUMMARY
  applySectionHeader(wsDemo, 5, 'EXECUTIVE MUNICIPAL COVERAGE SUMMARY', 8);
  wsDemo.getRow(6).height = 6;

  applyTableHeader(wsDemo, 7, [
    'Municipality', 'Active Barangays', 'Registered Workers', 'Registered Employers',
    'Total Registered Users', 'Jobs Posted', 'Total Platform Activity', 'Activity Share (%)',
  ]);

  let curDemoRow = 8;
  demoOverviewList.forEach((m, idx) => {
    const row = wsDemo.getRow(curDemoRow);
    row.height = 22;

    const c1 = row.getCell(1);
    c1.value = m.municipality;
    c1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF' + DARK_TEXT } };
    c1.alignment = { vertical: 'middle', horizontal: 'left' };
    if (idx % 2 === 1) {
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GRAY } };
    }
    c1.border = CELL_BORDER;

    row.getCell(2).value = m.barangaysCount;
    row.getCell(3).value = m.workers;
    row.getCell(4).value = m.employers;
    row.getCell(5).value = m.workers + m.employers;
    row.getCell(6).value = m.jobs;
    row.getCell(7).value = m.totalImpact;
    for (let c = 2; c <= 7; c++) {
      row.getCell(c).alignment = { horizontal: 'right' };
    }

    const c8 = row.getCell(8);
    c8.value = totalDemoPlatformActivity > 0 ? m.totalImpact / totalDemoPlatformActivity : 0;
    c8.numFmt = '0.0%';
    c8.alignment = { horizontal: 'right' };

    styleBodyRow(row, 8, idx % 2 === 1, [1]);
    curDemoRow++;
  });

  // GRAND TOTAL ROW FOR MUNICIPALITIES
  const grandTotalRow = wsDemo.getRow(curDemoRow);
  grandTotalRow.height = 26;
  grandTotalRow.getCell(1).value = 'GRAND TOTAL (ALL MUNICIPALITIES)';
  grandTotalRow.getCell(2).value = demoSummaryList.length;
  grandTotalRow.getCell(3).value = demoOverviewList.reduce((acc, m) => acc + m.workers, 0);
  grandTotalRow.getCell(4).value = demoOverviewList.reduce((acc, m) => acc + m.employers, 0);
  grandTotalRow.getCell(5).value = demoOverviewList.reduce((acc, m) => acc + m.workers + m.employers, 0);
  grandTotalRow.getCell(6).value = demoOverviewList.reduce((acc, m) => acc + m.jobs, 0);
  grandTotalRow.getCell(7).value = totalDemoPlatformActivity;
  grandTotalRow.getCell(8).value = 1.0;
  grandTotalRow.getCell(8).numFmt = '0.0%';

  for (let c = 1; c <= 8; c++) {
    const cell = grandTotalRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF' + NAVY } };
    cell.alignment = { vertical: 'middle', horizontal: c === 1 ? 'left' : 'right' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF' + NAVY } },
      bottom: { style: 'medium', color: { argb: 'FF' + NAVY } },
      left: { style: 'thin', color: { argb: 'FF' + BORDER_GRAY } },
      right: { style: 'thin', color: { argb: 'FF' + BORDER_GRAY } },
    };
  }
  curDemoRow += 2;

  // SECTION 2: BARANGAY DEMOGRAPHICS BREAKDOWN
  applySectionHeader(wsDemo, curDemoRow, 'DETAILED BARANGAY-LEVEL DEMOGRAPHICS BREAKDOWN', 8);
  curDemoRow++;
  wsDemo.getRow(curDemoRow).height = 6;
  curDemoRow++;

  applyTableHeader(wsDemo, curDemoRow, [
    'Municipality', 'Barangay', 'Registered Workers', 'Registered Employers',
    'Total Users', 'Jobs Posted', 'Total Platform Activity', 'Municipal Share (%)',
  ]);
  curDemoRow++;

  demoSummaryList.forEach((b, idx) => {
    const row = wsDemo.getRow(curDemoRow);
    row.height = 22;

    const munTotal = demoOverviewList.find((m) => m.municipality === b.municipality)?.totalImpact || 1;
    const bTotal = b.workers + b.employers + b.jobs;

    row.getCell(1).value = b.municipality;
    row.getCell(2).value = b.barangay;
    row.getCell(3).value = b.workers;
    row.getCell(4).value = b.employers;
    row.getCell(5).value = b.workers + b.employers;
    row.getCell(6).value = b.jobs;
    row.getCell(7).value = bTotal;
    for (let c = 3; c <= 7; c++) {
      row.getCell(c).alignment = { horizontal: 'right' };
    }

    const c8 = row.getCell(8);
    c8.value = munTotal > 0 ? bTotal / munTotal : 0;
    c8.numFmt = '0.0%';
    c8.alignment = { horizontal: 'right' };

    styleBodyRow(row, 8, idx % 2 === 1);
    curDemoRow++;
  });

  // =========================================================================
  // SHEET 5: VERIFICATION AUDIT
  // =========================================================================
  onProgress?.('Verification Audit');
  await new Promise<void>((r) => setTimeout(r, 0));

  const ws4 = workbook.addWorksheet('Verification Audit', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
  });
  ws4.columns = [
    { width: 10 }, { width: 24 }, { width: 14 }, { width: 20 },
    { width: 18 }, { width: 18 }, { width: 12 }, { width: 12 },
    { width: 12 }, { width: 34 }, { width: 22 },
  ];
  configurePrintLayout(ws4, { landscape: true, printTitlesRow: '1:5' });

  applyTitleBlock(
    ws4,
    'IDENTITY VERIFICATION & CREDENTIAL AUDIT',
    'Government ID review queue for worker/employer verification',
    11
  );
  applyTableHeader(ws4, 5, [
    'User ID', 'Full Name', 'Role', 'Verification Status',
    'Municipality', 'Barangay', 'Front ID', 'Back ID', 'Selfie', 'Rejection Reason', 'Submission Date',
  ]);
  ws4.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: lastVerifRow, column: 11 },
  };

  if (verifications.length > 0) {
    verifications.forEach((v, idx) => {
      const rNum = 6 + idx;
      const row = ws4.getRow(rNum);
      const rejectionText = v.rejection_reason || 'N/A';
      row.height = estimateWrappedRowHeight(rejectionText, 34, 22);

      row.getCell(1).value = v.id;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).value = v.name || '';
      row.getCell(3).value = v.role ? v.role.toLowerCase() : 'user';
      row.getCell(3).alignment = { horizontal: 'center' };

      const sCell = row.getCell(4);
      const vStatus = getVerificationStatus(v);
      sCell.value = vStatus;
      formatStatusCell(sCell, vStatus);

      row.getCell(5).value = v.municipality || 'Bulan';
      row.getCell(6).value = v.barangay || '';
      row.getCell(7).value = v.document_url ? 'Yes' : 'No';
      row.getCell(7).alignment = { horizontal: 'center' };
      row.getCell(8).value = v.document_back_url ? 'Yes' : 'No';
      row.getCell(8).alignment = { horizontal: 'center' };
      row.getCell(9).value = v.selfie_url ? 'Yes' : 'No';
      row.getCell(9).alignment = { horizontal: 'center' };
      row.getCell(10).value = rejectionText;
      row.getCell(10).alignment = { horizontal: 'left', wrapText: true };

      if (v.created_at || v.updated_at) {
        row.getCell(11).value = new Date(v.created_at || v.updated_at);
        row.getCell(11).numFmt = 'yyyy-mm-dd hh:mm';
        row.getCell(11).alignment = { horizontal: 'center' };
      }

      styleBodyRow(row, 11, idx % 2 === 1, [4]);
    });
  } else {
    const row = ws4.getRow(6);
    row.height = 26;
    ws4.mergeCells(6, 1, 6, 11);
    const c = row.getCell(1);
    c.value = 'No verification requests currently in the queue — all registered users are already approved.';
    c.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF' + MUTED_TEXT } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = CELL_BORDER;
  }

  // =========================================================================
  // SHEET 6: COMMUNITY REPORTS
  // =========================================================================
  onProgress?.('Community Reports');
  await new Promise<void>((r) => setTimeout(r, 0));

  const ws5 = workbook.addWorksheet('Community Reports', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
  });
  ws5.columns = [
    { width: 12 }, { width: 22 }, { width: 16 }, { width: 14 },
    { width: 24 }, { width: 40 }, { width: 18 }, { width: 22 }, { width: 22 },
  ];
  configurePrintLayout(ws5, { landscape: true, printTitlesRow: '1:5' });

  applyTitleBlock(
    ws5,
    'COMMUNITY SAFETY & INCIDENT REPORTS',
    'User-submitted moderation reports and harassment/dispute flags',
    9
  );
  applyTableHeader(ws5, 5, [
    'Report ID', 'Violation Type', 'Target Type', 'Target ID',
    'Reporter Name', 'Description', 'Status', 'Date Reported', 'Date Resolved',
  ]);
  ws5.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: lastReportRow, column: 9 },
  };

  if (reports.length > 0) {
    reports.forEach((r, idx) => {
      const rNum = 6 + idx;
      const row = ws5.getRow(rNum);
      const descText = r.description || '';
      row.height = estimateWrappedRowHeight(descText, 40, 22);

      row.getCell(1).value = r.id;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).value = formatCSVStatus(r.type);
      row.getCell(3).value = r.reportable_type ? humanizeModel(r.reportable_type) : 'N/A';
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).value = r.reportable_id ?? 'N/A';
      row.getCell(4).alignment = { horizontal: 'center' };
      row.getCell(5).value = r.reporter?.name || 'Anonymous';
      row.getCell(6).value = descText;
      row.getCell(6).alignment = { horizontal: 'left', wrapText: true };

      const sCell = row.getCell(7);
      sCell.value = r.status || 'pending';
      formatStatusCell(sCell, r.status || 'pending');

      if (r.created_at) {
        row.getCell(8).value = new Date(r.created_at);
        row.getCell(8).numFmt = 'yyyy-mm-dd hh:mm';
        row.getCell(8).alignment = { horizontal: 'center' };
      }
      if (r.resolved_at) {
        row.getCell(9).value = new Date(r.resolved_at);
        row.getCell(9).numFmt = 'yyyy-mm-dd hh:mm';
        row.getCell(9).alignment = { horizontal: 'center' };
      }

      styleBodyRow(row, 9, idx % 2 === 1, [7]);
    });
  } else {
    const row = ws5.getRow(6);
    row.height = 26;
    ws5.mergeCells(6, 1, 6, 9);
    const c = row.getCell(1);
    c.value = 'No incident or moderation reports have been logged for this reporting period.';
    c.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF' + MUTED_TEXT } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = CELL_BORDER;
  }

  // =========================================================================
  // SHEET 7: WAGE BENCHMARKS
  // =========================================================================
  onProgress?.('Wage Benchmarks');
  await new Promise<void>((r) => setTimeout(r, 0));

  const ws6 = workbook.addWorksheet('Wage Benchmarks', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
  });
  ws6.columns = [
    { width: 26 }, { width: 18 }, { width: 26 }, { width: 22 }, { width: 22 },
  ];
  configurePrintLayout(ws6, { landscape: true, printTitlesRow: '1:5' });

  applyTitleBlock(
    ws6,
    'WAGE & TRADE CATEGORY BENCHMARKS',
    'Normalized hourly wage (PHP/hr) computed live from Jobs & Placements — updates automatically as Jobs sheet grows',
    5
  );
  applyTableHeader(ws6, 5, [
    'Trade Category', 'Job Postings', 'Avg. Hourly Wage (PHP/hr)', 'Lowest (PHP/hr)', 'Highest (PHP/hr)',
  ]);

  const categorySet = new Set<string>();
  jobs.forEach((j) => {
    const catName = String(j.category?.name || j.category || 'General').trim();
    if (catName) categorySet.add(catName);
  });

  const sortedCategories = Array.from(categorySet).sort();

  if (sortedCategories.length > 0) {
    ws6.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5 + sortedCategories.length, column: 5 },
    };

    sortedCategories.forEach((cat, idx) => {
      const rNum = 6 + idx;
      const row = ws6.getRow(rNum);
      row.height = 24;

      const c1 = row.getCell(1);
      c1.value = cat;
      c1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF' + DARK_TEXT } };
      c1.alignment = { vertical: 'middle', horizontal: 'left' };
      if (idx % 2 === 1) {
        c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GRAY } };
      }
      c1.border = CELL_BORDER;

      const catJobsAll = jobs.filter(
        (j) => String(j.category?.name || j.category || 'General').trim() === cat
      );
      const catHourlyWages = catJobsAll
        .map((j) =>
          calculateNormalizedHourlyWage(
            j.compensation,
            j.rate_unit,
            j.duration,
            j.duration_unit,
            j.duration_type
          )
        )
        .filter((w) => w > 0);

      const catAvg =
        catHourlyWages.length > 0
          ? catHourlyWages.reduce((acc, w) => acc + w, 0) / catHourlyWages.length
          : 0;
      const catMin = catHourlyWages.length > 0 ? Math.min(...catHourlyWages) : 0;
      const catMax = catHourlyWages.length > 0 ? Math.max(...catHourlyWages) : 0;

      const c2 = row.getCell(2);
      c2.value = {
        formula: `COUNTIF('Jobs & Placements'!E6:E${lastJobRow}, A${rNum})`,
        result: catJobsAll.length,
      };
      c2.alignment = { horizontal: 'center' };

      const c3 = row.getCell(3);
      c3.value = {
        formula: `IFERROR(AVERAGEIFS('Jobs & Placements'!K6:K${lastJobRow}, 'Jobs & Placements'!E6:E${lastJobRow}, A${rNum}, 'Jobs & Placements'!K6:K${lastJobRow}, ">0"), 0)`,
        result: catAvg,
      };
      c3.numFmt = '₱#,##0.00';
      c3.alignment = { horizontal: 'right' };

      const c4 = row.getCell(4);
      c4.value = {
        formula: `IFERROR(MINIFS('Jobs & Placements'!K6:K${lastJobRow}, 'Jobs & Placements'!E6:E${lastJobRow}, A${rNum}, 'Jobs & Placements'!K6:K${lastJobRow}, ">0"), 0)`,
        result: catMin,
      };
      c4.numFmt = '₱#,##0.00';
      c4.alignment = { horizontal: 'right' };

      const c5 = row.getCell(5);
      c5.value = {
        formula: `IFERROR(MAXIFS('Jobs & Placements'!K6:K${lastJobRow}, 'Jobs & Placements'!E6:E${lastJobRow}, A${rNum}, 'Jobs & Placements'!K6:K${lastJobRow}, ">0"), 0)`,
        result: catMax,
      };
      c5.numFmt = '₱#,##0.00';
      c5.alignment = { horizontal: 'right' };

      styleBodyRow(row, 5, idx % 2 === 1, [1]);
    });

    // Note row (Merged & Wrapped)
    const noteRowNum = 7 + sortedCategories.length;
    const noteRow = ws6.getRow(noteRowNum);
    noteRow.height = 30;
    ws6.mergeCells(noteRowNum, 1, noteRowNum, 5);
    const cNote = noteRow.getCell(1);
    cNote.value =
      'Note: All wage figures are normalized to PHP/hour and computed live from Jobs & Placements (Col K) using Excel formulas (AVERAGEIFS, MINIFS, MAXIFS).';
    cNote.font = { name: 'Arial', size: 10.5, italic: true, color: { argb: 'FF' + MUTED_TEXT } };
    cNote.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  } else {
    const row = ws6.getRow(6);
    row.height = 28;
    ws6.mergeCells(6, 1, 6, 5);
    const c = row.getCell(1);
    c.value = 'No job postings available for this reporting period — wage benchmarks cannot be computed.';
    c.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF' + MUTED_TEXT } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = CELL_BORDER;
  }

  // Generate buffer and return as Blob
  onProgress?.('Compiling Workbook');
  await new Promise<void>((r) => setTimeout(r, 0));

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ── SHARED MULTI-SECTION .XLSX EXPORTER FOR ALL DASHBOARD PAGES ──────────────
function sanitizeSheetName(name: string, usedNames: Set<string>): string {
  const base = (name || 'Sheet')
    .replace(/[\[\]\*\/\\\?:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28) || 'Sheet';
  let candidate = base;
  let counter = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const suffix = ` (${counter++})`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function isStatusHeader(header: string): boolean {
  const h = (header || '').toLowerCase();
  return (
    h === 'status' ||
    h.includes('status') ||
    h === 'severity' ||
    h === 'priority' ||
    h.includes('verification')
  );
}

export async function exportMultiSectionExcel(
  filename: string,
  reportTitle: string,
  metadata: [string, string][],
  sections: CSVSection[]
): Promise<void> {
  const ExcelJSModule = await import('exceljs');
  const ExcelJSClass = (ExcelJSModule.default || ExcelJSModule) as typeof import('exceljs');
  const workbook = new ExcelJSClass.Workbook();
  workbook.creator = 'SIKAP Skills & Job Matching Platform';
  workbook.lastModifiedBy = 'SIKAP Platform Administrator';
  workbook.created = new Date();
  workbook.modified = new Date();

  const subtitle =
    metadata.map(([k, v]) => `${k}: ${v}`).join('  |  ') ||
    `Generated ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}`;

  const usedSheetNames = new Set<string>();

  // If there are multiple sections, create a Summary metadata sheet + one sheet per data section
  if (sections.length > 1) {
    const wsSummary = workbook.addWorksheet(sanitizeSheetName('Summary', usedSheetNames), {
      views: [{ showGridLines: false }],
    });
    wsSummary.columns = [{ width: 28 }, { width: 44 }, { width: 18 }];
    configurePrintLayout(wsSummary, { landscape: true });

    applyTitleBlock(wsSummary, reportTitle, subtitle, 3);
    applySectionHeader(wsSummary, 5, 'REPORT METADATA & INCLUDED SECTIONS', 3);
    wsSummary.getRow(6).height = 6;

    let r = 7;
    metadata.forEach(([key, val], idx) => {
      const row = wsSummary.getRow(r);
      row.height = 22;
      const c1 = row.getCell(1);
      c1.value = key;
      c1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF' + DARK_TEXT } };
      wsSummary.mergeCells(r, 2, r, 3);
      const c2 = row.getCell(2);
      c2.value = val;
      c2.font = { name: 'Arial', size: 11, color: { argb: 'FF' + DARK_TEXT } };
      c2.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      [c1, c2].forEach((c) => {
        if (idx % 2 === 1) {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GRAY } };
        }
        c.border = CELL_BORDER;
      });
      r++;
    });

    r += 1;
    applyTableHeader(wsSummary, r, ['Section / Worksheet', 'Columns', 'Record Count']);
    r++;
    sections.forEach((sec, idx) => {
      const row = wsSummary.getRow(r);
      row.height = 22;
      row.getCell(1).value = sec.title;
      row.getCell(2).value = sec.headers.join(', ');
      row.getCell(2).alignment = { horizontal: 'left', wrapText: true };
      row.getCell(3).value = sec.rows.length;
      row.getCell(3).alignment = { horizontal: 'right' };
      row.height = estimateWrappedRowHeight(sec.headers.join(', '), 44, 22);
      styleBodyRow(row, 3, idx % 2 === 1);
      r++;
    });
  }

  sections.forEach((section) => {
    const headers = section.headers && section.headers.length > 0 ? section.headers : ['Value'];
    const colCount = headers.length;
    const sheetName = sanitizeSheetName(
      sections.length === 1 ? reportTitle.slice(0, 28) || 'Report' : section.title,
      usedSheetNames
    );

    const ws = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
    });
    configurePrintLayout(ws, { landscape: true, printTitlesRow: '1:5' });

    // Compute smart column widths from headers & sample values
    const colWidths = headers.map((h, colIdx) => {
      let maxLen = String(h).length + 4;
      section.rows.slice(0, 100).forEach((row) => {
        const val = row[colIdx];
        if (val !== null && val !== undefined) {
          const strLen = String(val).split(/\r?\n/)[0].length;
          if (strLen > maxLen) maxLen = strLen;
        }
      });
      return Math.min(44, Math.max(14, maxLen + 3));
    });
    ws.columns = colWidths.map((w) => ({ width: w }));

    applyTitleBlock(
      ws,
      `${reportTitle} — ${section.title}`,
      subtitle,
      Math.max(colCount, 2)
    );
    applyTableHeader(ws, 5, headers);

    const lastRow = 5 + Math.max(section.rows.length, 1);
    ws.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: lastRow, column: colCount },
    };

    if (section.rows.length > 0) {
      section.rows.forEach((rawRow, idx) => {
        const rNum = 6 + idx;
        const row = ws.getRow(rNum);
        const statusCols: number[] = [];
        let maxHeight = 22;

        headers.forEach((h, cIdx) => {
          const colNum = cIdx + 1;
          const cell = row.getCell(colNum);
          const rawVal = rawRow[cIdx];

          if (rawVal === null || rawVal === undefined) {
            cell.value = '';
          } else if (typeof rawVal === 'number' || typeof rawVal === 'boolean') {
            cell.value = rawVal;
            if (typeof rawVal === 'number') {
              cell.alignment = { horizontal: 'right' };
            } else {
              cell.alignment = { horizontal: 'center' };
            }
          } else {
            const text = String(rawVal);
            cell.value = text;
            if (isStatusHeader(h)) {
              formatStatusCell(cell, text);
              statusCols.push(colNum);
            } else {
              const wrap = colWidths[cIdx] >= 28 || text.length > 35;
              cell.alignment = { horizontal: 'left', wrapText: wrap };
              if (wrap) {
                const hEst = estimateWrappedRowHeight(text, colWidths[cIdx], 22);
                if (hEst > maxHeight) maxHeight = hEst;
              }
            }
          }
        });

        row.height = maxHeight;
        styleBodyRow(row, colCount, idx % 2 === 1, statusCols);
      });
    } else {
      const row = ws.getRow(6);
      row.height = 26;
      if (colCount > 1) ws.mergeCells(6, 1, 6, colCount);
      const c = row.getCell(1);
      c.value = 'No records available for the selected filters.';
      c.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF' + MUTED_TEXT } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      c.border = CELL_BORDER;
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const baseName = filename.replace(/\.csv$/i, '').replace(/\.xlsx$/i, '');
  downloadExcelBlob(blob, `${baseName}.xlsx`);
}

export function downloadExcelBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
