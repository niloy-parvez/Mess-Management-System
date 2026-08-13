import nodemailer from "nodemailer";

// Email configuration (use environment variables in production)
const emailConfig = {
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "your-email@gmail.com",
    pass: process.env.EMAIL_PASSWORD || "your-app-password",
  },
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Password Reset Email Template
 */
export const passwordResetEmail = (name: string, resetLink: string): EmailTemplate => ({
  subject: "Reset Your Mess Management Password",
  html: `
    <h2>Password Reset Request</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Click the link below to create a new password:</p>
    <p><a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>Best regards,<br>Mess Management Team</p>
  `,
  text: `Password Reset Request\n\nHi ${name},\n\nClick the link to reset your password: ${resetLink}\n\nThis link will expire in 1 hour.\n\nBest regards,\nMess Management Team`,
});

/**
 * New Payment Notification Email
 */
export const paymentNotificationEmail = (name: string, amount: number, method: string): EmailTemplate => ({
  subject: "New Payment Recorded",
  html: `
    <h2>Payment Recorded</h2>
    <p>Hi ${name},</p>
    <p>A new payment has been recorded:</p>
    <ul>
      <li>Amount: ৳${amount}</li>
      <li>Method: ${method}</li>
      <li>Date: ${new Date().toLocaleDateString()}</li>
    </ul>
    <p>Best regards,<br>Mess Management Team</p>
  `,
  text: `Payment Recorded\n\nHi ${name},\n\nAmount: ৳${amount}\nMethod: ${method}\nDate: ${new Date().toLocaleDateString()}\n\nBest regards,\nMess Management Team`,
});

/**
 * New Market Entry Notification
 */
export const marketNotificationEmail = (recipientName: string, marketDate: string, items: number): EmailTemplate => ({
  subject: "New Market Entry Added",
  html: `
    <h2>New Market Entry</h2>
    <p>Hi ${recipientName},</p>
    <p>A new market entry has been added for ${marketDate} with ${items} items.</p>
    <p>Please review and approve as needed.</p>
    <p>Best regards,<br>Mess Management Team</p>
  `,
  text: `New Market Entry\n\nHi ${recipientName},\n\nA new market entry has been added for ${marketDate} with ${items} items.\n\nBest regards,\nMess Management Team`,
});

/**
 * Monthly Bill Notification Email
 */
export const monthlyBillEmail = (name: string, mealCount: number, mealRate: number, totalBill: number): EmailTemplate => ({
  subject: "Your Monthly Mess Bill is Ready",
  html: `
    <h2>Monthly Mess Bill</h2>
    <p>Hi ${name},</p>
    <p>Your monthly bill for mess expenses has been calculated:</p>
    <table style="border-collapse: collapse; width: 100%; max-width: 400px;">
      <tr style="background-color: #f2f2f2;">
        <td style="border: 1px solid #ddd; padding: 8px;">Meals Taken:</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${mealCount}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">Rate per Meal:</td>
        <td style="border: 1px solid #ddd; padding: 8px;">৳${mealRate.toFixed(2)}</td>
      </tr>
      <tr style="background-color: #4CAF50; color: white;">
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Total Bill:</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">৳${totalBill.toFixed(2)}</td>
      </tr>
    </table>
    <p style="margin-top: 20px;">Please settle your bill at your earliest convenience.</p>
    <p>Best regards,<br>Mess Management Team</p>
  `,
  text: `Monthly Bill\n\nHi ${name},\n\nMeals Taken: ${mealCount}\nRate per Meal: ৳${mealRate.toFixed(2)}\nTotal Bill: ৳${totalBill.toFixed(2)}\n\nBest regards,\nMess Management Team`,
});

/**
 * Due Amount Notification Email
 */
export const dueAmountEmail = (name: string, dueAmount: number, dueDate: string): EmailTemplate => ({
  subject: "Payment Due Reminder",
  html: `
    <h2>Payment Reminder</h2>
    <p>Hi ${name},</p>
    <p>This is a friendly reminder that you have an outstanding balance:</p>
    <p style="font-size: 18px; font-weight: bold;">Due Amount: ৳${dueAmount.toFixed(2)}</p>
    <p>Due Date: ${dueDate}</p>
    <p>Please arrange payment at your earliest convenience.</p>
    <p>Best regards,<br>Mess Management Team</p>
  `,
  text: `Payment Reminder\n\nHi ${name},\n\nDue Amount: ৳${dueAmount.toFixed(2)}\nDue Date: ${dueDate}\n\nBest regards,\nMess Management Team`,
});

/**
 * Backup Notification Email
 */
export const backupEmail = (timestamp: string, backupSize: string): EmailTemplate => ({
  subject: "Database Backup Completed",
  html: `
    <h2>Database Backup Completed</h2>
    <p>A backup of your mess management database has been completed successfully.</p>
    <ul>
      <li>Timestamp: ${timestamp}</li>
      <li>Backup Size: ${backupSize}</li>
    </ul>
    <p>Your data is safe and secure.</p>
    <p>Best regards,<br>Mess Management Team</p>
  `,
  text: `Database Backup Completed\n\nTimestamp: ${timestamp}\nBackup Size: ${backupSize}\n\nBest regards,\nMess Management Team`,
});

/**
 * Send Email
 */
export const sendEmail = async (
  toEmail: string,
  template: EmailTemplate
): Promise<{ success: boolean; message: string }> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || "your-email@gmail.com",
      to: toEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`Email sent to ${toEmail}:`, info.response);

    return {
      success: true,
      message: `Email sent successfully to ${toEmail}`,
    };
  } catch (error) {
    console.error(`Error sending email to ${toEmail}:`, error);

    return {
      success: false,
      message: `Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

/**
 * Test Email Connection
 */
export const testEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log("Email service is ready to send emails");
    return true;
  } catch (error) {
    console.error("Email service error:", error);
    return false;
  }
};
