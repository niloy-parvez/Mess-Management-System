import React, { useEffect, useMemo, useState } from "react";
import { Card, Spinner, Button, Input, Select } from "../components/common/Components";
import { reportService } from "../services/reportService";
import { ReportSummary } from "../types";

const REPORT_TYPES = [
  "members",
  "meals",
  "market",
  "expenses",
  "payments",
  "monthlyBills",
] as const;

type ReportType = (typeof REPORT_TYPES)[number];

const ReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [reportType, setReportType] = useState<ReportType>("members");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await reportService.getSummary();
        setSummary(response.data ?? null);
      } catch (e: any) {
        setError(e.response?.data?.message || e.message || "Failed to fetch reports");
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const dataset = useMemo(() => {
    if (!summary) return [];
    return summary[reportType] || [];
  }, [summary, reportType]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = term
      ? dataset.filter((row: any) =>
          Object.values(row)
            .map((value) => String(value ?? "").toLowerCase())
            .some((value) => value.includes(term))
        )
      : dataset;

    rows.sort((a: any, b: any) => {
      const left = a[sortField] ?? "";
      const right = b[sortField] ?? "";
      const direction = sortOrder === "asc" ? 1 : -1;
      return String(left).localeCompare(String(right)) * direction;
    });

    return rows;
  }, [dataset, search, sortField, sortOrder]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const exportCsv = () => {
    reportService.downloadCsv(reportType, filteredRows);
  };

  const exportPdf = () => {
    reportService.exportPdf(`${reportType} report`, filteredRows);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <Card className="text-red-600">{error}</Card>;
  }

  const renderTable = () => {
    if (!paginatedRows.length) {
      return <p className="text-gray-500">No results for the selected report.</p>;
    }

    const columns = Object.keys(paginatedRows[0]);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              {columns.map((column) => (
                <th key={column} className="px-3 py-2 font-semibold text-gray-700">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row: any, rowIndex: number) => (
              <tr key={`${reportType}-${row.id || rowIndex}`} className="border-b">
                {columns.map((column) => (
                  <td key={`${column}-${row.id || rowIndex}`} className="px-3 py-2 text-gray-700">
                    {String(row[column] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
          <p className="text-sm text-gray-500">Search, filter, sort, and export operational reports.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCsv}>Export CSV</Button>
          <Button variant="secondary" onClick={exportPdf}>Export PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Members</p>
          <p className="text-2xl font-bold">{summary?.overview.totalMembers ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Meals</p>
          <p className="text-2xl font-bold">{summary?.overview.totalMeals ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Expenses</p>
          <p className="text-2xl font-bold">৳{summary?.overview.totalExpenses ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Collection</p>
          <p className="text-2xl font-bold">৳{summary?.overview.totalCollection ?? 0}</p>
        </Card>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <Select value={reportType} onChange={(e) => { setReportType(e.target.value as ReportType); setPage(1); }}>
              {REPORT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search rows" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort Field</label>
            <Input value={sortField} onChange={(e) => setSortField(e.target.value)} placeholder="created_at" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
            <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "asc" | "desc") }>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </Select>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">Showing {filteredRows.length} rows</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
              Prev
            </Button>
            <Button variant="secondary" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>
              Next
            </Button>
          </div>
        </div>

        {renderTable()}
      </Card>
    </div>
  );
};

export default ReportsPage;
