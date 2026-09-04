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

export function exportTableToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const headerLine = headers.map(escapeCSVField).join(',');
  const rowLines = rows.map((row) => row.map(escapeCSVField).join(','));
  const csvContent = [headerLine, ...rowLines].join('\r\n');
  downloadCSV(filename, csvContent);
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
