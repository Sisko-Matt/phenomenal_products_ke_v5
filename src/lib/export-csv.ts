export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // A leading space keeps text like "+254..." from being coerced into a
  // number or formula when the file is opened in Excel or Google Sheets.
  if (/^[=+\-@]/.test(s)) s = ` ${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build CSV text (CRLF line endings, as Excel expects). */
export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

/** Trigger a browser download of rows as a UTF-8 CSV file. */
export function downloadCsv(filename: string, rows: CsvCell[][]) {
  // The BOM makes Excel detect UTF-8 so amounts and names render correctly.
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Export Orders to CSV */
export function downloadOrdersCsv(orders: any[]) {
  const headers = ["Reference", "Customer Name", "Phone", "Delivery Area", "Subtotal (KES)", "Discount (KES)", "Total (KES)", "Status", "Date"];
  const rows = orders.map(o => [
    o.reference,
    o.customer_name,
    o.phone,
    o.delivery_area,
    o.subtotal_kes,
    o.discount_kes,
    o.total_kes,
    o.status,
    new Date(o.created_at).toLocaleDateString()
  ]);
  downloadCsv("orders-export.csv", [headers, ...rows]);
}
