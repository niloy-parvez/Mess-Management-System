import React, { useEffect, useMemo, useState } from "react";
import { Card, Spinner } from "../components/common/Components";
import { memberService } from "../services/memberService";
import { mealService } from "../services/mealService";
import { paymentService } from "../services/paymentService";
import { dashboardService } from "../services/dashboardService";
import { useAuthStore } from "../context/authStore";

const MemberPanelPage: React.FC = () => {
  const { user } = useAuthStore();
  const [member, setMember] = useState<any>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [mealRate, setMealRate] = useState<number | null>(null);
  const [monthlyMealsCount, setMonthlyMealsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMemberPanel = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Resolve canonical member id
        let memberId: string | undefined = undefined;

        if (user?.member_id) {
          memberId = user.member_id;
          const memberResp = await memberService.getMemberById(memberId);
          if (memberResp.success && memberResp.data) {
            setMember(memberResp.data);
          } else {
            setMember(null);
            memberId = undefined;
          }
        }

        if (!memberId) {
          // fallback search by user_id
          const membersResp = await memberService.getMembers(1, 50, { is_active: true });
          const found = (membersResp.data || []).find((m: any) => m.user_id === user.id);
          if (found) {
            memberId = found.id;
            setMember(found);
          }
        }

        if (!memberId) {
          setError("Member profile not found for authenticated user. Please contact admin.");
          setMeals([]);
          setPayments([]);
          setMealRate(null);
          setMonthlyMealsCount(0);
          setLoading(false);
          return;
        }

        // Parallel fetches: recent meals, payments, dashboard stats, monthly meals count
        const today = new Date().toISOString().split("T")[0];
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();

        const [mealsResp, paymentsResp, dashboardResp, monthlyMealsResp] = await Promise.all([
          // recent meal history
          mealService.getMeals(1, 20, { member_id: memberId }),
          // payment history
          paymentService.getPayments(1, 50, { member_id: memberId }),
          // global dashboard (contains currentMealRate)
          dashboardService.getStats(),
          // monthly meals count (use limit=1 to read pagination.total)
          mealService.getMeals(1, 1, { member_id: memberId, month, year }),
        ]);

        setMeals((mealsResp.data || []) as any[]);
        setPayments((paymentsResp.data || []) as any[]);

        const fetchedMealRate = (dashboardResp.data && (dashboardResp.data.currentMealRate ?? dashboardResp.data.currentMealRate === 0))
          ? Number(dashboardResp.data.currentMealRate)
          : null;
        setMealRate(fetchedMealRate);

        const monthlyTotal = monthlyMealsResp.pagination?.total ?? 0;
        setMonthlyMealsCount(monthlyTotal);

      } catch (e: any) {
        setError(e.response?.data?.message || e.message || "Failed to load member panel");
      } finally {
        setLoading(false);
      }
    };

    loadMemberPanel();
  }, [user?.id, user?.member_id]);

  const todaysMealCount = useMemo(
    () => meals.filter((meal) => meal.meal_date === new Date().toISOString().split("T")[0]).length,
    [meals]
  );

  // Only verified payments count toward the member's actual collection and balance.
  const verifiedPayments = useMemo(
    () => payments.filter((p) => p.verified === true || p.status === "verified" || p.verification_status === "verified"),
    [payments]
  );

  const paymentSum = useMemo(() => {
    return verifiedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [verifiedPayments]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const memberBill = useMemo(() => {
    if (mealRate == null) return null;
    return Number((monthlyMealsCount * mealRate).toFixed(2));
  }, [monthlyMealsCount, mealRate]);

  const balanceSummary = useMemo(() => {
    if (memberBill == null) return null;
    const net = paymentSum - memberBill;
    return {
      due: net < 0 ? Number(Math.abs(net).toFixed(2)) : 0,
      balance: net > 0 ? Number(net.toFixed(2)) : 0,
    };
  }, [memberBill, paymentSum]);

  const due = balanceSummary?.due ?? 0;
  const balance = balanceSummary?.balance ?? 0;

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
      <h1 className="text-3xl font-bold text-gray-800">Member Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Profile</p>
          <p className="text-xl font-bold">{member?.full_name || user?.full_name || "Member"}</p>
          <p className="text-sm text-gray-500">{member?.email || user?.email}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Room</p>
          <p className="text-2xl font-bold">{member?.room_number || "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Today’s Meal</p>
          <p className="text-2xl font-bold">{todaysMealCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Current Meal Rate</p>
          <p className="text-2xl font-bold">{mealRate != null ? `৳${mealRate}` : "—"}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <h2 className="text-lg font-semibold">Monthly Summary ({currentMonth}/{currentYear})</h2>
          <p className="text-sm text-gray-500">Meals this month</p>
          <p className="text-2xl font-bold">{monthlyMealsCount}</p>
          <p className="text-sm text-gray-500 mt-2">Estimated bill</p>
          <p className="text-xl font-semibold">{memberBill != null ? `৳${memberBill}` : "—"}</p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Payments</h2>
          <p className="text-sm text-gray-500">Total paid</p>
          <p className="text-2xl font-bold">{`৳${paymentSum.toFixed(2)}`}</p>
          <p className="text-sm text-gray-500 mt-2">Due / Balance</p>
          <p className={due > 0 ? "text-xl font-semibold text-red-600" : "text-xl font-semibold text-green-600"}>
            {due > 0 ? `৳${due} Due` : balance > 0 ? `৳${balance} Credit` : "৳0.00"}
          </p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Payment History</h2>
          <div className="space-y-2 mt-2">
            {payments.length > 0 ? (
              payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">৳{Number(p.amount).toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{new Date(p.payment_date || p.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-sm text-gray-500">{p.payment_method}</div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No payments found.</p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold mb-4">Meal History</h2>
        <div className="space-y-3">
          {meals.length > 0 ? (
            meals.map((meal) => (
              <div key={meal.id} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                <div>
                  <p className="font-medium capitalize">{meal.meal_type}</p>
                  <p className="text-sm text-gray-500">{new Date(meal.meal_date).toLocaleDateString()}</p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800">Recorded</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No meal history available.</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MemberPanelPage;
