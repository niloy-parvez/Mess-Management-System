import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { v4 as uuidv4 } from "uuid";
import { resolveRequesterId } from "../utils/auth";
import { AuthRequest } from "../middlewares/auth";

/**
 * Lock the market for a specific month/year
 * Prevents new market entries from being added after lock
 */
export const lockMarket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
      return;
    }

    // Create a lock record
    const lockId = uuidv4();
    const lockDate = new Date();

    const { data, error } = await supabase
      .from("market_locks")
      .insert({
        id: lockId,
        month,
        year,
        locked_at: lockDate,
        created_by: resolveRequesterId(req),
      });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: `Market locked for ${month}/${year}`,
      data: {
        id: lockId,
        month,
        year,
        locked_at: lockDate,
      },
    });
  } catch (error) {
    console.error("Lock market error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to lock market",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Unlock the market for a specific month/year
 */
export const unlockMarket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
      return;
    }

    const { data, error } = await supabase
      .from("market_locks")
      .delete()
      .eq("month", month)
      .eq("year", year);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: `Market unlocked for ${month}/${year}`,
    });
  } catch (error) {
    console.error("Unlock market error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unlock market",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Check if market is locked for a specific month/year
 */
export const isMarketLocked = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
      return;
    }

    const { data, error } = await supabase
      .from("market_locks")
      .select("*")
      .eq("month", Number(month))
      .eq("year", Number(year))
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    const locked = data ? true : false;

    res.status(200).json({
      success: true,
      locked,
      lockData: data || null,
    });
  } catch (error) {
    console.error("Check market lock error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check market lock status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get all market locks
 */
export const getMarketLocks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from("market_locks")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || [],
      total: (data || []).length,
    });
  } catch (error) {
    console.error("Get market locks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch market locks",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Middleware to check if market is locked before adding new entry
 */
export const marketLockMiddleware = async (req: AuthRequest, res: Response, next: any): Promise<void> => {
  try {
    // Only check for POST requests to market entries
    if (req.method !== "POST") {
      next();
      return;
    }

    const currentDate = new Date();
    const month = currentDate.getMonth() + 1; // 1-12
    const year = currentDate.getFullYear();

    const { data: lockData, error } = await supabase
      .from("market_locks")
      .select("*")
      .eq("month", month)
      .eq("year", year)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (lockData) {
      res.status(403).json({
        success: false,
        message: `Market is locked for ${month}/${year}. No new entries can be added.`,
        locked: true,
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Market lock middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check market lock status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
