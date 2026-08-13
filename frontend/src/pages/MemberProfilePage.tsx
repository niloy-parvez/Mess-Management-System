import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Spinner } from "../components/common/Components";
import { memberService } from "../services/memberService";
import { mealService } from "../services/mealService";
import { paymentService } from "../services/paymentService";

const MemberProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any | null>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [mealStats, setMealStats] = useState<any>(null);
  const [billSummary, setBillSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [memberRes, mealStatsRes, paymentsRes, mealsRes, billRes] = await Promise.all([
        memberService.getMemberById(id),
        mealService.getMealStats(id),
        paymentService.getPayments(1, 50, { member_id: id }),
        mealService.getMeals(1, 100, { member_id: id }),
        fetch(`/api/reports/monthly-bill?memberId=${encodeURIComponent(id)}&month=${month}&year=${year}`).then((r) => r.json()),
      ]);

      if (memberRes.success) setMember(memberRes.data);
      if (mealStatsRes.success) setMealStats(mealStatsRes.data || null);
      if (paymentsRes.success) setPayments(paymentsRes.data || []);
      if (mealsRes.success) setMeals(mealsRes.data || []);
      if (billRes && billRes.success !== false) {
        setBillSummary(billRes.data || billRes);
      }

      const todaysMeals = mealsRes.success
        ? (mealsRes.data || []).filter((meal: any) => meal.meal_date === today)
        : [];
      const todaysMealsTypes = todaysMeals.map((meal: any) => meal.meal_type);
      const currentMealStatus = todaysMealsTypes.length
        ? todaysMealsTypes.join(", ")
        : "No meal marked today";

      setMealStats((prev: any) => ({
        ...(prev || {}),
        todayTypes: todaysMealsTypes,
        currentMealStatus,
      }));
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [id]);

  const totals = useMemo(() => {
    const mealCount = meals.length;
    const monthlyMealCount = meals.filter((meal: any) => {
      const mealDate = new Date(meal.meal_date);
      return mealDate.getMonth() === new Date().getMonth() && mealDate.getFullYear() === new Date().getFullYear();
    }).length;
    const verifiedPayments = payments.filter((payment: any) => {
      const status = String(payment.verified ?? payment.status ?? payment.verification_status ?? "").toLowerCase();
      return payment.verified === true || status === "verified";
    });
    const totalPaid = verifiedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const currentMealRate = Number(member?.meal_rate || mealStats?.meal_rate || 0);
    const monthlyBill = currentMealRate * monthlyMealCount;
    const net = totalPaid - monthlyBill;
    const dueAmount = net < 0 ? Math.abs(net) : 0;
    const creditAmount = net > 0 ? net : 0;
    const todayMeals = Array.isArray(mealStats?.todayTypes) ? mealStats.todayTypes : [];

    return {
      mealCount,
      monthlyMealCount,
      totalPaid,
      currentMealRate,
      monthlyBill,
      dueAmount,
      creditAmount,
      todayMeals,
      paymentStatus: dueAmount > 0 ? "Due" : creditAmount > 0 ? "Balance/Credit" : "Settled",
    };
  }, [meals, payments, mealStats, member]);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  if (error) return <div className="text-red-600">{error}</div>;

  if (!member) return <div className="text-gray-600">Member not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{member.full_name || member.name}</h1>
        <div className="text-sm text-gray-600">Joined: {member.join_date || member.created_at?.split?.("T")?.[0]}</div>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="font-semibold">Basic Information</h3>
            <div>Name: {member.full_name || member.name || "-"}</div>
            <div>Phone Number: {member.phone || "-"}</div>
            <div>Room Number: {member.room_number || "-"}</div>
            <div>Status: {member.is_active ? "Active" : "Inactive"}</div>
            <div>Join Date: {member.join_date || member.created_at?.split?.("T")?.[0] || "-"}</div>
          </div>

          <div>
            <h3 className="font-semibold">Meal Information</h3>
            <div>Current Meal: {totals.todayMeals.length ? totals.todayMeals.join(", ") : "No meal marked today"}</div>
            <div>Today's Meal: {totals.todayMeals.length ? totals.todayMeals.join(", ") : "-"}</div>
            <div>Total Meals: {totals.mealCount}</div>
            <div>Monthly Meals: {totals.monthlyMealCount}</div>
            <div>Meal Rate: ৳{totals.currentMealRate.toFixed(2)}</div>
          </div>

          <div>
            <h3 className="font-semibold">Payment Information</h3>
            <div>Total Paid: ৳{totals.totalPaid.toFixed(2)}</div>
            <div>Total Due: ৳{totals.dueAmount.toFixed(2)}</div>
            <div>Balance/Credit: ৳{totals.creditAmount.toFixed(2)}</div>
            <div>Monthly Bill: ৳{totals.monthlyBill.toFixed(2)}</div>
            <div>Payment Dates: {(payments || []).map((p: any) => p.payment_date).filter(Boolean).join(", ") || "-"}</div>
            <div>Payment Status: {totals.paymentStatus}</div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-2">Meal History</h3>
        {meals.length === 0 ? (
          <div className="text-gray-500">No meal history</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2">Date</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Marked At</th>
                </tr>
              </thead>
              <tbody>
                {meals.map((m) => (
                  <tr key={m.id} className="border-b">
                    <td className="p-2">{m.meal_date}</td>
                    <td className="p-2">{m.meal_type}</td>
                    <td className="p-2">{m.created_at?.split?.("T")?.[0] || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold mb-2">Payment History</h3>
        {payments.length === 0 ? (
          <div className="text-gray-500">No payments</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2">Date</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Method</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-2">{p.payment_date}</td>
                    <td className="p-2">৳{Number(p.amount).toFixed(2)}</td>
                    <td className="p-2">{p.payment_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold mb-2">Meal ON/OFF History</h3>
        <div className="text-sm text-gray-700">
          {totals.todayMeals.length
            ? `Breakfast ${totals.todayMeals.includes("breakfast") ? "✔" : "✘"}, Lunch ${totals.todayMeals.includes("lunch") ? "✔" : "✘"}, Dinner ${totals.todayMeals.includes("dinner") ? "✔" : "✘"}`
            : "No meal activity recorded for today"}
        </div>
      </Card>
    </div>
  );
};

export default MemberProfilePage;
