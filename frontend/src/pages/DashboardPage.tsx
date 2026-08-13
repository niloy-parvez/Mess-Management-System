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
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Members</p>
              <p className="text-3xl font-bold text-blue-600">{stats?.totalMembers || 0}</p>
              <p className="text-xs text-gray-500 mt-2">{stats?.activeMembers || 0} active</p>
            </div>
            <Users size={40} className="text-blue-200" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Today&apos;s Meals</p>
              <p className="text-3xl font-bold text-indigo-600">{stats?.todayMeals || 0}</p>
              <p className="text-xs text-gray-500 mt-2">Current meal count</p>
            </div>
            <TrendingUp size={40} className="text-indigo-200" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Today's Market Cost</p>
              <p className="text-3xl font-bold text-red-600">৳{stats?.todayMarketCost || 0}</p>
              <p className="text-xs text-gray-500 mt-2">Approved entries</p>
            </div>
            <ShoppingCart size={40} className="text-red-200" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Expenses</p>
              <p className="text-3xl font-bold text-red-600">৳{stats?.totalExpenses || 0}</p>
              <p className="text-xs text-gray-500 mt-2">This month</p>
            </div>
            <TrendingUp size={40} className="text-red-200" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Total Collection</p>
              <p className="text-3xl font-bold text-green-600">৳{stats?.totalCollection || 0}</p>
              <p className="text-xs text-gray-500 mt-2">From payments</p>
            </div>
            <DollarSign size={40} className="text-green-200" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Due Amount</p>
              <p className="text-3xl font-bold text-orange-600">৳{stats?.dueAmount || 0}</p>
              <p className="text-xs text-gray-500 mt-2">Outstanding</p>
            </div>
            <ShoppingCart size={40} className="text-orange-200" />
          </div>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
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
  );
};

export default DashboardPage;
