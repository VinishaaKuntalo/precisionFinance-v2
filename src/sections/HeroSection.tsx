import {
  CreditCard,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ArrowRight,
  PlayCircle,
} from 'lucide-react';

export default function HeroSection() {
  const scrollToDashboard = () => {
    const el = document.getElementById('dashboard');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToEcosystem = () => {
    const el = document.getElementById('ecosystem');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="hero"
      className="relative w-full min-h-screen flex items-center overflow-hidden pt-28 pb-20"
    >
      {/* Soft ambient wash + faint grid, editorial rather than a dark poster */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(24,24,27,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(24,24,27,0.035) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 20%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 20%, black, transparent)',
        }}
      />
      <div
        className="absolute -top-24 -right-24 w-[32rem] h-[32rem] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.10), transparent 65%)', filter: 'blur(20px)' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-16 items-center">
          {/* ── Left: copy ────────────────────────────── */}
          <div>
            <div className="chip font-mono-data tracking-[0.15em] text-violet-700 bg-violet-500/10 uppercase mb-7 inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" strokeWidth={2} />
              Automated Financial Intelligence
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-bold text-zinc-900 tracking-tight leading-[1.03] mb-6 text-balance">
              Track. Automate.
              <br />
              <span className="text-gradient">Optimize.</span>
            </h1>

            <p className="text-lg text-zinc-600 max-w-md mb-10 leading-relaxed">
              A precise, terminal-like command center for tracking credit balances,
              automating payments, and optimizing cash flow across every account you hold.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-14">
              <button
                onClick={scrollToDashboard}
                className="btn-primary text-sm px-6 py-3 font-semibold flex items-center gap-2"
              >
                Initialize Dashboard
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </button>
              <button
                onClick={scrollToEcosystem}
                className="btn-ghost text-sm px-6 py-3 font-medium flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4" strokeWidth={1.5} />
                See how it works
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono-data">
                <ShieldCheck className="w-3.5 h-3.5 text-violet-600" strokeWidth={1.75} />
                256-bit encryption
              </div>
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono-data">
                <CreditCard className="w-3.5 h-3.5 text-violet-600" strokeWidth={1.75} />
                Plaid-powered sync
              </div>
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono-data">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                </span>
                Live balances
              </div>
            </div>
          </div>

          {/* ── Right: product preview ───────────────── */}
          <div className="relative">
            <div
              className="absolute -inset-6 rounded-[28px] opacity-70 pointer-events-none"
              style={{ background: 'radial-gradient(60% 60% at 50% 40%, rgba(124,58,237,0.10), transparent 70%)' }}
            />
            <div className="glass-modal relative p-0 overflow-hidden">
              {/* window chrome */}
              <div className="flex items-center gap-1.5 px-5 py-3.5 border-b border-zinc-100">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-3 text-zinc-400 text-[11px] font-mono-data tracking-wide">
                  precisionfinance.app/dashboard
                </span>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-zinc-500 text-xs font-mono-data uppercase mb-1.5">Total Balance</p>
                    <p className="text-zinc-900 text-3xl font-bold tracking-tight">$12,118.42</p>
                  </div>
                  <span className="chip font-mono-data text-green-700 bg-green-500/10 flex items-center gap-1">
                    <ArrowDownRight className="w-3 h-3" />
                    4.2%
                  </span>
                </div>

                {/* mini sparkline bars */}
                <div className="flex items-end gap-1.5 h-16 mb-6">
                  {[38, 52, 44, 61, 49, 58, 71, 64, 78, 69, 84, 92].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm"
                      style={{
                        height: `${h}%`,
                        background:
                          i === 11
                            ? 'linear-gradient(180deg,#a78bfa,#7c3aed)'
                            : 'rgba(124,58,237,0.14)',
                      }}
                    />
                  ))}
                </div>

                <div className="space-y-2.5">
                  {[
                    { bank: 'CIBC Aventura', mask: '4471', amount: '-$1,204.18', color: '#C41F3E' },
                    { bank: 'Scotiabank Momentum', mask: '2290', amount: '-$318.55', color: '#f97316' },
                    { bank: 'Wealthsimple Cash', mask: '9012', amount: '+$4,880.00', color: '#00D632' },
                  ].map((row) => (
                    <div
                      key={row.mask}
                      className="glass-inset flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex-shrink-0"
                          style={{ background: row.color, boxShadow: `0 4px 14px ${row.color}33` }}
                        />
                        <div>
                          <p className="text-zinc-800 text-xs font-medium">{row.bank}</p>
                          <p className="text-zinc-400 text-[11px] font-mono-data">**** {row.mask}</p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-mono-data font-medium ${
                          row.amount.startsWith('+') ? 'text-green-600' : 'text-zinc-700'
                        }`}
                      >
                        {row.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* floating badge */}
            <div className="glass-card absolute -bottom-5 -left-5 px-4 py-3 hidden md:flex items-center gap-2.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-green-600" strokeWidth={2} />
              <div>
                <p className="text-zinc-900 text-xs font-semibold leading-none mb-1">Autopay active</p>
                <p className="text-zinc-500 text-[10px] font-mono-data leading-none">3 accounts synced</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
