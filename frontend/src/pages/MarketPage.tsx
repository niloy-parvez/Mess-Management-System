import React, { useEffect, useState } from "react";
import { Button, Card, Input, Select, Textarea, Spinner } from "../components/common/Components";
import { marketService } from "../services/marketService";
import { useAuthStore } from "../context/authStore";

const MARKET_ITEMS = [
  "Rice",
  "Dal",
  "Potato",
  "Onion",
  "Garlic",
  "Oil",
  "Salt",
  "Sugar",
  "Egg",
  "Chicken",
  "Fish",
  "Beef",
  "Vegetables",
  "Milk",
  "Tea",
  "Spices",
  "Soap",
  "Detergent",
  "Gas",
  "Others",
];

const MarketPage: React.FC = () => {
  const { isAdmin } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [status, setStatus] = useState("all");
  const [itemName, setItemName] = useState(MARKET_ITEMS[0]);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("kg");
  const [price, setPrice] = useState(0);
  const [marketDate, setMarketDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {};
      if (status === "approved") params.status = "approved";
      if (status === "pending") params.status = "pending";
      const response = await marketService.getMarketItems(page, limit, params);
      if (response.success && response.data) {
        setItems(response.data);
      } else {
        setError(response.message || "Failed to load market entries");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load market entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [page, status]);

  const handleCreate = async () => {
    const normalizedItemName = itemName.trim();

    if (!normalizedItemName || quantity <= 0 || price <= 0) {
      setError("Select a valid bazaar item and provide positive quantity and price.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        items: [
          {
            name: normalizedItemName,
            quantity,
            unit,
            price,
          },
        ],
        description: description.trim() || undefined,
        market_date: marketDate,
      };
      const response = await marketService.createMarket(payload);
      if (response.success) {
        setItemName(MARKET_ITEMS[0]);
                setQuantity(1);
        setUnit("kg");
        setPrice(0);
        setDescription("");
        setMarketDate(new Date().toISOString().split("T")[0]);
        loadItems();
      } else {
        setError(response.message || "Failed to create market entry");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to create market entry");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await marketService.approveMarketItem(id);
      if (response.success) loadItems();
      else setError(response.message || "Failed to approve market item");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to approve market item");
    }
  };

  const handleReject = async (id: string) => {
    try {
      const response = await marketService.rejectMarketItem(id);
      if (response.success) loadItems();
      else setError(response.message || "Failed to reject market item");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to reject market item");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Market</h1>
          <p className="text-gray-500">Record and review market purchases.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </Select>
        </div>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="relative">
            <Input
              list="market-items"
              placeholder="Search or enter item name"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
            <datalist id="market-items">
              {MARKET_ITEMS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <Input type="number" min={1} placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          <Input placeholder="Unit (kg, pcs)" value={unit} onChange={(e) => setUnit(e.target.value)} />
          <Input type="number" min={0} placeholder="Price" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
        <div className="grid gap-4 md:grid-cols-3 mt-4">
          <Input type="date" value={marketDate} onChange={(e) => setMarketDate(e.target.value)} />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Create Market Entry"}</Button>
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
                  <th className="p-3">Description</th>
                  <th className="p-3">Total Cost</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-gray-500">No market entries found.</td>
                  </tr>
                ) : (
                  items.map((entry: any) => (
                    <tr key={entry.id} className="border-b">
                      <td className="p-3">{new Date(entry.market_date).toLocaleDateString()}</td>
                      <td className="p-3">{entry.description || entry.items?.map((item: any) => item.name).join(", ")}</td>
                      <td className="p-3">৳{entry.total_cost?.toFixed?.(2) ?? entry.total_cost}</td>
                      <td className="p-3">{entry.status ? String(entry.status).charAt(0).toUpperCase() + String(entry.status).slice(1) : entry.is_approved ? "Approved" : "Pending"}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {isAdmin && !entry.is_approved && (
                            <>
                              <Button variant="secondary" onClick={() => handleApprove(entry.id)}>Approve</Button>
                              <Button variant="danger" onClick={() => handleReject(entry.id)}>Reject</Button>
                            </>
                          )}
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

export default MarketPage;

