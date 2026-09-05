import ExcelJS from 'exceljs';

export interface ExportDataPayload {
  users: any[];
  jobs: any[];
  verifications: any[];
  reports: any[];
  analytics?: any;
}

const NAVY = '1F3864';
const BLUE_HEADER = '2E5395';
const ICE_BLUE = 'EAF0FA';
const LIGHT_GRAY = 'F2F2F2';
const WHITE = 'FFFFFF';
const GREEN_FILL = 'C6EFCE';
const GREEN_TEXT = '006100';
const YELLOW_FILL = 'FFF2CC';
const YELLOW_TEXT = '833C00';
const RED_FILL = 'FCE4D6';
const RED_TEXT = 'C00000';

function applyTitleBlock(worksheet: ExcelJS.Worksheet, title: string, subtitle: string, maxCol = 8) {
  // Row 1: Main Title
  const titleRow = worksheet.getRow(1);
  titleRow.height = 36;
  for (let i = 1; i <= maxCol; i++) {
    const cell = titleRow.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + NAVY } };
    cell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF' + WHITE } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  }
  titleRow.getCell(1).value = `  ${title.toUpperCase()}`;

  // Row 2: Blank Spacer
  worksheet.getRow(2).height = 8;

  // Row 3: Subtitle Metadata
  const subRow = worksheet.getRow(3);
  subRow.height = 20;
  for (let i = 1; i <= maxCol; i++) {
    const cell = subRow.getCell(i);
    cell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF595959' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  }
  subRow.getCell(1).value = `  ${subtitle}`;

  // Row 4: Blank Spacer
  worksheet.getRow(4).height = 12;
}

function applySectionHeader(worksheet: ExcelJS.Worksheet, rowNumber: number, title: string, maxCol = 8) {
  const row = worksheet.getRow(rowNumber);
  row.height = 24;
  for (let i = 1; i <= maxCol; i++) {
    const cell = row.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BLUE_HEADER } };
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF' + WHITE } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  }
  row.getCell(1).value = `  ${title.toUpperCase()}`;
}

function applyTableHeader(worksheet: ExcelJS.Worksheet, rowNumber: number, headers: string[]) {
  const row = worksheet.getRow(rowNumber);
  row.height = 26;
  headers.forEach((h, idx) => {
    const cell = row.getCell(idx + 1);
    cell.value = h;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + NAVY } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF' + WHITE } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1F3864' } },
      bottom: { style: 'medium', color: { argb: 'FF1F3864' } },
      left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    };
  });
}

function formatStatusCell(cell: ExcelJS.Cell, status: string) {
  const s = String(status || '').toLowerCase();
  if (['approved', 'active', 'open', 'completed', 'resolved', 'hired'].includes(s)) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + GREEN_FILL } };
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF' + GREEN_TEXT } };
  } else if (['pending', 'pending_review', 'pending_email_verification', 'pending_id_upload', 'requested', 'offer_sent', 'in_progress', 'closed_in_progress', 'investigating'].includes(s)) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + YELLOW_FILL } };
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF' + YELLOW_TEXT } };
  } else if (['rejected', 'banned', 'suspended', 'cancelled', 'dismissed', 'inactive'].includes(s)) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + RED_FILL } };
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF' + RED_TEXT } };
  } else {
    cell.font = { name: 'Arial', size: 9.5 };
  }
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
}

export async function generateMasterExcelWorkbook(payload: ExportDataPayload): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIKAP Skills & Job Matching Platform';
  workbook.lastModifiedBy = 'SIKAP Platform Administrator';
  workbook.created = new Date();
  workbook.modified = new Date();

  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const { users = [], jobs = [], verifications = [], reports = [] } = payload;
  const jobsCount = Math.max(jobs.length, 1);
  const usersCount = Math.max(users.length, 1);
  const lastJobRow = 5 + jobsCount;
  const lastUserRow = 6 + usersCount;

  // =========================================================================
  // SHEET 1: EXECUTIVE SUMMARY
  // =========================================================================
  const ws1 = workbook.addWorksheet('Executive Summary', {
    views: [{ showGridLines: true }],
  });
  ws1.columns = [
    { width: 26 }, { width: 18 }, { width: 24 }, { width: 18 },
    { width: 26 }, { width: 18 }, { width: 24 }, { width: 18 },
  ];

  applyTitleBlock(
    ws1,
    'SIKAP PLATFORM MASTER REPORT',
    `Complete Platform Snapshot  |  Generated ${timestamp}  |  Classification: Platform Master Database Snapshot`,
    8
  );

  applySectionHeader(ws1, 5, 'KEY PERFORMANCE INDICATORS', 8);
  ws1.getRow(6).height = 8; // Spacer

  // KPI Row 1 (Row 7: Labels, Row 8: Values)
  const kpiRow7 = ws1.getRow(7);
  kpiRow7.height = 18;
  const kpiLabels1 = [
    { col: 1, text: 'Total Registered Users' },
    { col: 3, text: 'Total Jobs Posted' },
    { col: 5, text: 'Pending Verifications' },
    { col: 7, text: 'Moderation Reports' },
  ];
  kpiLabels1.forEach((k) => {
    const c = kpiRow7.getCell(k.col);
    c.value = k.text;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF595959' } };
    c.alignment = { vertical: 'bottom', horizontal: 'center' };
  });

  const kpiRow8 = ws1.getRow(8);
  kpiRow8.height = 32;
  // Users Count
  const cA8 = kpiRow8.getCell(1);
  cA8.value = { formula: `COUNTA(Users!A7:A${Math.max(lastUserRow, 200)})`, result: users.length };
  cA8.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF' + NAVY } };
  cA8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
  cA8.alignment = { vertical: 'middle', horizontal: 'center' };

  // Jobs Count
  const cC8 = kpiRow8.getCell(3);
  cC8.value = { formula: `COUNTA(Jobs!A6:A${Math.max(lastJobRow, 200)})`, result: jobs.length };
  cC8.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF' + NAVY } };
  cC8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
  cC8.alignment = { vertical: 'middle', horizontal: 'center' };

  // Pending Verif
  const cE8 = kpiRow8.getCell(5);
  cE8.value = { formula: `COUNTIF(Verification!D6:D200,"*pending*")`, result: verifications.filter((v) => String(v.verification_status).includes('pending')).length };
  cE8.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF' + NAVY } };
  cE8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
  cE8.alignment = { vertical: 'middle', horizontal: 'center' };

  // Reports Count
  const cG8 = kpiRow8.getCell(7);
  cG8.value = { formula: `COUNTA(Reports!A6:A200)`, result: reports.length };
  cG8.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF' + NAVY } };
  cG8.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
  cG8.alignment = { vertical: 'middle', horizontal: 'center' };

  ws1.getRow(9).height = 10; // Spacer
  ws1.getRow(10).height = 6;

  // KPI Row 2 (Row 11: Labels, Row 12: Values)
  const kpiRow11 = ws1.getRow(11);
  kpiRow11.height = 18;
  const kpiLabels2 = [
    { col: 1, text: 'Job Fill Rate' },
    { col: 3, text: 'Avg. Compensation' },
    { col: 5, text: 'Open Job Postings' },
    { col: 7, text: 'Total Applications' },
  ];
  kpiLabels2.forEach((k) => {
    const c = kpiRow11.getCell(k.col);
    c.value = k.text;
    c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF595959' } };
    c.alignment = { vertical: 'bottom', horizontal: 'center' };
  });

  const kpiRow12 = ws1.getRow(12);
  kpiRow12.height = 32;
  // Fill Rate
  const cA12 = kpiRow12.getCell(1);
  cA12.value = { formula: `IFERROR(SUM(Jobs!I6:I200)/SUM(Jobs!H6:H200),0)`, result: 0 };
  cA12.numFmt = '0.0%';
  cA12.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF' + NAVY } };
  cA12.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
  cA12.alignment = { vertical: 'middle', horizontal: 'center' };

  // Avg Comp
  const validCompJobs = jobs.filter((j) => parseFloat(j.compensation) > 0);
  const avgComp = validCompJobs.length > 0
    ? validCompJobs.reduce((acc, j) => acc + parseFloat(j.compensation), 0) / validCompJobs.length
    : 0;
  const cC12 = kpiRow12.getCell(3);
  cC12.value = { formula: `IFERROR(AVERAGE(Jobs!F6:F200),0)`, result: avgComp };
  cC12.numFmt = '₱#,##0.00';
  cC12.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF' + NAVY } };
  cC12.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
  cC12.alignment = { vertical: 'middle', horizontal: 'center' };

  // Open Jobs
  const cE12 = kpiRow12.getCell(5);
  cE12.value = { formula: `COUNTIF(Jobs!J6:J200,"*open*")`, result: jobs.filter((j) => String(j.status).includes('open')).length };
  cE12.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF' + NAVY } };
  cE12.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
  cE12.alignment = { vertical: 'middle', horizontal: 'center' };

  // Applications
  const totalApps = jobs.reduce((acc, j) => acc + (Number(j.applications_count) || 0), 0);
  const cG12 = kpiRow12.getCell(7);
  cG12.value = { formula: `SUM(Jobs!K6:K200)`, result: totalApps };
  cG12.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF' + NAVY } };
  cG12.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + ICE_BLUE } };
  cG12.alignment = { vertical: 'middle', horizontal: 'center' };

  ws1.getRow(13).height = 14;
  ws1.getRow(14).height = 8;

  // Section 2: User Base Composition
  applySectionHeader(ws1, 15, 'USER BASE COMPOSITION', 4);
  ws1.getRow(16).height = 6;

  const demoHead = ws1.getRow(17);
  demoHead.height = 22;
  ['Role', 'Count', '% of Total'].forEach((h, idx) => {
    const c = demoHead.getCell(idx + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + NAVY } };
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF' + WHITE } };
    c.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'left' : 'center' };
  });

  const workerCount = users.filter((u) => u.role === 'worker').length;
  const employerCount = users.filter((u) => u.role === 'employer').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  const roles = [
    { role: 'Worker', countFormula: `COUNTIF(Users!C7:C200,"worker")`, countVal: workerCount },
    { role: 'Employer', countFormula: `COUNTIF(Users!C7:C200,"employer")`, countVal: employerCount },
    { role: 'Admin', countFormula: `COUNTIF(Users!C7:C200,"admin")`, countVal: adminCount },
  ];

  roles.forEach((r, idx) => {
    const rowNum = 18 + idx;
    const rRow = ws1.getRow(rowNum);
    rRow.height = 20;

    const c1 = rRow.getCell(1);
    c1.value = r.role;
    c1.font = { name: 'Arial', size: 10, bold: true };
    c1.alignment = { vertical: 'middle', horizontal: 'left' };

    const c2 = rRow.getCell(2);
    c2.value = { formula: r.countFormula, result: r.countVal };
    c2.font = { name: 'Arial', size: 10 };
    c2.alignment = { vertical: 'middle', horizontal: 'center' };

    const c3 = rRow.getCell(3);
    c3.value = { formula: `IFERROR(B${rowNum}/COUNTA(Users!A7:A200),0)`, result: users.length ? r.countVal / users.length : 0 };
    c3.numFmt = '0.0%';
    c3.font = { name: 'Arial', size: 10 };
    c3.alignment = { vertical: 'middle', horizontal: 'center' };

    [c1, c2, c3].forEach((cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
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
      qualityFlags.push({ severity: '⚠️ WARNING', text: `Potential test record in Jobs (ID #${j.id}: "${j.title}")` });
    }
  });
  jobs.forEach((j) => {
    if (j.status === 'completed' && (!j.accepted_count || j.accepted_count === 0)) {
      qualityFlags.push({ severity: '⚠️ NOTICE', text: `Job #${j.id} ("${j.title}") marked completed with 0 recorded accepted worker slots.` });
    }
  });
  users.forEach((u) => {
    if (u.phone && String(u.phone).replace(/\D/g, '').length < 10) {
      qualityFlags.push({ severity: '⚠️ NOTICE', text: `User #${u.id} (${u.name}) has a truncated/short phone number (${u.phone}).` });
    }
  });

  if (qualityFlags.length === 0) {
    qualityFlags.push({ severity: '✅ PASS', text: 'All automated database integrity and consistency checks passed with zero anomalies.' });
  }

  qualityFlags.forEach((q, idx) => {
    const rNum = 24 + idx;
    const qRow = ws1.getRow(rNum);
    qRow.height = 22;
    const cSev = qRow.getCell(1);
    cSev.value = q.severity;
    cSev.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: q.severity.includes('PASS') ? 'FF006100' : 'FF833C00' } };
    cSev.alignment = { vertical: 'middle', horizontal: 'center' };

    const cDesc = qRow.getCell(2);
    cDesc.value = q.text;
    cDesc.font = { name: 'Arial', size: 9.5 };
    cDesc.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  // =========================================================================
  // SHEET 2: USERS DIRECTORY
  // =========================================================================
  const ws2 = workbook.addWorksheet('Users', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }],
  });
  ws2.columns = [
    { width: 10 }, { width: 24 }, { width: 14 }, { width: 30 },
    { width: 16 }, { width: 18 }, { width: 18 }, { width: 20 },
    { width: 18 }, { width: 16 }, { width: 22 },
  ];

  applyTitleBlock(ws2, 'REGISTERED USERS DIRECTORY', 'Complete registry of informal workers, employers, and administrators', 11);
  applyTableHeader(ws2, 5, [
    'User ID', 'Full Name', 'Role', 'Email', 'Phone',
    'Municipality', 'Barangay', 'Verification Status',
    'Operational Status', 'Reputation Score', 'Date Registered',
  ]);

  users.forEach((u, idx) => {
    const rNum = 6 + idx;
    const row = ws2.getRow(rNum);
    row.height = 20;

    row.getCell(1).value = u.id;
    row.getCell(2).value = u.name || '';
    row.getCell(3).value = u.role ? u.role.toLowerCase() : 'user';
    row.getCell(4).value = u.email || '';
    row.getCell(5).value = u.phone || '';
    row.getCell(6).value = u.municipality || 'Bulan';
    row.getCell(7).value = u.barangay || '';
    
    const verifCell = row.getCell(8);
    verifCell.value = u.verification_status || 'approved';
    formatStatusCell(verifCell, u.verification_status || 'approved');

    const opCell = row.getCell(9);
    const opStatus = u.is_suspended ? 'Suspended' : u.deleted_at ? 'Archived' : 'Active';
    opCell.value = opStatus;
    formatStatusCell(opCell, opStatus);

    row.getCell(10).value = u.reputation_score ? parseFloat(u.reputation_score) : null;
    row.getCell(10).numFmt = '0.0';

    if (u.created_at) {
      row.getCell(11).value = new Date(u.created_at);
      row.getCell(11).numFmt = 'yyyy-mm-dd hh:mm';
    }

    // Banded zebra styling
    if (idx % 2 === 1) {
      for (let c = 1; c <= 11; c++) {
        if (c !== 8 && c !== 9) {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GRAY } };
        }
      }
    }
  });

  // =========================================================================
  // SHEET 3: JOBS DIRECTORY
  // =========================================================================
  const ws3 = workbook.addWorksheet('Jobs', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }],
  });
  ws3.columns = [
    { width: 10 }, { width: 22 }, { width: 32 }, { width: 24 },
    { width: 18 }, { width: 20 }, { width: 16 }, { width: 14 },
    { width: 14 }, { width: 18 }, { width: 14 }, { width: 22 }, { width: 14 },
  ];

  applyTitleBlock(ws3, 'JOB POSTINGS & OPPORTUNITIES', 'All job listings created by employers across the platform', 13);
  applyTableHeader(ws3, 5, [
    'Job ID', 'Reference Code', 'Job Title', 'Employer', 'Category',
    'Compensation (PHP)', 'Duration Type', 'Slots Required', 'Slots Hired',
    'Status', 'Applications', 'Date Posted', 'Fill %',
  ]);

  jobs.forEach((j, idx) => {
    const rNum = 6 + idx;
    const row = ws3.getRow(rNum);
    row.height = 20;

    row.getCell(1).value = j.id;
    row.getCell(2).value = j.reference_number || `SKP-JOB-${j.id}`;
    row.getCell(3).value = j.title || '';
    row.getCell(4).value = j.employer?.name || '';
    row.getCell(5).value = j.category || 'General';

    const compCell = row.getCell(6);
    compCell.value = parseFloat(j.compensation) || 0;
    compCell.numFmt = '₱#,##0.00';

    row.getCell(7).value = j.duration_type ? j.duration_type.replace(/_/g, ' ') : 'project-based';
    row.getCell(8).value = Number(j.slots) || 1;
    row.getCell(9).value = Number(j.accepted_count) || 0;

    const statusCell = row.getCell(10);
    statusCell.value = j.status || 'open';
    formatStatusCell(statusCell, j.status || 'open');

    row.getCell(11).value = Number(j.applications_count) || 0;

    if (j.created_at) {
      row.getCell(12).value = new Date(j.created_at);
      row.getCell(12).numFmt = 'yyyy-mm-dd hh:mm';
    }

    const fillCell = row.getCell(13);
    fillCell.value = { formula: `IFERROR(I${rNum}/H${rNum},0)`, result: j.slots ? (j.accepted_count || 0) / j.slots : 0 };
    fillCell.numFmt = '0.0%';

    if (idx % 2 === 1) {
      for (let c = 1; c <= 13; c++) {
        if (c !== 10) {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GRAY } };
        }
      }
    }
  });

  // =========================================================================
  // SHEET 4: VERIFICATION AUDIT
  // =========================================================================
  const ws4 = workbook.addWorksheet('Verification', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }],
  });
  ws4.columns = [
    { width: 10 }, { width: 24 }, { width: 14 }, { width: 20 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 28 }, { width: 22 },
  ];

  applyTitleBlock(ws4, 'IDENTITY VERIFICATION & CREDENTIAL AUDIT', 'Government ID review queue for worker/employer verification', 9);
  applyTableHeader(ws4, 5, [
    'User ID', 'Full Name', 'Role', 'Verification Status',
    'Front ID', 'Back ID', 'Selfie', 'Rejection Reason', 'Submission Date',
  ]);

  if (verifications.length > 0) {
    verifications.forEach((v, idx) => {
      const rNum = 6 + idx;
      const row = ws4.getRow(rNum);
      row.height = 20;

      row.getCell(1).value = v.id;
      row.getCell(2).value = v.name || '';
      row.getCell(3).value = v.role ? v.role.toLowerCase() : 'user';

      const sCell = row.getCell(4);
      sCell.value = v.verification_status || 'approved';
      formatStatusCell(sCell, v.verification_status || 'approved');

      row.getCell(5).value = v.document_url ? 'Yes' : 'No';
      row.getCell(6).value = v.document_back_url ? 'Yes' : 'No';
      row.getCell(7).value = v.selfie_url ? 'Yes' : 'No';
      row.getCell(8).value = v.rejection_reason || 'N/A';

      if (v.created_at) {
        row.getCell(9).value = new Date(v.created_at);
        row.getCell(9).numFmt = 'yyyy-mm-dd hh:mm';
      }

      if (idx % 2 === 1) {
        for (let c = 1; c <= 9; c++) {
          if (c !== 4) {
            row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GRAY } };
          }
        }
      }
    });
  } else {
    const row = ws4.getRow(6);
    row.height = 24;
    const c = row.getCell(2);
    c.value = 'No verification requests currently in the queue — all registered users are already approved.';
    c.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF595959' } };
  }

  // =========================================================================
  // SHEET 5: INCIDENT & MODERATION REPORTS
  // =========================================================================
  const ws5 = workbook.addWorksheet('Reports', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }],
  });
  ws5.columns = [
    { width: 12 }, { width: 22 }, { width: 16 }, { width: 14 },
    { width: 24 }, { width: 34 }, { width: 18 }, { width: 22 }, { width: 22 },
  ];

  applyTitleBlock(ws5, 'COMMUNITY SAFETY & INCIDENT REPORTS', 'User-submitted moderation reports and harassment/dispute flags', 9);
  applyTableHeader(ws5, 5, [
    'Report ID', 'Violation Type', 'Target Type', 'Target ID',
    'Reporter Name', 'Description', 'Status', 'Date Reported', 'Date Resolved',
  ]);

  if (reports.length > 0) {
    reports.forEach((r, idx) => {
      const rNum = 6 + idx;
      const row = ws5.getRow(rNum);
      row.height = 20;

      row.getCell(1).value = r.id;
      row.getCell(2).value = r.type ? r.type.replace(/_/g, ' ') : 'Other';
      row.getCell(3).value = r.reportable_type ? r.reportable_type.replace(/_/g, ' ') : 'N/A';
      row.getCell(4).value = r.reportable_id ?? 'N/A';
      row.getCell(5).value = r.reporter?.name || 'Anonymous';
      row.getCell(6).value = r.description || '';

      const sCell = row.getCell(7);
      sCell.value = r.status || 'pending';
      formatStatusCell(sCell, r.status || 'pending');

      if (r.created_at) {
        row.getCell(8).value = new Date(r.created_at);
        row.getCell(8).numFmt = 'yyyy-mm-dd hh:mm';
      }
      if (r.resolved_at) {
        row.getCell(9).value = new Date(r.resolved_at);
        row.getCell(9).numFmt = 'yyyy-mm-dd hh:mm';
      }

      if (idx % 2 === 1) {
        for (let c = 1; c <= 9; c++) {
          if (c !== 7) {
            row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GRAY } };
          }
        }
      }
    });
  } else {
    const row = ws5.getRow(6);
    row.height = 24;
    const c = row.getCell(2);
    c.value = 'No incident or moderation reports have been logged for this reporting period.';
    c.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF595959' } };
  }

  // =========================================================================
  // SHEET 6: WAGE & TRADE CATEGORY BENCHMARKS
  // =========================================================================
  const ws6 = workbook.addWorksheet('Wage Benchmarks', {
    views: [{ state: 'frozen', ySplit: 5, showGridLines: true }],
  });
  ws6.columns = [
    { width: 24 }, { width: 18 }, { width: 24 }, { width: 20 }, { width: 20 },
  ];

  applyTitleBlock(
    ws6,
    'WAGE & TRADE CATEGORY BENCHMARKS',
    'Computed live from current job postings — updates automatically as Jobs sheet grows',
    5
  );
  applyTableHeader(ws6, 5, [
    'Trade Category', 'Job Postings', 'Average Wage (PHP)', 'Lowest (PHP)', 'Highest (PHP)',
  ]);

  // Extract distinct categories from jobs list
  const categorySet = new Set<string>();
  jobs.forEach((j) => {
    if (j.category) categorySet.add(j.category.trim());
  });
  if (categorySet.size === 0) {
    categorySet.add('Construction');
    categorySet.add('Domestic');
    categorySet.add('Agriculture');
    categorySet.add('Skilled Trade');
    categorySet.add('Transport');
  }

  const sortedCategories = Array.from(categorySet).sort();
  sortedCategories.forEach((cat, idx) => {
    const rNum = 6 + idx;
    const row = ws6.getRow(rNum);
    row.height = 22;

    const c1 = row.getCell(1);
    c1.value = cat;
    c1.font = { name: 'Arial', size: 10, bold: true };
    c1.alignment = { vertical: 'middle', horizontal: 'left' };

    // Live Count formula referencing Jobs!E6:E200
    const c2 = row.getCell(2);
    c2.value = {
      formula: `COUNTIF(Jobs!E6:E${Math.max(lastJobRow, 200)}, A${rNum})`,
      result: jobs.filter((j) => (j.category || '').trim() === cat).length,
    };
    c2.font = { name: 'Arial', size: 10 };
    c2.alignment = { vertical: 'middle', horizontal: 'center' };

    // Live Average formula referencing Jobs!F6:F200 and Jobs!E6:E200
    const catJobs = jobs.filter((j) => (j.category || '').trim() === cat && parseFloat(j.compensation) > 0);
    const catAvg = catJobs.length > 0 ? catJobs.reduce((acc, j) => acc + parseFloat(j.compensation), 0) / catJobs.length : 0;
    const catMin = catJobs.length > 0 ? Math.min(...catJobs.map((j) => parseFloat(j.compensation))) : 0;
    const catMax = catJobs.length > 0 ? Math.max(...catJobs.map((j) => parseFloat(j.compensation))) : 0;

    const c3 = row.getCell(3);
    c3.value = {
      formula: `IFERROR(AVERAGEIF(Jobs!E6:E${Math.max(lastJobRow, 200)}, A${rNum}, Jobs!F6:F${Math.max(lastJobRow, 200)}), 0)`,
      result: catAvg,
    };
    c3.numFmt = '₱#,##0.00';
    c3.font = { name: 'Arial', size: 10 };
    c3.alignment = { vertical: 'middle', horizontal: 'right' };

    const c4 = row.getCell(4);
    c4.value = {
      formula: `IFERROR(MINIFS(Jobs!F6:F${Math.max(lastJobRow, 200)}, Jobs!E6:E${Math.max(lastJobRow, 200)}, A${rNum}), 0)`,
      result: catMin,
    };
    c4.numFmt = '₱#,##0.00';
    c4.font = { name: 'Arial', size: 10 };
    c4.alignment = { vertical: 'middle', horizontal: 'right' };

    const c5 = row.getCell(5);
    c5.value = {
      formula: `IFERROR(MAXIFS(Jobs!F6:F${Math.max(lastJobRow, 200)}, Jobs!E6:E${Math.max(lastJobRow, 200)}, A${rNum}), 0)`,
      result: catMax,
    };
    c5.numFmt = '₱#,##0.00';
    c5.font = { name: 'Arial', size: 10 };
    c5.alignment = { vertical: 'middle', horizontal: 'right' };

    if (idx % 2 === 1) {
      for (let c = 1; c <= 5; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GRAY } };
      }
    }

    for (let c = 1; c <= 5; c++) {
      row.getCell(c).border = {
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    }
  });

  // Note row
  const noteRow = ws6.getRow(7 + sortedCategories.length);
  noteRow.height = 20;
  const cNote = noteRow.getCell(1);
  cNote.value = 'Note: All wage figures are computed live from the Jobs sheet using Excel formulas (AVERAGEIF, MINIFS, MAXIFS).';
  cNote.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF7F7F7F' } };

  // Generate buffer and return as Blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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
