import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authApi, getApiUrl, setApiUrl } from '@/services/api';
import { Mail, ArrowLeft, Lock, CheckCircle, Server, X } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

function ApiServerModal({ onClose }: { onClose: () => void }) {
  const [apiUrl, setApiUrlState] = useState(getApiUrl());

  const handleSave = () => {
    setApiUrl(apiUrl.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(24,24,27,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div className="glass-modal w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-zinc-900 font-semibold text-sm flex items-center gap-2">
            <Server className="w-4 h-4 text-violet-600" /> API Server
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-zinc-400 hover:text-zinc-900">
            <X className="w-4 h-4" />
          </button>
        </div>
        <label htmlFor="api-url" className="text-zinc-500 text-xs font-mono-data uppercase mb-1.5 block">
          Backend URL
        </label>
        <input
          id="api-url"
          type="url"
          value={apiUrl}
          onChange={(e) => setApiUrlState(e.target.value)}
          placeholder="https://your-backend.example.com"
          className="w-full glass-input text-sm px-3 py-2 mb-2"
        />
        <p className="text-zinc-500 text-xs mb-4">
          Where this app's API lives (e.g. your Railway/Render URL). Saved on this device.
        </p>
        <button onClick={handleSave} className="w-full btn-primary text-sm py-2.5">
          Save &amp; Reload
        </button>
      </div>
    </div>
  );
}

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiModalOpen, setApiModalOpen] = useState(false);

  // Check for reset token in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token) {
      setResetToken(token);
      setMode('reset');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email });
      setSuccess(res.message);
      if (res.resetUrl) {
        // Email not configured (dev only) - show the link
        setSuccess(`${res.message} Use this link: ${res.resetUrl}`);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await authApi.resetPassword({ token: resetToken, password });
      setSuccess(res.message);
      setTimeout(() => {
        setMode('login');
        setSuccess('');
        setPassword('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired token');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setPassword('');
  };

  const inputClass = 'w-full glass-input text-sm px-3 py-2.5';
  const labelClass = 'text-zinc-500 text-xs font-mono-data uppercase mb-1.5 block';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      {/* Ambient glow accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.10), transparent 65%)', filter: 'blur(40px)' }}
        />
        <div
          className="absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent 65%)', filter: 'blur(48px)' }}
        />
      </div>

      <div className="relative w-full max-w-sm glass-modal p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{
                background: '#7c3aed',
                boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
              }}
            >
              <span className="text-white font-bold text-[10px]">PF</span>
            </div>
            <span className="text-foreground font-semibold text-sm tracking-tight">Precision Finance</span>
          </div>
          <button
            onClick={() => setApiModalOpen(true)}
            className="text-zinc-400 hover:text-violet-600 transition-colors p-1.5"
            title="API server settings"
            aria-label="API server settings"
          >
            <Server className="w-4 h-4" />
          </button>
        </div>

        {/* ─── LOGIN ─── */}
        {mode === 'login' && (
          <>
            <h2 className="text-zinc-900 text-2xl font-semibold mb-1">
              Welcome <span className="text-gradient">back</span>
            </h2>
            <p className="text-zinc-500 text-xs mb-6">Sign in to your account</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className={labelClass}>Email</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="login-password" className={labelClass}>Password</label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                  minLength={6}
                />
              </div>

              {error && <p role="alert" className="text-red-600 text-xs">{error}</p>}

              <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50 text-sm py-2.5">
                {loading ? 'Please wait...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => switchMode('forgot')}
                className="text-zinc-500 text-xs hover:text-violet-600 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => switchMode('register')}
                className="text-zinc-500 text-xs hover:text-zinc-900 transition-colors"
              >
                Don't have an account? <span className="text-violet-600">Create one</span>
              </button>
            </div>
          </>
        )}

        {/* ─── REGISTER ─── */}
        {mode === 'register' && (
          <>
            <h2 className="text-zinc-900 text-2xl font-semibold mb-1">
              Create <span className="text-gradient">account</span>
            </h2>
            <p className="text-zinc-500 text-xs mb-6">Get started with your personal dashboard</p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="reg-name" className={labelClass}>Name</label>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="reg-email" className={labelClass}>Email</label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="reg-password" className={labelClass}>Password</label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                  minLength={6}
                />
                <p className="text-zinc-400 text-[11px] mt-1">At least 6 characters</p>
              </div>

              {error && <p role="alert" className="text-red-600 text-xs">{error}</p>}

              <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50 text-sm py-2.5">
                {loading ? 'Please wait...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => switchMode('login')}
                className="text-zinc-500 text-xs hover:text-zinc-900 transition-colors"
              >
                Already have an account? <span className="text-violet-600">Sign in</span>
              </button>
            </div>
          </>
        )}

        {/* ─── FORGOT PASSWORD ─── */}
        {mode === 'forgot' && (
          <>
            <button
              onClick={() => switchMode('login')}
              className="text-zinc-500 text-xs hover:text-zinc-900 transition-colors flex items-center gap-1 mb-4"
            >
              <ArrowLeft className="w-3 h-3" /> Back to login
            </button>

            <h2 className="text-zinc-900 text-2xl font-semibold mb-1">
              Reset <span className="text-gradient">password</span>
            </h2>
            <p className="text-zinc-500 text-xs mb-6">Enter your email to receive a reset link</p>

            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className={labelClass}>Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full glass-input text-sm pl-9 pr-3 py-2.5"
                    required
                  />
                </div>
              </div>

              {error && <p role="alert" className="text-red-600 text-xs">{error}</p>}
              {success && (
                <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl">
                  <p className="text-green-700 text-xs flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="break-all">{success}</span>
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!success}
                className="w-full btn-primary disabled:opacity-50 text-sm py-2.5"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}

        {/* ─── RESET PASSWORD ─── */}
        {mode === 'reset' && (
          <>
            <button
              onClick={() => switchMode('login')}
              className="text-zinc-500 text-xs hover:text-zinc-900 transition-colors flex items-center gap-1 mb-4"
            >
              <ArrowLeft className="w-3 h-3" /> Back to login
            </button>

            <h2 className="text-zinc-900 text-2xl font-semibold mb-1">
              New <span className="text-gradient">password</span>
            </h2>
            <p className="text-zinc-500 text-xs mb-6">Enter your new password below</p>

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label htmlFor="reset-token" className={labelClass}>Reset Token</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="reset-token"
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full glass-input text-sm pl-9 pr-3 py-2.5"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="reset-password" className={labelClass}>New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full glass-input text-sm pl-9 pr-3 py-2.5"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && <p role="alert" className="text-red-600 text-xs">{error}</p>}
              {success && (
                <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl">
                  <p className="text-green-700 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {success}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!success}
                className="w-full btn-primary disabled:opacity-50 text-sm py-2.5"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>

      {apiModalOpen && <ApiServerModal onClose={() => setApiModalOpen(false)} />}
    </div>
  );
}
