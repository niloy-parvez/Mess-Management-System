import { Response } from "express";
import supabase from "../config/supabase";
import { sendSuccess, sendError, sendPaginated } from "../utils/response";
import { AuthRequest } from "../middlewares/auth";
import { resolveRequesterId } from "../utils/auth";
import { handleMissingTableError } from "../utils/dbHelpers";

// Local in-memory payment fallback removed for production. Ensure payments table exists and RLS/policies allow access.

const normalizePaymentMethod = (paymentMethod: string) => {
  const normalized = String(paymentMethod || "").trim().toLowerCase();
  if (normalized === "bank") return "bank_transfer";
  if (normalized === "mobile_banking" || normalized === "mobile-banking" || normalized === "mobile") return "bkash";
  if (normalized === "cash") return "cash";
  if (normalized === "bkash" || normalized === "nagad" || normalized === "bank_transfer") return normalized;
  return "cash";
};

const canManagePayments = (req: AuthRequest): boolean => req.user?.role === "admin";

export const createPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!canManagePayments(req)) {
      sendError(res, "Admin access required", undefined, 403);
      return;
    }

    const { member_id, amount, payment_method, reference, payment_date, notes } = req.body;

    if (!member_id || !amount || !payment_method) {
      sendError(res, "Member ID, amount, and payment method are required", undefined, 400);
      return;
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      sendError(res, "Amount must be a positive number", undefined, 400);
      return;
    }

    const normalizedMethod = normalizePaymentMethod(payment_method);
    const normalizedDate = payment_date || new Date().toISOString().split("T")[0];

    const { data: memberExists, error: memberError } = await supabase
      .from("members")
      .select("id, is_active")
      .eq("id", member_id)
      .maybeSingle();

    if (memberError) {
      sendError(res, "Failed to validate member", memberError.message, 500);
      return;
    }

    if (!memberExists) {
      sendError(res, "Member not found", undefined, 404);
      return;
    }

    let duplicateQuery = supabase
      .from("payments")
      .select("id")
      .eq("member_id", member_id)
      .eq("amount", normalizedAmount)
      .eq("payment_method", normalizedMethod)
      .eq("payment_date", normalizedDate)
      .limit(1);

    duplicateQuery = reference
      ? duplicateQuery.eq("reference", reference)
      : duplicateQuery.is("reference", null);

    const { data: duplicatePayment, error: duplicateCheckError } = await duplicateQuery.maybeSingle();

    if (duplicateCheckError) {
      sendError(res, "Failed to validate duplicate payment", duplicateCheckError.message, 500);
      return;
    }

    if (duplicatePayment?.id) {
      sendError(res, "Duplicate payment record detected", undefined, 409);
      return;
    }

    // Attempt to determine a valid created_by value that matches auth.users.id.
    // Prefer the authenticated request user, fall back to the member's mapped user_id if present.
    const createdById = resolveRequesterId(req);


    let payment: any = null;
    let error: any = null;
    try {
      const insertResult = await supabase
        .from("payments")
        .insert([
          {
            member_id,
            amount: normalizedAmount,
            payment_method: normalizedMethod,
            reference: reference || null,
            notes: notes || null,
            payment_date: normalizedDate,
            verified: false,
            created_by: createdById,
          },
        ])
        .select("*, member:members(id, name, email)")
        .single();
      payment = insertResult.data;
      error = insertResult.error;
    } catch (e: any) {
      // Capture thrown errors from the client and normalize into error variable
      console.error('[Payments] insert thrown error', e && e.message ? e.message : e);
      error = e;
    }

    // If the insert failed due to a foreign key constraint on created_by (common in mismatched auth schema),
    // return a clear actionable error. Do NOT retry without created_by — that masks the real identity mapping issue.
    if (error && String(error?.message || "").toLowerCase().includes("violates foreign key constraint") ) {
      if (handleMissingTableError(res, error, "Payments table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Payment creation failed due to inconsistent user/member mapping in the database. Ensure the member has a matching auth user (auth.users) and that created_by uses the canonical auth.users id.", error.message || String(error), 400);
      return;
    }

    if (error) {
      console.error('[Payments] insert result error object:', error);
      // If the error is due to a missing payments table, handle specially
      if (handleMissingTableError(res, error, "Payments table missing in the Supabase schema")) {
        return;
      }

      // Detect common FK or NOT NULL constraint issues and return a clear error message
      const errMsg = String(error?.message || error || "").toLowerCase();
      if (errMsg.includes("null value in column \"created_by\"") || errMsg.includes("violates foreign key constraint")) {
        sendError(res, "Payment creation failed due to inconsistent user/member mapping in the database. Ensure the member has a matching auth user (auth.users) or adjust created_by before retrying.", error.message || String(error), 400);
        return;
      }

      sendError(res, "Failed to create payment", error.message, 500);
      return;
    }

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }
    sendSuccess(res, payment, "Payment created successfully", 201);
  } catch (error: any) {
    sendError(res, "Failed to create payment", error.message, 500);
  }
};

export const getPayments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 20, member_id, verified, payment_method } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from("payments")
      .select("*, member:members(id, name, email)", { count: "exact" });

    if (req.user?.role !== "admin") {
      if (!req.user?.memberId) {
        sendError(res, "Member profile is not linked to this user", undefined, 403);
        return;
      }
      query = query.eq("member_id", req.user.memberId);
    } else if (member_id) {
      query = query.eq("member_id", member_id);
    }

    if (payment_method) {
      query = query.eq("payment_method", normalizePaymentMethod(payment_method as string));
    }

    if (verified !== undefined) {
      query = query.eq("verified", verified === "true");
    }

    const { data: payments, error, count } = await query
      .order("payment_date", { ascending: false })
      .range(offset, offset + limitNum - 1)
      .limit(limitNum);

    if (error) {
      if (handleMissingTableError(res, error, "Payments table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to fetch payments", error.message, 500);
      return;
    }

    sendPaginated(
      res,
      payments || [],
      pageNum,
      limitNum,
      count || (payments || []).length,
      "Payments fetched successfully"
    );
  } catch (error: any) {
    sendError(res, "Failed to fetch payments", error.message, 500);
  }
};

export const updatePayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!canManagePayments(req)) {
      sendError(res, "Admin access required", undefined, 403);
      return;
    }

    const { id } = req.params;
    const { amount, payment_method, reference, payment_date, notes } = req.body;
    const nextMethod = normalizePaymentMethod(payment_method || "cash");

    const { data: payment, error } = await supabase
      .from("payments")
      .update({
        amount: Number(amount || 0),
        payment_method: nextMethod,
        reference: reference || null,
        notes: notes || null,
        payment_date: payment_date || new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (handleMissingTableError(res, error, "Payments table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to update payment", error.message, 500);
      return;
    }

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }
    sendSuccess(res, payment, "Payment updated successfully");
  } catch (error: any) {
    sendError(res, "Failed to update payment", error.message, 500);
  }
};

export const verifyPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!canManagePayments(req)) {
      sendError(res, "Admin access required", undefined, 403);
      return;
    }

    const { id } = req.params;

    const { data: payment, error } = await supabase
      .from("payments")
      .update({
        verified: true,
        verified_by: resolveRequesterId(req),
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (handleMissingTableError(res, error, "Payments table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to verify payment", error.message, 500);
      return;
    }

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }

    // Recalculate monthly bills for the payment's month/year so member balances reflect the newly verified payment
    try {
      const paymentDate = payment?.payment_date || new Date().toISOString().split("T")[0];
      const dt = new Date(paymentDate);
      const month = dt.getMonth() + 1;
      const year = dt.getFullYear();
      const { generateMonthlyBillsForMonth } = await import("./reportController");
      await generateMonthlyBillsForMonth(month, year, resolveRequesterId(req));
    } catch (e) {
      // don't fail the request if bill regeneration fails; log for investigation
      console.error('[Payments] Failed to regenerate monthly bills after verification:', (e as any)?.message || e);
    }

    sendSuccess(res, payment, "Payment verified successfully");
  } catch (error: any) {
    sendError(res, "Failed to verify payment", error.message, 500);
  }
};

export const deletePayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!canManagePayments(req)) {
      sendError(res, "Admin access required", undefined, 403);
      return;
    }

    const { id } = req.params;

    const { data: existingPayment, error: existingPaymentError } = await supabase
      .from("payments")
      .select("id, notes, payment_date")
      .eq("id", id)
      .maybeSingle();

    if (existingPaymentError) {
      sendError(res, "Failed to delete payment", existingPaymentError.message, 500);
      return;
    }

    if (!existingPayment?.id) {
      sendError(res, "Payment not found", undefined, 404);
      return;
    }

    const currentNotes = String(existingPayment.notes || "");
    const voidMarker = "[voided-by-admin]";
    if (currentNotes.includes(voidMarker)) {
      sendSuccess(res, existingPayment, "Payment already voided");
      return;
    }

    const { data: payment, error } = await supabase
      .from("payments")
      .update({
        verified: false,
        notes: `${currentNotes}\n${voidMarker}`.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      if (handleMissingTableError(res, error, "Payments table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to delete payment", error.message, 500);
      return;
    }

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }

    // Recalculate monthly bills for the payment's month/year so member balances reflect the revoked/voided payment
    try {
      const paymentDate = existingPayment?.payment_date || new Date().toISOString().split("T")[0];
      const dt = new Date(paymentDate);
      const month = dt.getMonth() + 1;
      const year = dt.getFullYear();
      const { generateMonthlyBillsForMonth } = await import("./reportController");
      await generateMonthlyBillsForMonth(month, year, resolveRequesterId(req));
    } catch (e) {
      console.error('[Payments] Failed to regenerate monthly bills after payment void:', (e as any)?.message || e);
    }

    sendSuccess(res, payment, "Payment voided successfully");
  } catch (error: any) {
    sendError(res, "Failed to delete payment", error.message, 500);
  }
};

export const getPaymentStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    let query = supabase
      .from("payments")
      .select("amount, verified, payment_date, member_id")
      .order("payment_date", { ascending: false });

    if (req.user?.role !== "admin") {
      if (!req.user?.memberId) {
        sendError(res, "Member profile is not linked to this user", undefined, 403);
        return;
      }
      query = query.eq("member_id", req.user.memberId);
    }

    const { data: payments, error } = await query;

    if (error) {
      sendError(res, "Failed to fetch payment stats", error.message, 500);
      return;
    }

    const verifiedAmount = payments
      ?.filter((payment) => payment.verified)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
    const pendingAmount = payments
      ?.filter((payment) => !payment.verified)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;

    sendSuccess(
      res,
      {
        totalCollection: verifiedAmount,
        pendingCollection: pendingAmount,
        paymentCount: payments?.length || 0,
      },
      "Payment statistics fetched successfully"
    );
  } catch (error: any) {
    sendError(res, "Failed to fetch payment stats", error.message, 500);
  }
};
