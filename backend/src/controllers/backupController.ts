import { Response } from "express";
import { supabase } from "../config/supabase";
import { v4 as uuidv4 } from "uuid";
import { sendEmail, backupEmail } from "../services/emailService";
import { resolveRequesterId } from "../utils/auth";
import { AuthRequest } from "../middlewares/auth";

/**
 * Create a database backup
 */
export const createBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const backupId = uuidv4();
    const timestamp = new Date();

    // Get all tables data
    const tables = ["members", "meals", "market", "expenses", "payments", "notices"];
    const backupData: Record<string, any> = {
      backupId,
      timestamp,
      version: "1.0",
    };

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select("*");

      if (error) {
        console.error(`Error fetching ${table}:`, error);
      } else {
        backupData[table] = data || [];
      }
    }

    // Store backup record
    const { error: backupError } = await supabase
      .from("backups")
      .insert({
        id: backupId,
        backup_data: backupData,
        created_by: resolveRequesterId(req),
        created_at: timestamp,
        status: "completed",
      });

    if (backupError) {
      throw backupError;
    }

    // Calculate backup size
    const backupSize = JSON.stringify(backupData).length;
    const backupSizeMB = (backupSize / (1024 * 1024)).toFixed(2);

    // Send notification email
    if (req.user?.email) {
      await sendEmail(req.user.email, backupEmail(timestamp.toISOString(), `${backupSizeMB} MB`));
    }

    res.status(200).json({
      success: true,
      message: "Backup created successfully",
      data: {
        backupId,
        timestamp,
        size: `${backupSizeMB} MB`,
        recordCount: Object.values(backupData).reduce((sum, arr) => {
          if (Array.isArray(arr)) return sum + arr.length;
          return sum;
        }, 0),
      },
    });
  } catch (error) {
    console.error("Backup creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create backup",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Download backup file
 */
export const downloadBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { backupId } = req.params;

    if (!backupId) {
      res.status(400).json({
        success: false,
        message: "Backup ID is required",
      });
      return;
    }

    const { data: backupRecord, error } = await supabase
      .from("backups")
      .select("*")
      .eq("id", backupId)
      .single();

    if (error || !backupRecord) {
      res.status(404).json({
        success: false,
        message: "Backup not found",
      });
      return;
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="mess-backup-${backupId}.json"`
    );
    res.send(JSON.stringify(backupRecord.backup_data, null, 2));
  } catch (error) {
    console.error("Backup download error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to download backup",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Restore from backup
 */
export const restoreBackup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { backupId } = req.params;

    if (!backupId) {
      res.status(400).json({
        success: false,
        message: "Backup ID is required",
      });
      return;
    }

    // Fetch backup record
    const { data: backupRecord, error: fetchError } = await supabase
      .from("backups")
      .select("*")
      .eq("id", backupId)
      .single();

    if (fetchError || !backupRecord) {
      res.status(404).json({
        success: false,
        message: "Backup not found",
      });
      return;
    }

    const backupData = backupRecord.backup_data;

    // Restore each table
    const tables = ["members", "meals", "market", "expenses", "payments", "notices"];
    let restoreCount = 0;

    for (const table of tables) {
      if (backupData[table] && Array.isArray(backupData[table])) {
        for (const record of backupData[table]) {
          try {
            // Delete existing record if exists (to avoid duplicates)
            if (record.id) {
              await supabase.from(table).delete().eq("id", record.id);
            }

            // Insert backup record
            const { error: insertError } = await supabase
              .from(table)
              .insert(record);

            if (!insertError) {
              restoreCount++;
            }
          } catch (e) {
            console.error(`Error restoring record from ${table}:`, e);
          }
        }
      }
    }

    // Log restore operation
    await supabase.from("backup_logs").insert({
      id: uuidv4(),
      backup_id: backupId,
      action: "restore",
      restored_by: resolveRequesterId(req),
      record_count: restoreCount,
      status: "completed",
      created_at: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Backup restored successfully",
      data: {
        restoredRecords: restoreCount,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("Backup restore error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore backup",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get backup history
 */
export const getBackupHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const { data, error, count } = await supabase
      .from("backups")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: count || 0,
      },
    });
  } catch (error) {
    console.error("Get backup history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch backup history",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Delete old backups
 */
export const deleteOldBackups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { daysOld = 30 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data: deletedBackups, error } = await supabase
      .from("backups")
      .delete()
      .lt("created_at", cutoffDate.toISOString());

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: `Deleted backups older than ${daysOld} days`,
    });
  } catch (error) {
    console.error("Delete old backups error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete old backups",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Soft delete member (moved to recycle bin)
 */
export const getRecycleBin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("is_active", false)
      .order("leave_date", { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data || [],
      total: (data || []).length,
    });
  } catch (error) {
    console.error("Get recycle bin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch deleted members",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Permanently delete member from recycle bin
 */
export const permanentlyDeleteMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { memberId } = req.params;

    if (!memberId) {
      res.status(400).json({
        success: false,
        message: "Member ID is required",
      });
      return;
    }

    // Check if member is soft deleted
    const { data: member, error: fetchError } = await supabase
      .from("members")
      .select("*")
      .eq("id", memberId)
      .single();

    if (fetchError || !member) {
      res.status(404).json({
        success: false,
        message: "Member not found",
      });
      return;
    }

    if (member.is_active) {
      res.status(400).json({
        success: false,
        message: "Cannot permanently delete active member",
      });
      return;
    }

    // Delete member and related records
    const { error: deleteError } = await supabase
      .from("members")
      .delete()
      .eq("id", memberId);

    if (deleteError) {
      throw deleteError;
    }

    res.status(200).json({
      success: true,
      message: "Member permanently deleted",
    });
  } catch (error) {
    console.error("Permanent delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to permanently delete member",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
