const mockSupabase = {
  from: jest.fn(),
};

jest.mock("../config/supabase", () => ({
  __esModule: true,
  default: mockSupabase,
}));

import {
  calculateMealRateSummary,
  calculateMemberBalance,
  calculateMemberMonthlyBill,
} from "./financialCalculationService";

const buildQuery = (rows: any[], tableName: string) => {
  let filtered = [...rows];

  const query: any = {
    data: filtered,
    count: tableName === "meals" ? filtered.length : undefined,
    select: jest.fn(() => query),
    eq: jest.fn((column: string, value: any) => {
      filtered = filtered.filter((row) => row?.[column] === value);
      query.data = filtered;
      if (tableName === "meals") query.count = filtered.length;
      return query;
    }),
    gte: jest.fn((column: string, value: any) => {
      filtered = filtered.filter((row) => row?.[column] >= value);
      query.data = filtered;
      if (tableName === "meals") query.count = filtered.length;
      return query;
    }),
    lte: jest.fn((column: string, value: any) => {
      filtered = filtered.filter((row) => row?.[column] <= value);
      query.data = filtered;
      if (tableName === "meals") query.count = filtered.length;
      return query;
    }),
  };

  return query;
};

const setTableState = (state: Record<string, any[]>) => {
  mockSupabase.from.mockImplementation((tableName: string) => buildQuery(state[tableName] || [], tableName));
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Financial calculation service", () => {
  it("TEST 1: calculates approved market cost and meal rate using approved entries only", async () => {
    setTableState({
      market: [{ total_cost: 1054, is_approved: true, market_date: "2025-12-01" }],
      meals: Array.from({ length: 11 }, (_, i) => ({ id: `m-${i + 1}`, member_id: "member-1", meal_date: `2025-12-${String((i % 28) + 1).padStart(2, "0")}` })),
      payments: [],
    });

    const summary = await calculateMealRateSummary(12, 2025);

    expect(summary.totalApprovedMarketCost).toBeCloseTo(1054, 2);
    expect(summary.totalMeals).toBe(11);
    expect(summary.ratePerMeal).toBeCloseTo(95.82, 2);
  });

  it("TEST 2: pending market entries do not affect the meal rate", async () => {
    setTableState({
      market: [{ total_cost: 1054, is_approved: true, market_date: "2025-12-01" }, { total_cost: 500, is_approved: false, market_date: "2025-12-02" }],
      meals: Array.from({ length: 11 }, (_, i) => ({ id: `m-${i + 1}`, member_id: "member-1", meal_date: `2025-12-${String((i % 28) + 1).padStart(2, "0")}` })),
      payments: [],
    });

    const summary = await calculateMealRateSummary(12, 2025);

    expect(summary.totalApprovedMarketCost).toBeCloseTo(1054, 2);
    expect(summary.ratePerMeal).toBeCloseTo(95.82, 2);
  });

  it("TEST 3: approved pending entries raise the meal rate immediately", async () => {
    setTableState({
      market: [{ total_cost: 1054, is_approved: true, market_date: "2025-12-01" }, { total_cost: 500, is_approved: true, market_date: "2025-12-02" }],
      meals: Array.from({ length: 11 }, (_, i) => ({ id: `m-${i + 1}`, member_id: "member-1", meal_date: `2025-12-${String((i % 28) + 1).padStart(2, "0")}` })),
      payments: [],
    });

    const summary = await calculateMealRateSummary(12, 2025);

    expect(summary.totalApprovedMarketCost).toBeCloseTo(1554, 2);
    expect(summary.ratePerMeal).toBeCloseTo(141.27, 2);
  });

  it("TEST 4: voided approved entries return the rate to the original approved total", async () => {
    setTableState({
      market: [{ total_cost: 1054, is_approved: true, market_date: "2025-12-01" }],
      meals: Array.from({ length: 11 }, (_, i) => ({ id: `m-${i + 1}`, member_id: "member-1", meal_date: `2025-12-${String((i % 28) + 1).padStart(2, "0")}` })),
      payments: [],
    });

    const summary = await calculateMealRateSummary(12, 2025);

    expect(summary.totalApprovedMarketCost).toBeCloseTo(1054, 2);
    expect(summary.ratePerMeal).toBeCloseTo(95.82, 2);
  });

  it("TEST 5: due is computed from verified payments minus member bill", async () => {
    setTableState({
      market: [{ total_cost: 1054, is_approved: true, market_date: "2025-12-01" }],
      meals: Array.from({ length: 11 }, (_, i) => ({ id: `m-${i + 1}`, member_id: "member-1", meal_date: `2025-12-${String((i % 28) + 1).padStart(2, "0")}` })),
      payments: [{ id: "p-1", member_id: "member-1", amount: 500, verified: true, payment_date: "2025-12-06" }],
    });

    const balance = await calculateMemberBalance("member-1", 12, 2025);
    const bill = await calculateMemberMonthlyBill("member-1", 12, 2025);

    expect(bill.bill).toBeCloseTo(1054, 2);
    expect(balance.netBalance).toBeCloseTo(-554, 2);
    expect(balance.due).toBeCloseTo(554, 2);
  });

  it("TEST 6: positive balance/credit remains when verified payment exceeds the bil", async () => {
    setTableState({
      market: [{ total_cost: 1054, is_approved: true, market_date: "2025-12-01" }],
      meals: Array.from({ length: 11 }, (_, i) => ({ id: `m-${i + 1}`, member_id: "member-1", meal_date: `2025-12-${String((i % 28) + 1).padStart(2, "0")}` })),
      payments: [{ id: "p-1", member_id: "member-1", amount: 5000, verified: true, payment_date: "2025-12-06" }],
    });

    const balance = await calculateMemberBalance("member-1", 12, 2025);

    expect(balance.totalVerifiedPayments).toBeCloseTo(5000, 2);
    expect(balance.bill).toBeCloseTo(1054, 2);
    expect(balance.netBalance).toBeCloseTo(3946, 2);
    expect(balance.advance).toBeCloseTo(3946, 2);
  });

  it("TEST 7: pending payments are excluded from totals", async () => {
    setTableState({
      market: [{ total_cost: 1054, is_approved: true, market_date: "2025-12-01" }],
      meals: Array.from({ length: 11 }, (_, i) => ({ id: `m-${i + 1}`, member_id: "member-1", meal_date: `2025-12-${String((i % 28) + 1).padStart(2, "0")}` })),
      payments: [{ id: "p-1", member_id: "member-1", amount: 5000, verified: false, payment_date: "2025-12-06" }],
    });

    const balance = await calculateMemberBalance("member-1", 12, 2025);

    expect(balance.totalVerifiedPayments).toBe(0);
    expect(balance.netBalance).toBeCloseTo(-1054, 2);
    expect(balance.due).toBeCloseTo(1054, 2);
  });

  it("TEST 8: zero valid meals yields a zero meal rate", async () => {
    setTableState({
      market: [{ total_cost: 1054, is_approved: true, market_date: "2025-12-01" }],
      meals: [],
      payments: [],
    });

    const summary = await calculateMealRateSummary(12, 2025);

    expect(summary.totalMeals).toBe(0);
    expect(summary.ratePerMeal).toBe(0);
  });

  it("TEST 9: no approved market cost yields a zero meal rate", async () => {
    setTableState({
      market: [],
      meals: Array.from({ length: 11 }, (_, i) => ({ id: `m-${i + 1}`, member_id: "member-1", meal_date: `2025-12-${String((i % 28) + 1).padStart(2, "0")}` })),
      payments: [],
    });

    const summary = await calculateMealRateSummary(12, 2025);

    expect(summary.totalApprovedMarketCost).toBe(0);
    expect(summary.ratePerMeal).toBe(0);
  });

  it("TEST 10: previous month data does not leak into current month values", async () => {
    setTableState({
      market: [
        { total_cost: 1054, is_approved: true, market_date: "2025-12-01" },
        { total_cost: 2000, is_approved: true, market_date: "2025-11-20" },
      ],
      meals: [
        { id: "m-1", member_id: "member-1", meal_date: "2025-12-01" },
        { id: "m-2", member_id: "member-1", meal_date: "2025-11-20" },
      ],
      payments: [],
    });

    const summary = await calculateMealRateSummary(12, 2025);

    expect(summary.totalApprovedMarketCost).toBeCloseTo(1054, 2);
    expect(summary.totalMeals).toBe(1);
    expect(summary.ratePerMeal).toBeCloseTo(1054, 2);
  });
});
