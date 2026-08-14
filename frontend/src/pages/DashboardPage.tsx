import React, { useEffect, useState } from "react";
import { Card, Spinner } from "../components/common/Components";
import { dashboardService } from "../services/dashboardService";
import { DashboardStats } from "../types";
import { TrendingUp, Users, DollarSign, ShoppingCart } from "lucide-react";

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();

    const handler = () => {
      // short debounce to allow rapid operations
      setTimeout(() => loadDashboardData(), 250);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("app:dataChanged", handler as EventListener);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("app:dataChanged", handler as EventListener);
      }
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const [statsRes, activitiesRes] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentActivities(10),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      } else {
        setError(statsRes?.message || "Failed to load dashboard stats");
      }

      if (activitiesRes.success && activitiesRes.data) {
        setActivities(activitiesRes.data);
      } else {
        setError((prev) => prev || activitiesRes?.message || "Failed to load activities");
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      setError((error as any)?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">{error}</p>
          <p className="text-gray-600">Please check your connection or contact the administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of mess statistics and recent activity</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">Current Meal Rate</p>
            <p className="text-lg font-semibold">{stats?.currentMealRate ? `৳${Number(stats.currentMealRate).toFixed(2)}` : "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Approved Market (This month)</p>
            <p className="text-lg font-semibold">{stats?.approvedMarketCost ? `৳${Number(stats.approvedMarketCost).toFixed(2)}` : `৳${Number(stats?.totalMarketCost || 0).toFixed(2)}`}</p>
          </div>
          <div>
            <button onClick={() => window.location.assign('/market')} className="px-4 py-2 bg-blue-600 text-white rounded-md">New Market</button>
          </div>
        </div>
      </div>

      {/* Top summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total Members</p>
                  <p className="text-3xl font-bold text-blue-600">{stats?.totalMembers || 0}</p>
                  <p className="text-xs text-gray-500 mt-2">{stats?.activeMembers || 0} active</p>
                </div>
                <Users size={34} className="text-blue-200" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">This Month's Meals</p>
                  <p className="text-3xl font-bold text-indigo-600">{stats?.monthlyMeals || stats?.totalMeals || 0}</p>
                  <p className="text-xs text-gray-500 mt-2">Total valid meals</p>
                </div>
                <TrendingUp size={34} className="text-indigo-200" />
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Total Collection</p>
                  <p className="text-3xl font-bold text-green-600">৳{stats?.totalCollection || 0}</p>
                  <p className="text-xs text-gray-500 mt-2">Verified payments only</p>
                </div>
                <DollarSign size={34} className="text-green-200" />
              </div>
            </Card>
          </div>

          <Card className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Monthly Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Approved Market</p>
                <p className="font-bold">৳{stats?.totalMarketCost || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Meals</p>
                <p className="font-bold">{stats?.totalMeals || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Meal Rate</p>
                <p className="font-bold">{(stats?.ratePerMeal ?? stats?.currentMealRate) ? `৳${Number(stats.ratePerMeal ?? stats?.currentMealRate).toFixed(2)}` : "৳0.00"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Amount</p>
                <p className="font-bold text-orange-600">৳{stats?.dueAmount || 0}</p>
              </div>
            </div>
          </Card>

          {/* Recent Activities */}
          <Card className="mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activities</h2>
            <div className="space-y-3">
              {activities.length > 0 ? (
                activities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-800">{activity.description}</p>
                      <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800 capitalize">
                      {activity.type}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No recent activities</p>
              )}
            </div>
          </Card>
        </div>

        <aside>
          <Card>
            <h3 className="font-semibold">Quick Actions</h3>
            <div className="mt-3 space-y-3">
              <button onClick={() => window.location.assign('/market')} className="w-full text-left px-3 py-2 bg-blue-50 rounded">Add Market</button>
              <button onClick={() => window.location.assign('/meals')} className="w-full text-left px-3 py-2 bg-green-50 rounded">Mark Meals</button>
              <button onClick={() => window.location.assign('/payments')} className="w-full text-left px-3 py-2 bg-yellow-50 rounded">Add Payment</button>
            </div>
          </Card>

          <Card className="mt-6">
            <h3 className="font-semibold">Notices</h3>
            <div className="mt-3">
              <p className="text-sm text-gray-500">No notices</p>
            </div>
          </Card>

          <Card className="mt-6">
            <h3 className="font-semibold">Recent Members</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              {stats?.members?.slice?.(0,5)?.map((m:any) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div>{m.name || m.full_name || m.email}</div>
                  <div className="text-xs text-gray-500">{m.room_number || '-'}</div>
                </div>
              )) || <div>No members</div>}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default DashboardPage;
