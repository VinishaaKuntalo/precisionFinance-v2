import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { plaidApi, paymentsApi } from '@/services/api';
import {
  CreditCard as CardIcon,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Plus,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  X,
  RefreshCw,
  Building2,
  Calendar,
  AlertTriangle,
  Bell,
  Settings,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function formatCurrency(amount: number, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function daysUntilText(days: number) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days}d remaining`;
}

interface Account {
  id: number;
  plaid_account_id: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  balance_current: number;
  balance_available: number;
  balance_limit: number;
  currency_code: string;
  institution_name: string;
}

interface Transaction {
  id: number;
  plaid_transaction_id: string;
  name: string;
  merchant_name: string;
  amount: number;
  date: string;
  category: string;
  pending: number;
  account_name: string;
  account_type: string;
}

interface PaymentSchedule {
  id: number;
  account_id: number;
  due_day: number;
  minimum_payment: number;
  statement_balance: number;
  autopay_enabled: number;
  reminder_days: number;
  account_name: string;
  institution_name: string;
  mask: string;
  type: string;
  balance_current: number;
  balance_limit: number;
  currency_code: string;
  dueDate?: string;
  daysUntilDue?: number;
  isOverdue?: boolean;
  isUrgent?: boolean;
  utilizationRate?: number;
}

function getCardColor(type: string, subtype: string) {
  const key = `${type}-${subtype}`.toLowerCase();
  if (key.includes('credit')) return '#C41F3E';
  if (key.includes('checking')) return '#016FD0';
  if (key.includes('savings')) return '#00D632';
  return '#6b7280';
}

function getCardLogo(institution: string, type: string) {
  if (institution.toLowerCase().includes('amex')) return 'AMEX';
  if (institution.toLowerCase().includes('cibc')) return 'CIBC';
  if (institution.toLowerCase().includes('scotiabank')) return 'SB';
  if (institution.toLowerCase().includes('td')) return 'TD';
  if (institution.toLowerCase().includes('rbc')) return 'RBC';
  if (institution.toLowerCase().includes('bmo')) return 'BMO';
  if (institution.toLowerCase().includes('national')) return 'NBC';
  if (institution.toLowerCase().includes('neo')) return 'NEO';
  if (institution.toLowerCase().includes('wealthsimple')) return 'WS';
  if (institution.toLowerCase().includes('rogers')) return 'RB';
  if (type.toLowerCase().includes('credit')) return 'CC';
  return 'BK';
}

// ─── Payment Schedule Modal ───────────────────────────

function PaymentScheduleModal({
  account,
  existingSchedule,
  onClose,
  onSave,
  onDelete,
}: {
  account: Account;
  existingSchedule: PaymentSchedule | null;
  onClose: () => void;
  onSave: (data: {
    account_id: number;
    due_day: number;
    minimum_payment: number;
    statement_balance: number;
    autopay_enabled: boolean;
    reminder_days: number;
  }) => void;
  onDelete?: () => void;
}) {
  const [dueDay, setDueDay] = useState(existingSchedule?.due_day || 1);
  const [minPayment, setMinPayment] = useState(existingSchedule?.minimum_payment || 0);
  const [statementBalance, setStatementBalance] = useState(existingSchedule?.statement_balance || account.balance_current || 0);
  const [autopay, setAutopay] = useState(!!existingSchedule?.autopay_enabled);
  const [reminderDays, setReminderDays] = useState(existingSchedule?.reminder_days || 3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      account_id: account.id,
      due_day: dueDay,
      minimum_payment: minPayment,
      statement_balance: statementBalance,
      autopay_enabled: autopay,
      reminder_days: reminderDays,
    });
  };

  const isCredit = account.type === 'credit';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(24,24,27,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass-modal w-full max-w-md"
               onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-violet-600" />
            <h3 className="text-zinc-900 font-semibold text-sm">Payment Schedule</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-8 h-8 flex items-center justify-center text-white font-bold text-[10px]"
              style={{ backgroundColor: getCardColor(account.type, account.subtype), borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}
            >
              {getCardLogo(account.institution_name, account.type)}
            </div>
            <div>
              <p className="text-zinc-900 text-sm font-medium">{account.institution_name}</p>
              <p className="text-zinc-500 text-xs font-mono-data">{account.name} • **** {account.mask || '0000'}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-zinc-500 text-xs font-mono-data uppercase mb-1 block">
                Payment Due Day (of month)
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full glass-input text-sm px-3 py-2"
                               required
              />
            </div>

            {isCredit && (
              <>
                <div>
                  <label className="text-zinc-500 text-xs font-mono-data uppercase mb-1 block">
                    Minimum Payment
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={minPayment}
                    onChange={(e) => setMinPayment(Number(e.target.value))}
                    className="w-full glass-input text-sm px-3 py-2"
                                     />
                </div>
                <div>
                  <label className="text-zinc-500 text-xs font-mono-data uppercase mb-1 block">
                    Statement Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={statementBalance}
                    onChange={(e) => setStatementBalance(Number(e.target.value))}
                    className="w-full glass-input text-sm px-3 py-2"
                                     />
                </div>
              </>
            )}

            <div>
              <label className="text-zinc-500 text-xs font-mono-data uppercase mb-1 block">
                Reminder Days Before Due
              </label>
              <input
                type="number"
                min={0}
                max={14}
                value={reminderDays}
                onChange={(e) => setReminderDays(Number(e.target.value))}
                className="w-full glass-input text-sm px-3 py-2"
                             />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autopay"
                checked={autopay}
                onChange={(e) => setAutopay(e.target.checked)}
                className="w-4 h-4 accent-violet-600"
              />
              <label htmlFor="autopay" className="text-zinc-900 text-sm">
                Autopay enabled
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 btn-primary text-sm py-2.5"
                             >
                <Save className="w-3 h-3 inline mr-1" />
                {existingSchedule ? 'Update Schedule' : 'Save Schedule'}
              </button>
              {existingSchedule && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-600 px-4 py-2.5 transition-colors rounded-lg"
                                 >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Card Detail Modal ────────────────────────────────

function CardDetailModal({
  account,
  transactions,
  existingSchedule,
  onClose,
  onEditSchedule,
}: {
  account: Account;
  transactions: Transaction[];
  existingSchedule: PaymentSchedule | null;
  onClose: () => void;
  onEditSchedule: (account: Account) => void;
}) {
  const accountTx = transactions.filter((t) => t.account_name === account.name);
  const isCredit = account.type === 'credit';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(24,24,27,0.45)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass-modal w-full max-w-lg max-h-[80vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 flex items-center justify-center text-white font-bold text-xs"
              style={{ backgroundColor: getCardColor(account.type, account.subtype), borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}
            >
              {getCardLogo(account.institution_name, account.type)}
            </div>
            <div>
              <h3 className="text-zinc-900 font-semibold text-lg">{account.name}</h3>
              <p className="text-zinc-500 text-xs font-mono-data">
                {account.institution_name} • **** {account.mask || '0000'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass-inset p-4">
              <p className="text-zinc-500 text-xs font-mono-data uppercase mb-1">
                {isCredit ? 'Current Balance' : 'Available Balance'}
              </p>
              <p className="text-zinc-900 text-2xl font-bold">
                {formatCurrency(account.balance_current, account.currency_code)}
              </p>
            </div>
            <div className="glass-inset p-4">
              <p className="text-zinc-500 text-xs font-mono-data uppercase mb-1">
                {isCredit ? 'Available Credit' : 'Total Balance'}
              </p>
              <p className="text-green-600 text-2xl font-bold">
                {formatCurrency(
                  isCredit ? account.balance_available : account.balance_current,
                  account.currency_code
                )}
              </p>
            </div>
            {isCredit && (
              <div className="glass-inset p-4">
                <p className="text-zinc-500 text-xs font-mono-data uppercase mb-1">Credit Limit</p>
                <p className="text-zinc-900 text-lg font-semibold">
                  {formatCurrency(account.balance_limit, account.currency_code)}
                </p>
              </div>
            )}
            <div className="glass-inset p-4">
              <p className="text-zinc-500 text-xs font-mono-data uppercase mb-1">Type</p>
              <p className="text-zinc-900 text-lg font-semibold capitalize">
                {account.subtype || account.type}
              </p>
            </div>
          </div>

          {/* Payment Schedule Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-600" />
                <p className="text-zinc-500 text-xs font-mono-data uppercase">Payment Schedule</p>
              </div>
              <button
                onClick={() => onEditSchedule(account)}
                className="text-violet-600 text-xs font-medium hover:text-violet-500 transition-colors flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                {existingSchedule ? 'Edit' : 'Set Schedule'}
              </button>
            </div>
            {existingSchedule ? (
              <div className="glass-inset p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-zinc-500 text-xs font-mono-data uppercase mb-1">Due Date</p>
                    <p className="text-zinc-900 text-lg font-semibold">Day {existingSchedule.due_day}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs font-mono-data uppercase mb-1">Min. Payment</p>
                    <p className="text-zinc-900 text-lg font-semibold">
                      {formatCurrency(existingSchedule.minimum_payment, account.currency_code)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs font-mono-data uppercase mb-1">Reminder</p>
                    <p className="text-zinc-900 text-sm font-medium">
                      {existingSchedule.reminder_days} days before
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs font-mono-data uppercase mb-1">Autopay</p>
                    <p className={existingSchedule.autopay_enabled ? 'text-green-600 text-sm font-medium' : 'text-zinc-500 text-sm font-medium'}>
                      {existingSchedule.autopay_enabled ? 'Enabled' : 'Off'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-inset p-4 text-center">
                <p className="text-zinc-500 text-xs mb-2">No payment schedule set for this account</p>
                <button
                  onClick={() => onEditSchedule(account)}
                  className="text-violet-600 text-xs font-medium hover:text-violet-500 transition-colors"
                >
                  + Set Payment Schedule
                </button>
              </div>
            )}
          </div>

          <div>
            <p className="text-zinc-500 text-xs font-mono-data uppercase mb-3">Recent Transactions</p>
            <div className="space-y-2">
              {accountTx.length === 0 && (
                <p className="text-zinc-500 text-sm">No transactions yet. Click Sync to pull data.</p>
              )}
              {accountTx.slice(0, 10).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-50 border border-zinc-100 flex items-center justify-center rounded-lg">
                      {tx.amount > 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-red-500" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-zinc-900 text-sm">{tx.name}</p>
                      <p className="text-zinc-500 text-xs">{tx.category || tx.account_type}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-mono-data font-medium ${tx.amount < 0 ? 'text-green-600' : 'text-zinc-900'}`}>
                    {tx.amount < 0 ? '' : '+'}
                    {formatCurrency(Math.abs(tx.amount), account.currency_code)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Account Category Helper ──────────────────────────

function getAccountCategory(account: Account): 'credit' | 'line-of-credit' | 'checking' | 'savings' | 'other' {
  const subtype = (account.subtype || '').toLowerCase();
  const type = (account.type || '').toLowerCase();
  if (subtype.includes('line of credit') || type === 'line of credit') return 'line-of-credit';
  if (type === 'credit' || subtype.includes('credit')) return 'credit';
  if (type === 'depository' && subtype === 'checking') return 'checking';
  if (type === 'depository' && subtype === 'savings') return 'savings';
  return 'other';
}

// ─── Main Dashboard ───────────────────────────────────

export default function DashboardSection() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<PaymentSchedule[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [scheduleAccount, setScheduleAccount] = useState<Account | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [plaidError, setPlaidError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [transactionsExpanded, setTransactionsExpanded] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await plaidApi.getAccounts();
      setAccounts(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await plaidApi.getTransactions();
      setTransactions(data);
    } catch (err: any) {
      console.error('Failed to load transactions:', err.message);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      const data = await paymentsApi.getUpcoming();
      setUpcomingPayments(data);
      const allSchedules = await paymentsApi.getSchedules();
      setSchedules(allSchedules);
    } catch (err: any) {
      console.error('Failed to load payment schedules:', err.message);
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await plaidApi.sync();
      await fetchAccounts();
      await fetchTransactions();
      await fetchSchedules();
    } catch (err: any) {
      setError(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
    fetchSchedules();
  }, [fetchAccounts, fetchTransactions, fetchSchedules]);

  const onSuccess = useCallback(
    async (publicToken: string) => {
      try {
        await plaidApi.exchangePublicToken(publicToken);
        await fetchAccounts();
        await fetchTransactions();
        setLinkToken(null);
        setPlaidError('');
      } catch (err: any) {
        const msg = err.message || 'Failed to link account';
        setPlaidError(msg);
        if (msg.toLowerCase().includes('oauth') || msg.toLowerCase().includes('institution')) {
          setPlaidError('This institution may require OAuth. Please check your Plaid Dashboard settings or try a different institution.');
        }
      }
    },
    [fetchAccounts, fetchTransactions]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: (err, metadata) => {
      if (err?.error_code) {
        const errorCode = err.error_code;
        let userMessage = `Plaid Error: ${err.error_message || errorCode}`;

        // OAuth-specific error handling
        if (errorCode === 'OAUTH_NEEDED' || errorCode === 'INSTITUTION_NOT_ENABLED') {
          userMessage = 'Wealthsimple requires OAuth. Please ensure: (1) OAuth is enabled in your Plaid Dashboard, (2) Your redirect URI is registered, (3) Try using the Plaid Sandbox test credentials first.';
        } else if (errorCode === 'ITEM_LOGIN_REQUIRED') {
          userMessage = 'Login failed. If MFA is enabled, ensure you complete the full OAuth flow on the bank\'s website.';
        } else if (errorCode === 'INSTITUTION_DOWN') {
          userMessage = 'Wealthsimple is temporarily unavailable. Please try again later.';
        } else if (errorCode === 'USER_PERMISSION_REVOKED') {
          userMessage = 'Access was denied. Please check your Wealthsimple account permissions.';
        }

        setPlaidError(userMessage);
        console.log('Plaid exit:', { errorCode, metadata });
      }
      setLinkToken(null);
    },
    onEvent: (eventName, metadata) => {
      // Log OAuth events for debugging
      if (eventName === 'OPEN_OAUTH' || eventName === 'HANDOFF' || eventName === 'ERROR') {
        console.log('Plaid event:', eventName, metadata);
      }
    },
  });

  const openPlaidLink = async () => {
    try {
      const data = await plaidApi.createLinkToken();
      setLinkToken(data.link_token);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Plaid');
    }
  };

  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  const handleSaveSchedule = async (data: {
    account_id: number;
    due_day: number;
    minimum_payment: number;
    statement_balance: number;
    autopay_enabled: boolean;
    reminder_days: number;
  }) => {
    try {
      await paymentsApi.createSchedule(data);
      await fetchSchedules();
      setScheduleAccount(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save schedule');
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    try {
      await paymentsApi.deleteSchedule(id);
      await fetchSchedules();
      setScheduleAccount(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete schedule');
    }
  };

  const handleDeleteAccount = async (accountId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Remove this account from your dashboard?')) return;
    try {
      await plaidApi.deleteAccount(accountId);
      if (selectedAccount?.id === accountId) setSelectedAccount(null);
      if (scheduleAccount?.id === accountId) setScheduleAccount(null);
      await fetchAccounts();
      await fetchTransactions();
      await fetchSchedules();
    } catch (err: any) {
      setError(err.message || 'Failed to remove account');
    }
  };

  // Month options for the filter dropdown
  const monthOptions = [];
  const now = new Date();
  for (let i = -2; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-CA', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  const filteredTransactions = transactions.filter((t) => t.date && t.date.startsWith(selectedMonth));

  const filteredUpcomingPayments = upcomingPayments.filter((p) => {
    if (p.daysUntilDue === undefined) return false;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + p.daysUntilDue);
    const dueMonth = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
    return dueMonth === selectedMonth;
  });

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance_current || 0), 0);
  const totalAvailable = accounts.reduce((sum, a) => sum + (a.balance_available || 0), 0);
  const creditAccounts = accounts.filter((a) => a.type === 'credit');
  const totalCreditLimit = creditAccounts.reduce((sum, a) => sum + (a.balance_limit || 0), 0);
  const totalCreditUsed = creditAccounts.reduce((sum, a) => sum + (a.balance_current || 0), 0);
  const utilizationRate = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

  const monthlySpending = filteredTransactions
    .filter((t) => t.amount > 0 && !t.pending)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalMinDue = filteredUpcomingPayments.reduce((sum, p) => sum + (p.minimum_payment || 0), 0);
  const overdueCount = filteredUpcomingPayments.filter((p) => p.isOverdue).length;
  const urgentCount = filteredUpcomingPayments.filter((p) => p.isUrgent && !p.isOverdue).length;

  const getScheduleForAccount = (accountId: number) =>
    schedules.find((s) => s.account_id === accountId) || null;

  const accountGroups = [
    {
      title: 'Credit Cards',
      category: 'credit' as const,
      accounts: accounts.filter((a) => getAccountCategory(a) === 'credit'),
      headerColor: 'text-red-600',
      badgeClass: 'bg-red-500/10 text-red-600',
    },
    {
      title: 'Line of Credit',
      category: 'line-of-credit' as const,
      accounts: accounts.filter((a) => getAccountCategory(a) === 'line-of-credit'),
      headerColor: 'text-orange-600',
      badgeClass: 'bg-orange-500/10 text-orange-600',
    },
    {
      title: 'Checking',
      category: 'checking' as const,
      accounts: accounts.filter((a) => getAccountCategory(a) === 'checking'),
      headerColor: 'text-blue-600',
      badgeClass: 'bg-blue-500/10 text-blue-600',
    },
    {
      title: 'Savings',
      category: 'savings' as const,
      accounts: accounts.filter((a) => getAccountCategory(a) === 'savings'),
      headerColor: 'text-green-600',
      badgeClass: 'bg-green-500/10 text-green-600',
    },
    {
      title: 'Other Accounts',
      category: 'other' as const,
      accounts: accounts.filter((a) => getAccountCategory(a) === 'other'),
      headerColor: 'text-zinc-500',
      badgeClass: 'bg-zinc-500/10 text-zinc-600',
    },
  ].filter((g) => g.accounts.length > 0);

  return (
    <section id="dashboard" className="relative w-full py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <p className="font-mono-data text-xs tracking-[0.15em] text-violet-600/80 uppercase mb-4">Live Dashboard</p>
          <h2 className="text-4xl md:text-5xl font-semibold text-zinc-900" style={{ letterSpacing: '-0.01em' }}>
            Your Financial <span className="text-gradient">Command Center</span>
          </h2>
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-500 text-xs font-mono-data uppercase">Period</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="glass-input text-sm px-3 py-2 cursor-pointer"
                     >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Error Banner */}
        {(error || plaidError) && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 mb-6 rounded-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-600 text-sm font-medium">{plaidError || error}</p>
                {plaidError && (plaidError.includes('OAuth') || plaidError.includes('Wealthsimple')) && (
                  <div className="mt-2 space-y-1 text-zinc-500 text-xs">
                    <p><strong className="text-zinc-700">To fix Wealthsimple / OAuth institutions:</strong></p>
                    <ol className="list-decimal list-inside space-y-0.5 ml-1">
                      <li>Go to <a href="https://dashboard.plaid.com" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">Plaid Dashboard</a> → API → OAuth</li>
                      <li>Add your app URL as a redirect URI: <code className="text-zinc-600">https://precisionfinance-ca.netlify.app/</code></li>
                      <li>Also add for local testing: <code className="text-zinc-600">http://localhost:3000</code></li>
                      <li>Save and wait ~5 minutes for Plaid to propagate</li>
                      <li>Restart your backend server</li>
                      <li>Try linking again — you'll be redirected to Wealthsimple to log in</li>
                    </ol>
                    <p className="mt-1 text-zinc-500">Note: Your MFA/2FA happens on Wealthsimple's website, not inside this app.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div className="glass-card glass-card-hover p-5">
            <div className="flex items-center gap-2 mb-3">
              <CardIcon className="w-4 h-4 text-violet-600" strokeWidth={1.5} />
              <span className="text-zinc-500 text-xs font-mono-data uppercase">Total Balance</span>
            </div>
            <p className="text-zinc-900 text-2xl font-bold">{formatCurrency(totalBalance)}</p>
            <p className="text-zinc-400 text-xs font-mono-data mt-1">across {accounts.length} accounts</p>
          </div>
          <div className="glass-card glass-card-hover p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-orange-500" strokeWidth={1.5} />
              <span className="text-zinc-500 text-xs font-mono-data uppercase">Available Credit</span>
            </div>
            <p className="text-green-600 text-2xl font-bold">{formatCurrency(totalAvailable)}</p>
            <p className="text-zinc-400 text-xs font-mono-data mt-1">{utilizationRate.toFixed(1)}% utilized</p>
          </div>
          <div className="glass-card glass-card-hover p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-yellow-600" strokeWidth={1.5} />
              <span className="text-zinc-500 text-xs font-mono-data uppercase">Min. Due Total</span>
            </div>
            <p className="text-yellow-700 text-2xl font-bold">{formatCurrency(totalMinDue)}</p>
            <p className="text-zinc-400 text-xs font-mono-data mt-1">
              {overdueCount > 0 ? (
                <span className="text-red-600">{overdueCount} overdue</span>
              ) : urgentCount > 0 ? (
                <span className="text-yellow-700">{urgentCount} due soon</span>
              ) : (
                'All current'
              )}
            </p>
          </div>
          <div className="glass-card glass-card-hover p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-violet-600" strokeWidth={1.5} />
              <span className="text-zinc-500 text-xs font-mono-data uppercase">This Month</span>
            </div>
            <p className="text-zinc-900 text-2xl font-bold">{formatCurrency(monthlySpending)}</p>
            <p className="text-zinc-400 text-xs font-mono-data mt-1">total spending</p>
          </div>
        </div>

        {/* Upcoming Payments Calendar — moved to position 2 with red left border */}
        {filteredUpcomingPayments.length > 0 && (
          <div className="mb-12 border-l-4 border-red-500 pl-4">
            <div className="flex items-center gap-2 mb-6">
              <Bell className="w-4 h-4 text-red-500" strokeWidth={1.5} />
              <h3 className="text-xl font-semibold text-zinc-900">Payment Calendar</h3>
              {overdueCount > 0 && (
                <span className="text-xs font-mono-data text-red-600 bg-red-500/10 px-2 py-0.5 rounded-full">
                  {overdueCount} action needed
                </span>
              )}
            </div>
            <div className="glass-card overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-100 text-zinc-500 text-xs font-mono-data uppercase">
                <span className="col-span-3">Account</span>
                <span className="col-span-2">Bank</span>
                <span className="col-span-2">Due Date</span>
                <span className="col-span-2">Amount</span>
                <span className="col-span-2">Status</span>
                <span className="col-span-1"></span>
              </div>
              {filteredUpcomingPayments.map((payment) => {
                const isOverdue = payment.isOverdue;
                const isUrgent = payment.isUrgent && !isOverdue;
                return (
                  <div
                    key={payment.id}
                    className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-zinc-100 items-center hover:bg-zinc-50 transition-colors ${
                      isOverdue ? 'bg-red-500/5' : isUrgent ? 'bg-yellow-500/5' : ''
                    }`}
                  >
                    <span className="col-span-3 text-zinc-900 text-sm font-medium">{payment.account_name}</span>
                    <span className="col-span-2 text-zinc-500 text-xs font-mono-data">{payment.institution_name}</span>
                    <span className="col-span-2 text-zinc-500 text-xs font-mono-data">
                      {payment.dueDate} <span className="text-zinc-400">(Day {payment.due_day})</span>
                    </span>
                    <span className="col-span-2 text-zinc-900 text-sm font-mono-data">
                      {formatCurrency(payment.minimum_payment, payment.currency_code)}
                    </span>
                    <span className="col-span-2">
                      <span
                        className={`chip font-mono-data ${
                          isOverdue
                            ? 'text-red-600 bg-red-500/10'
                            : isUrgent
                            ? 'text-yellow-700 bg-yellow-500/10'
                            : 'text-green-700 bg-green-500/10'
                        }`}
                                             >
                        {isOverdue ? 'Overdue' : isUrgent ? 'Due Soon' : daysUntilText(payment.daysUntilDue || 0)}
                      </span>
                    </span>
                    <span className="col-span-1 flex justify-end">
                      <button
                        onClick={() => {
                          const acc = accounts.find((a) => a.id === payment.account_id);
                          if (acc) setScheduleAccount(acc);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-violet-600 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Accounts by Group */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-zinc-900">Linked Accounts</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
              <button
                className="flex items-center gap-2 text-violet-600 text-sm font-medium hover:text-violet-500 transition-colors"
                onClick={openPlaidLink}
              >
                <Plus className="w-4 h-4" />
                Link New Account
              </button>
            </div>
          </div>

          {loading && <p className="text-zinc-500 text-sm mb-4">Loading accounts...</p>}

          {accounts.length === 0 && !loading && (
            <div className="glass-card p-8 text-center">
              <Building2 className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-900 text-sm font-medium mb-1">No accounts linked yet</p>
              <p className="text-zinc-500 text-xs mb-4">Connect your bank accounts to see real data</p>
              <button
                onClick={openPlaidLink}
                className="btn-primary text-xs px-4 py-2"
                             >
                Link Your First Account
              </button>
            </div>
          )}

          <div className="space-y-10">
            {accountGroups.map((group) => (
              <div key={group.category}>
                <div className="flex items-center gap-3 mb-4">
                  <h4 className={`text-lg font-semibold ${group.headerColor}`}>
                    {group.title}
                  </h4>
                  <span className={`text-xs font-mono-data px-2 py-0.5 rounded-full ${group.badgeClass}`}>
                    {group.accounts.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.accounts.map((account) => {
                    const category = group.category;
                    const isCredit = category === 'credit';
                    const isDepository = category === 'checking' || category === 'savings';
                    const schedule = getScheduleForAccount(account.id);
                    const hasSchedule = !!schedule;
                    const cardColor = getCardColor(account.type, account.subtype);
                    const utilization = isCredit && account.balance_limit
                      ? (account.balance_current / account.balance_limit) * 100
                      : 0;

                    return (
                      <div
                        key={account.id}
                        className={`glass-card glass-card-hover cursor-pointer group relative border-l-4 ${
                          isCredit ? 'p-6 bg-red-500/[0.03]' : isDepository ? (category === 'checking' ? 'p-5 bg-blue-500/[0.03]' : 'p-5 bg-green-500/[0.03]') : 'p-5'
                        }`}
                        style={{ borderLeftColor: cardColor }}
                        onClick={() => setSelectedAccount(account)}
                      >
                        {/* Unlink button */}
                        <button
                          onClick={(e) => handleDeleteAccount(account.id, e)}
                          className="absolute top-3 right-3 p-1.5 text-zinc-300 hover:text-red-500 transition-colors z-10"
                          title="Remove account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-start justify-between mb-4 pr-6">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 flex items-center justify-center text-white font-bold text-[10px]"
                              style={{ backgroundColor: cardColor, borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}
                            >
                              {getCardLogo(account.institution_name, account.type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-zinc-900 text-sm font-medium">{account.institution_name}</p>
                                {isCredit && (
                                  <span className="text-[10px] font-mono-data uppercase text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                                    Credit
                                  </span>
                                )}
                              </div>
                              <p className="text-zinc-400 text-xs font-mono-data">**** {account.mask || '0000'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {hasSchedule && schedule?.autopay_enabled && (
                              <span title="Autopay on"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /></span>
                            )}
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-zinc-500 text-xs font-mono-data uppercase mb-1">
                            {isCredit ? 'Current Balance' : 'Balance'}
                          </p>
                          <p className="text-zinc-900 text-xl font-bold">
                            {formatCurrency(account.balance_current, account.currency_code)}
                          </p>
                        </div>

                        {isCredit && account.balance_limit > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="text-zinc-500 font-mono-data">{utilization.toFixed(0)}% utilized</span>
                              <span className="text-zinc-500 font-mono-data">
                                {formatCurrency(account.balance_available, account.currency_code)} avail
                              </span>
                            </div>
                            <div className="w-full h-2 bg-zinc-100 overflow-hidden rounded-full">
                              <div
                                className="h-full transition-all rounded-full"
                                style={{
                                  width: `${Math.min(utilization, 100)}%`,
                                  background: utilization > 80 ? 'linear-gradient(90deg,#f87171,#ef4444)' : utilization > 50 ? 'linear-gradient(90deg,#fb923c,#f97316)' : 'linear-gradient(90deg,#4ade80,#22c55e)',
                                  boxShadow: utilization > 80 ? '0 0 10px rgba(239,68,68,0.35)' : 'none',
                                }}
                              />
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-zinc-500 text-xs font-mono-data">
                                Limit: {formatCurrency(account.balance_limit, account.currency_code)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Payment schedule indicator */}
                        {hasSchedule && (
                          <div className="flex items-center gap-1.5 mb-3 pt-2 border-t border-zinc-100">
                            <Calendar className="w-3 h-3 text-zinc-400" />
                            <span className="text-xs font-mono-data text-zinc-500">
                              Due day {schedule.due_day}
                            </span>
                            {schedule.autopay_enabled && (
                              <span className="text-xs font-mono-data text-green-600 ml-1">• Autopay</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                          <span className="text-xs font-mono-data text-zinc-500 capitalize">
                            {account.subtype || account.type}
                          </span>
                          <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-violet-500 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions Table — collapsible */}
        <div className="mb-12">
          {!transactionsExpanded ? (
            <button
              onClick={() => setTransactionsExpanded(true)}
              className="flex items-center gap-3 glass-card px-6 py-4 text-zinc-900 font-medium hover:border-violet-500/50 transition-colors w-full"
                         >
              <Banknote className="w-4 h-4 text-zinc-400" />
              <span>View Transactions ({filteredTransactions.length})</span>
              <ChevronDown className="w-4 h-4 text-zinc-400 ml-auto" />
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-zinc-900">Recent Transactions</h3>
                <button
                  onClick={() => setTransactionsExpanded(false)}
                  className="flex items-center gap-1 text-zinc-500 hover:text-zinc-900 text-sm font-medium transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                  Hide
                </button>
              </div>
              <div className="glass-card overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-100 text-zinc-500 text-xs font-mono-data uppercase">
                  <span className="col-span-3">Merchant</span>
                  <span className="col-span-2">Account</span>
                  <span className="col-span-2">Date</span>
                  <span className="col-span-2">Amount</span>
                  <span className="col-span-2">Status</span>
                  <span className="col-span-1"></span>
                </div>
                {filteredTransactions.length === 0 && !loading && (
                  <div className="px-6 py-8 text-center text-zinc-500 text-sm">No transactions for this period.</div>
                )}
                {filteredTransactions.slice(0, 10).map((tx) => (
                  <div
                    key={tx.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-zinc-100 items-center hover:bg-zinc-50 transition-colors"
                  >
                    <span className="col-span-3 text-zinc-900 text-sm font-medium truncate">{tx.name}</span>
                    <span className="col-span-2 text-zinc-500 text-xs font-mono-data">{tx.account_name}</span>
                    <span className="col-span-2 text-zinc-500 text-xs font-mono-data">{tx.date}</span>
                    <span className={`col-span-2 text-sm font-mono-data font-medium ${tx.amount < 0 ? 'text-green-600' : 'text-zinc-900'}`}>
                      {tx.amount < 0 ? '' : '+'}
                      {formatCurrency(Math.abs(tx.amount))}
                    </span>
                    <span className="col-span-2">
                      <span
                        className={`chip font-mono-data ${
                          tx.pending ? 'text-yellow-700 bg-yellow-500/10' : 'text-green-700 bg-green-500/10'
                        }`}
                                             >
                        {tx.pending ? 'Pending' : 'Posted'}
                      </span>
                    </span>
                    <span className="col-span-1 flex justify-end">
                      <button className="p-1.5 text-zinc-300 hover:text-violet-600 transition-colors">
                        <Banknote className="w-4 h-4" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card Detail Modal */}
      {selectedAccount && (
        <CardDetailModal
          account={selectedAccount}
          transactions={transactions}
          existingSchedule={getScheduleForAccount(selectedAccount.id)}
          onClose={() => setSelectedAccount(null)}
          onEditSchedule={(acc) => {
            setSelectedAccount(null);
            setScheduleAccount(acc);
          }}
        />
      )}

      {/* Payment Schedule Modal */}
      {scheduleAccount && (
        <PaymentScheduleModal
          account={scheduleAccount}
          existingSchedule={getScheduleForAccount(scheduleAccount.id)}
          onClose={() => setScheduleAccount(null)}
          onSave={handleSaveSchedule}
          onDelete={
            getScheduleForAccount(scheduleAccount.id)
              ? () => {
                  const s = getScheduleForAccount(scheduleAccount.id);
                  if (s) handleDeleteSchedule(s.id);
                }
              : undefined
          }
        />
      )}
    </section>
  );
}
