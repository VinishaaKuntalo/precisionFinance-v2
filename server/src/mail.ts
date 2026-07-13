import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || 'noreply@precisionfinance.app';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const isConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${FRONTEND_URL}?reset_token=${token}`;

  if (!isConfigured || !transporter) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  EMAIL NOT CONFIGURED - Password reset link below:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  To: ${to}`);
    console.log(`  Reset URL: ${resetUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { sent: false, logged: true, resetUrl };
  }

  await transporter.sendMail({
    from: `Precision Finance <${FROM_EMAIL}>`,
    to,
    subject: 'Password Reset Request',
    text: `You requested a password reset.\n\nClick this link to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #ef4444;">Password Reset</h2>
        <p>You requested a password reset for your Precision Finance account.</p>
        <p><a href="${resetUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600;">Reset Password</a></p>
        <p style="color: #666; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">Precision Finance</p>
      </div>
    `,
  });

  return { sent: true, logged: false, resetUrl };
}

export interface DueReminderCard {
  accountName: string;
  institutionName: string;
  mask: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysUntilDue: number;
  isOverdue: boolean;
}

export async function sendDueDateReminderEmail(to: string, cards: DueReminderCard[]) {
  if (cards.length === 0) return { sent: false, logged: false };

  const rows = cards
    .map((c) => {
      const amount = new Intl.NumberFormat('en-CA', { style: 'currency', currency: c.currency || 'CAD' }).format(c.amount || 0);
      const status = c.isOverdue
        ? `<span style="color:#dc2626;font-weight:600;">Overdue</span>`
        : c.daysUntilDue === 0
        ? `<span style="color:#b45309;font-weight:600;">Due today</span>`
        : `<span style="color:#b45309;font-weight:600;">Due in ${c.daysUntilDue} day${c.daysUntilDue === 1 ? '' : 's'}</span>`;
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:600;color:#111827;">${c.institutionName} ${c.accountName}${c.mask ? ` •••• ${c.mask}` : ''}</div>
            <div style="font-size:13px;color:#6b7280;margin-top:2px;">Due ${c.dueDate} — ${status}</div>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;">
            ${amount}
          </td>
        </tr>`;
    })
    .join('');

  const text = cards
    .map((c) => `${c.institutionName} ${c.accountName}: ${c.amount} due ${c.dueDate} (${c.isOverdue ? 'OVERDUE' : `${c.daysUntilDue} day(s) left`})`)
    .join('\n');

  if (!isConfigured || !transporter) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  EMAIL NOT CONFIGURED - Due date reminder below:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  To: ${to}`);
    console.log(text);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { sent: false, logged: true };
  }

  await transporter.sendMail({
    from: `Precision Finance <${FROM_EMAIL}>`,
    to,
    subject: cards.some((c) => c.isOverdue) ? 'Overdue: credit card payment(s) need attention' : 'Reminder: upcoming credit card payment(s)',
    text: `You have upcoming credit card payments:\n\n${text}\n\nView details: ${FRONTEND_URL}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #111827;">
        <h2 style="color: #7c3aed; margin-bottom: 4px;">Payment Reminder</h2>
        <p style="color: #6b7280; font-size: 14px; margin-top: 0;">The following card(s) have payments coming up:</p>
        <table style="width: 100%; border-collapse: collapse;">${rows}</table>
        <p style="margin-top: 24px;">
          <a href="${FRONTEND_URL}" style="display: inline-block; background: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Open Precision Finance</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">You're receiving this because you have a payment reminder set on this account.</p>
      </div>
    `,
  });

  return { sent: true, logged: false };
}

export function getEmailStatus() {
  return { isConfigured, from: FROM_EMAIL };
}
