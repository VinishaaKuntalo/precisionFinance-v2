# Email Reminders — Usage Guide

Precision Finance sends automatic email reminders before a credit card or
line-of-credit payment is due. This system is **multi-tenant by design**:
every registered user gets reminders sent to *their own* email address,
with no per-user configuration needed on your end. This guide covers how
end users turn reminders on, and how you (the operator) configure the
server so those emails actually go out.

## How it works, end to end

1. A user signs up with their email (`users.email` in the database). That
   email is what every reminder for their accounts gets sent to — it's
   looked up dynamically per schedule, never hardcoded.
2. From the **Linked Accounts** section of the dashboard, the user clicks
   an account card, then **Set Schedule** (or the settings icon on an
   upcoming payment row). This opens the Payment Schedule modal.
3. In that modal they set:
   - **Payment Due Day** — day of the month the payment is due
   - **Minimum Payment** / **Statement Balance** (credit accounts only)
   - **Reminder Days Before Due** — how many days of lead time they want
   - **Autopay enabled** — informational flag, shown on the account card
4. That's it — no email address to type in, no separate "notifications"
   settings page. The reminder goes to the address they registered with.
5. In the background, `runReminderCheck()` (in `server/src/index.ts`) runs
   on a schedule (see below). For every *active* payment schedule across
   *all* users, it:
   - Computes the next due date from `due_day`
   - Flags it as due-soon if `daysUntilDue <= reminder_days`, or overdue
     if the date has passed
   - Groups all due/overdue cards **by the owning user's email**
   - Sends one email per user (not per card) via `sendDueDateReminderEmail`
   - Marks `last_reminder_sent` on each schedule so the same due date is
     never emailed twice

Because grouping happens by `user_email` pulled fresh from the `users`
table on every run, this scales to any number of users automatically —
adding a new user or a new linked account never requires touching server
config.

## Turning on the email send (operator setup)

By default, if SMTP isn't configured, reminder emails are **logged to the
server console** instead of sent — useful for local development, useless
in production. To actually send:

1. Set these in `server/.env` (see `server/.env.example`):
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password       # use an app password, not your real password
   FROM_EMAIL=noreply@precisionfinance.app
   FRONTEND_URL=https://your-deployed-app.example.com
   ```
2. Restart the server. `getEmailStatus()` in `server/src/mail.ts` reports
   whether SMTP is configured if you need to check programmatically.

Any SMTP provider works (Gmail with an app password, SendGrid, Postmark,
Resend's SMTP relay, etc.) — `mail.ts` uses standard `nodemailer`.

## Triggering the reminder check

There are two ways this runs, and they can coexist safely (sends are
deduplicated by due date, so there's no risk of double-emailing):

### Option A — built-in scheduler (default, zero setup)

The server now runs `runReminderCheck()` itself: once ~15 seconds after
boot, then every `REMINDER_CHECK_INTERVAL_MS` (default **6 hours**). This
means a single deployed instance (Railway, Render, a VPS, etc.) handles
reminders on its own — nothing external to configure.

To change the cadence or turn it off:
```
REMINDER_CHECK_INTERVAL_MS=21600000   # 6 hours, the default
REMINDER_CHECK_INTERVAL_MS=0          # disable the built-in scheduler
```

### Option B — external cron (optional, for serverless/multi-instance setups)

If you'd rather control timing externally (e.g. a platform cron job, GitHub
Actions on a schedule, or you're running multiple server instances and
want only one trigger source), call:

```
POST /api/cron/check-reminders
Header: x-cron-secret: <CRON_SECRET from your .env>
```

Set `CRON_SECRET` to a long random string in `server/.env` — this route
uses that shared secret instead of a user JWT since it's meant to be
called by infrastructure, not a logged-in browser session.

Example with system cron + curl, once daily:
```
0 8 * * * curl -s -X POST https://your-api.example.com/api/cron/check-reminders \
  -H "x-cron-secret: $CRON_SECRET" > /dev/null
```

If you're running multiple server instances behind a load balancer, prefer
Option B with `REMINDER_CHECK_INTERVAL_MS=0` on every instance, and point
exactly one external cron at one instance — otherwise each instance's
built-in timer will redundantly (though safely) recheck every few hours.

## Testing it

1. Leave SMTP unset in dev — reminder content prints to the server console
   instead of sending, so you can verify the logic without spamming an
   inbox.
2. Set a payment schedule with `due_day` a few days from today and
   `reminder_days` large enough to cover it (e.g. `reminder_days: 7`).
3. Either wait for the built-in scheduler's ~15s startup check, or call
   `POST /api/cron/check-reminders` yourself with the `x-cron-secret`
   header to trigger immediately.
4. Check the server logs (or your inbox, if SMTP is configured) for the
   reminder email addressed to that account's owner.

## Where the code lives

- `server/src/index.ts` — `runReminderCheck()`, the `/api/cron/check-reminders`
  route, and the built-in `setInterval` scheduler
- `server/src/mail.ts` — `sendDueDateReminderEmail()`, the actual email
  template/send logic
- `src/sections/DashboardSection.tsx` — the `PaymentScheduleModal` UI users
  interact with to set `due_day` / `reminder_days` per account
