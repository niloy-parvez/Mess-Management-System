import React, { useEffect, useMemo, useState } from "react";
import { Card, Spinner, Button } from "../components/common/Components";
import { dashboardService } from "../services/dashboardService";
import { marketService } from "../services/marketService";
import { reportService } from "../services/reportService";

const AdminPanelPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPanel = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsResponse, reportResponse, marketResponse] = await Promise.all([
          dashboardService.getStats(),
          reportService.getSummary(),
          marketService.getMarketItems(1, 10, { status: "pending" }),
        ]);

        setSummary(reportResponse.data ?? reportResponse);
        setPendingItems((marketResponse.data || []) as any[]);
      } catch (e: any) {
        setError(e.response?.data?.message || e.message || "Failed to load admin panel");
      } finally {
        setLoading(false);
      }
    };

    loadPanel();
  }, []);

  const overview = useMemo(() => summary?.overview ?? {}, [summary]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
          <p className="text-sm text-gray-500">Operational overview, pending market actions, and report controls.</p>
        </div>
        <Button onClick={() => reportService.downloadCsv("admin-summary", pendingItems)}>
          Export Pending Requests
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Members</p>
          <p className="text-2xl font-bold">{overview.totalMembers ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Meals</p>
          <p className="text-2xl font-bold">{overview.totalMeals ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Expenses</p>
          <p className="text-2xl font-bold">৳{overview.totalExpenses ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Due</p>
          <p className="text-2xl font-bold">৳{overview.totalDue ?? 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold mb-4">Pending Market Requests</h2>
          <div className="space-y-3">
            {pendingItems.length > 0 ? (
              pendingItems.map((item) => (
                <div key={item.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.items?.map((entry: any) => entry.name).join(", ") || "Market Entry"}</p>
                      <p className="text-sm text-gray-500">{new Date(item.market_date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm text-yellow-700">Pending</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No pending market requests.</p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-4">Quick Controls</h2>
          <div className="grid grid-cols-1 gap-3">
            <Button onClick={() => window.location.assign("/reports")}>Open Reports</Button>
            <Button variant="secondary" onClick={() => window.location.assign("/members")}>Manage Members</Button>
            <Button variant="secondary" onClick={() => window.location.assign("/payments")}>Manage Payments</Button>
            <Button variant="secondary" onClick={() => window.location.assign("/expenses")}>Manage Expenses</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanelPage;
