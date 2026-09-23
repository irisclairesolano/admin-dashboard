/**
 * SIKAP Universal CSV Export Utility
 * RFC-4180 compliant with UTF-8 Byte Order Mark (BOM) for Excel compatibility.
 */

export function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function formatCSVDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(',', '');
  } catch {
    return String(dateStr);
  }
}

export function formatCSVCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '0.00';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

export function formatCSVReputation(score: number | string | null | undefined, ratingsCount?: number | null | undefined): string {
  if (ratingsCount !== undefined && ratingsCount !== null && Number(ratingsCount) === 0) {
    return 'N/A';
  }
  if (score === null || score === undefined || score === '' || isNaN(Number(score))) {
    return 'N/A';
  }
  const num = Number(score);
  return num > 0 ? num.toFixed(2) : 'N/A';
}

export function calculateNormalizedHourlyWage(
  compensation: number | string | null | undefined,
  rateUnit?: string | null,
  duration?: string | number | null,
  durationUnit?: string | null,
  durationType?: string | null
): number {
  const comp = typeof compensation === 'string' ? parseFloat(compensation) : Number(compensation || 0);
  if (isNaN(comp) || comp <= 0) return 0;

  const unit = String(rateUnit || durationType || '').toLowerCase().trim();
  const durUnit = String(durationUnit || '').toLowerCase().trim();
  const durStr = String(duration || '').toLowerCase().trim();

  // If rate is already per hour
  if (unit === 'per_hour' || unit === 'hourly' || unit === '/hr') {
    return Math.round(comp * 100) / 100;
  }

  // Parse duration numbers and units (e.g. "2 Hours", "8 Days", "2 Months")
  let durVal: number | null = null;
  let durParsedUnit = '';
  if (durStr) {
    const match = durStr.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/);
    if (match) {
      durVal = parseFloat(match[1]);
      durParsedUnit = (match[2] || '').toLowerCase();
    }
  }
  if (durVal === null && duration !== null && duration !== undefined && !isNaN(Number(duration))) {
    durVal = Number(duration);
  }
  const effectiveUnit = durUnit || durParsedUnit;

  // If rate is per day (standard 8-hour workday)
  if (unit === 'per_day' || unit === 'daily' || unit === '/day') {
    return Math.round((comp / 8.0) * 100) / 100;
  }

  // If rate is per week (40 hours)
  if (unit === 'per_week' || unit === 'weekly' || unit === '/week') {
    return Math.round((comp / 40.0) * 100) / 100;
  }

  // If rate is per month (160 hours)
  if (unit === 'per_month' || unit === 'monthly' || unit === '/month') {
    return Math.round((comp / 160.0) * 100) / 100;
  }

  // Fixed or project-based: calculate from duration if provided
  if (durVal && durVal > 0 && effectiveUnit) {
    if (effectiveUnit.includes('hour')) {
      return Math.round((comp / durVal) * 100) / 100;
    }
    if (effectiveUnit.includes('day')) {
      return Math.round((comp / (durVal * 8.0)) * 100) / 100;
    }
    if (effectiveUnit.includes('week')) {
      return Math.round((comp / (durVal * 40.0)) * 100) / 100;
    }
    if (effectiveUnit.includes('month')) {
      return Math.round((comp / (durVal * 160.0)) * 100) / 100;
    }
  }

  // Standard 8-hour workday fallback for project/fixed
  return Math.round((comp / 8.0) * 100) / 100;
}

export function formatCSVStatus(status?: string | null): string {
  if (!status) return 'Unknown';
  switch (status.toLowerCase()) {
    case 'approved':
    case 'active':
    case 'open':
    case 'completed':
    case 'resolved':
    case 'hired':
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    case 'pending':
    case 'pending_review':
    case 'pending_email_verification':
    case 'pending_id_upload':
    case 'requested':
    case 'offer_sent':
    case 'investigating':
    case 'in_progress':
    case 'closed_in_progress':
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    case 'rejected':
    case 'banned':
    case 'suspended':
    case 'cancelled':
    case 'dismissed':
    case 'inactive':
    case 'archived':
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    default:
      return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

export function downloadCSV(filename: string, csvContent: string): void {
  // \uFEFF is the UTF-8 Byte Order Mark for Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface CSVSection {
  title: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

export function exportMultiSectionCSV(
  filename: string,
  reportTitle: string,
  metadata: [string, string][],
  sections: CSVSection[]
): void {
  const lines: string[] = [];

  // Report Title Header Block
  lines.push(`"=========================================================================================="`);
  lines.push(escapeCSVField(`                         ${reportTitle.toUpperCase()}                         `));
  lines.push(`"=========================================================================================="`);

  // Metadata block
  for (const [key, val] of metadata) {
    lines.push(`${escapeCSVField(key)},${escapeCSVField(val)}`);
  }
  lines.push(''); // Blank line

  // Sections
  for (const section of sections) {
    lines.push(`"--- ${section.title.toUpperCase()} ---"`);
    if (section.headers && section.headers.length > 0) {
      lines.push(section.headers.map(escapeCSVField).join(','));
    }
    for (const row of section.rows) {
      lines.push(row.map(escapeCSVField).join(','));
    }
    lines.push(''); // Blank line between sections
  }

  downloadCSV(filename, lines.join('\r\n'));
}
