import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Select, Spinner } from "../components/common/Components";
import { paymentService } from "../services/paymentService";
import { memberService } from "../services/memberService";
import { useAuthStore } from "../context/authStore";

const PaymentsPage: React.FC = () => {
  const { isAdmin } = useAuthStore();
  const [payments, setPayments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMembers = async () => {
    if (!isAdmin) {
      setMembers([]);
      return;
    }
    try {
      const response = await memberService.getMembers(1, 200, { is_active: true });
      if (response.success) {
        setMembers(response.data || []);
      }
    } catch (e) {
      console.warn("Unable to load members for payment form", e);
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await paymentService.getPayments(page, limit, { member_id: memberId || undefined });
      if (response.success && response.data) {
        setPayments(response.data);
      } else {
        setError(response.message || "Failed to load payments");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const memberNameMap = useMemo(
    () => members.reduce((map: Record<string, string>, member: any) => {
      if (member?.id) {
        map[member.id] = member.full_name || member.name || member.email || member.id;
      }
      return map;
    }, {}),
    [members]
  );

  useEffect(() => {
    loadMembers();
  }, [isAdmin]);

  useEffect(() => {
    loadPayments();
  }, [page, memberId]);

  const handleCreatePayment = async () => {
    if (!memberId || amount <= 0) {
      setError("A valid member and amount are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await paymentService.createPayment({
        member_id: memberId.trim(),
        amount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference: reference.trim(),
        notes: notes.trim(),
      });

      if (response.success) {
        setMemberId("");
        setAmount(0);
        setReference("");
        setNotes("");
        setPaymentDate(new Date().toISOString().split("T")[0]);
        await loadPayments();
      } else {
        setError(response.message || "Failed to record payment");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const response = await paymentService.verifyPayment(id);
      if (response.success) {
        await loadPayments();
      } else {
        setError(response.message || "Failed to verify payment");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to verify payment");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await paymentService.deletePayment(id);
      if (response.success) {
        await loadPayments();
      } else {
        setError(response.message || "Failed to delete payment");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to delete payment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-gray-500">Manage member collections and payment records.</p>
        </div>
      </div>

      {isAdmin && (
        <Card>
          <div className="grid gap-4 md:grid-cols-4">
            <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Select member</option>
              {members.map((member: any) => (
                <option key={member.id} value={member.id}>{member.full_name || member.name || member.email}</option>
              ))}
            </Select>
            <Input type="number" min={0} placeholder="Amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="bank_transfer">Bank Transfer</option>
            </Select>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <Input placeholder="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
            <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="mt-4">
            <Button onClick={handleCreatePayment} disabled={saving}>{saving ? "Saving..." : "Record Payment"}</Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Spinner /></div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3">Date</th>
                  <th className="p-3">Member</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-gray-500">No payments found.</td>
                  </tr>
                ) : (
                  payments.map((payment: any) => (
                    <tr key={payment.id} className="border-b">
                      <td className="p-3">{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="p-3">{memberNameMap[payment.member_id] || payment.member?.full_name || payment.member?.name || payment.member?.email || "Member"}</td>
                      <td className="p-3">৳{payment.amount}</td>
                      <td className="p-3">{payment.payment_method}</td>
                      <td className="p-3">{payment.verified ? "Verified" : "Pending"}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {isAdmin && !payment.verified && <Button variant="secondary" onClick={() => handleVerify(payment.id)}>Verify</Button>}
                          {isAdmin && <Button variant="danger" onClick={() => handleDelete(payment.id)}>Void</Button>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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

export default PaymentsPage;
