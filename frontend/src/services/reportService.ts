import apiClient from "./apiClient";
import { ApiResponse, ReportSummary } from "../types";

export const reportService = {
  getSummary: async () => {
    const response = await apiClient.get<ApiResponse<ReportSummary>>("/reports/summary");
    return response.data;
  },

  downloadCsv: (name: string, rows: Record<string, unknown>[]) => {
    if (!rows.length) {
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv = [headers.join(",")]
      .concat(
        rows.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              const normalized = String(value ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""');
              return `"${normalized}"`;
            })
            .join(",")
        )
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  },

  exportPdf: (title: string, rows: Record<string, unknown>[]) => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      return;
    }

    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead>
              <tr>${Object.keys(rows[0] || {}).map((key) => `<th>${key}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) =>
                    `<tr>${Object.values(row)
                      .map((value) => `<td>${String(value ?? "")}</td>`)
                      .join("")}</tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  },
};
