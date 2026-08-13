import React, { useEffect, useState } from "react";
import { Card, Input, Button, Select, Spinner } from "../components/common/Components";
import { mealService } from "../services/mealService";
import { memberService } from "../services/memberService";

const MealsPage: React.FC = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [stats, setStats] = useState({ breakfast: 0, lunch: 0, dinner: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [memberId, setMemberId] = useState<string>("");
  const [mealType, setMealType] = useState("breakfast");
  const [mealDate, setMealDate] = useState(new Date().toISOString().split("T")[0]);
  const [marking, setMarking] = useState(false);

  const loadMembers = async () => {
    try {
      const res = await memberService.getMembers(1, 200, { is_active: true });
      if (res.success) {
        setMembers(res.data || []);
      }
    } catch (e) {
      console.warn("Unable to load members for meals page", e);
    }
  };

  const loadMeals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await mealService.getMeals(page, limit, memberId ? { member_id: memberId } : {});
      if (res.success) {
        setMeals(res.data || []);
      } else {
        setError(res.message || "Failed to load meals");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to load meals");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await mealService.getMealStats(memberId || undefined);
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (e) {
      console.warn("Unable to load meal stats", e);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    loadMeals();
    loadStats();
  }, [page, memberId]);

  const handleMarkMeal = async () => {
    if (!memberId) {
      setError("Select a member to mark the meal.");
      return;
    }

    setMarking(true);
    setError(null);
    try {
      const res = await mealService.markMeal({ member_id: memberId, meal_type: mealType, meal_date: mealDate });
      if (res.success) {
        await loadMeals();
        await loadStats();
      } else {
        setError(res.message || "Failed to mark meal");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to mark meal");
    } finally {
      setMarking(false);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    if (!confirm("Delete this meal?")) return;
    try {
      const res = await mealService.deleteMeal(id);
      if (res.success) {
        await loadMeals();
        await loadStats();
      } else {
        setError(res.message || "Failed to delete meal");
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to delete meal");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold">Meals</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Select member</option>
            {members.map((member: any) => (
              <option key={member.id} value={member.id}>{member.full_name || member.name || member.email}</option>
            ))}
          </Select>
          <Select value={mealType} onChange={(e: any) => setMealType(e.target.value)}>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </Select>
          <Input type="date" value={mealDate} onChange={(e) => setMealDate(e.target.value)} />
          <Button onClick={handleMarkMeal} disabled={marking}>{marking ? "Marking..." : "Mark Meal"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Breakfast</p>
          <p className="text-2xl font-bold">{stats.breakfast}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Lunch</p>
          <p className="text-2xl font-bold">{stats.lunch}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Dinner</p>
          <p className="text-2xl font-bold">{stats.dinner}</p>
        </Card>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Spinner /></div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3">Member</th>
                  <th className="p-3">Meal Type</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {meals.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-gray-500">No meals found</td>
                  </tr>
                )}
                {meals.map((m: any) => (
                  <tr key={m.id} className="border-b">
                    <td className="p-3">{m?.member?.full_name || m?.member?.name || m.member_name || "Member"}</td>
                    <td className="p-3 capitalize">{m.meal_type}</td>
                    <td className="p-3">{new Date(m.meal_date).toLocaleDateString()}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Button variant="danger" onClick={() => handleDeleteMeal(m.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
          <Button onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </Card>
    </div>
  );
};

export default MealsPage;
