import React, { useEffect, useState } from "react";
import { Button, Card, Input, Select, Textarea, Spinner } from "../components/common/Components";
import { expenseService } from "../services/expenseService";

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [category, setCategory] = useState("gas");
  const [amount, setAmount] = useState(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseService.getExpenses(page, limit);
      if (response.success && response.data) {
        setExpenses(response.data);
      } else {
        setError(response.message || "Failed to load expenses");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [page]);

  const resetForm = () => {
    setEditingId(null);
    setCategory("gas");
    setAmount(0);
    setDescription("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
  };

  const handleSaveExpense = async () => {
    if (!category || amount <= 0) {
      setError("Please select a category and enter a valid amount.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        category,
        amount,
        expense_date: expenseDate,
        description: description.trim(),
      };
      const response = editingId
        ? await expenseService.updateExpense(editingId, payload)
        : await expenseService.createExpense(payload);

      if (response.success) {
        resetForm();
        loadExpenses();
      } else {
        setError(response.message || (editingId ? "Failed to update expense" : "Failed to record expense"));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || (editingId ? "Failed to update expense" : "Failed to record expense"));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (expense: any) => {
    setEditingId(expense.id);
    setCategory(expense.category);
    setAmount(Number(expense.amount) || 0);
    setExpenseDate(expense.expense_date ? String(expense.expense_date).split("T")[0] : new Date().toISOString().split("T")[0]);
    setDescription(expense.description || "");
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await expenseService.deleteExpense(id);
      if (response.success) {
        if (editingId === id) {
          resetForm();
        }
        loadExpenses();
      } else {
        setError(response.message || "Failed to delete expense");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to delete expense");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-gray-500">Track mess expenses and keep the budget organized.</p>
        </div>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-4">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="gas">Gas</option>
            <option value="electricity">Electricity</option>
            <option value="internet">Internet</option>
            <option value="water">Water</option>
            <option value="maid_salary">Maid Salary</option>
            <option value="maintenance">Maintenance</option>
            <option value="others">Others</option>
          </Select>
          <Input type="number" min={0} placeholder="Amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={handleSaveExpense} disabled={saving} className="flex-1">
              {saving ? "Saving..." : editingId ? "Update Expense" : "Record Expense"}
            </Button>
            {editingId && (
              <Button variant="secondary" onClick={handleCancelEdit} disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4">
          <Textarea placeholder="Notes" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </Card>

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
                  <th className="p-3">Category</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-gray-500">No expenses recorded.</td>
                  </tr>
                ) : (
                  expenses.map((expense: any) => (
                    <tr key={expense.id} className="border-b">
                      <td className="p-3">{new Date(expense.expense_date).toLocaleDateString()}</td>
                      <td className="p-3 capitalize">{expense.category}</td>
                      <td className="p-3">৳{expense.amount}</td>
                      <td className="p-3">{expense.description || "—"}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => handleEdit(expense)}>Edit</Button>
                          <Button variant="danger" onClick={() => handleDelete(expense.id)}>Delete</Button>
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

export default ExpensesPage;
