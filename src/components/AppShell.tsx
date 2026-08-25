import type { ReactNode } from 'react';

export interface NavItem {
  key: string;
  label: string;
  icon: string; // single emoji/character glyph, keeps this dependency-free
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', icon: '⌂' },
  { key: 'survey', label: 'Survey', icon: '📐' },
  { key: 'design', label: 'Design', icon: '🧮' },
  { key: 'hydraulics', label: 'Hydraulics', icon: '🔧' },
  { key: 'materials', label: 'Materials', icon: '📦' },
  { key: 'commissioning', label: 'Commissioning', icon: '✅' },
  { key: 'reports', label: 'Reports', icon: '📄' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
  { key: 'help', label: 'Help', icon: '❓' },
];

/** Primary tabs shown on the mobile bottom bar; the rest live under "More". */
const MOBILE_PRIMARY_KEYS = ['home', 'survey', 'design', 'hydraulics', 'materials'];

export function AppShell({
  active,
  onNavigate,
  jobName,
  children,
}: {
  active: string;
  onNavigate: (key: string) => void;
  jobName?: string;
  children: ReactNode;
}) {
  const primary = NAV_ITEMS.filter((i) => MOBILE_PRIMARY_KEYS.includes(i.key));
  const overflow = NAV_ITEMS.filter((i) => !MOBILE_PRIMARY_KEYS.includes(i.key));
  const overflowActive = overflow.some((i) => i.key === active);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      {/* Desktop / tablet sidebar */}
      <aside className="no-print hidden shrink-0 border-r border-slate-200 bg-white md:flex md:w-56 md:flex-col xl:w-64">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
          <span className="text-xl" aria-hidden>♨</span>
          <span className="text-base font-semibold text-slate-900">YourHeatPump</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium ${
                active === item.key ? 'bg-sky-50 text-sky-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        {jobName && (
          <div className="border-t border-slate-200 p-3 text-xs text-slate-500">
            Current job: <span className="font-medium text-slate-700">{jobName}</span>
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <header className="no-print flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>♨</span>
          <span className="text-base font-semibold text-slate-900">YourHeatPump</span>
        </div>
        {jobName && <span className="max-w-[45%] truncate text-xs text-slate-500">{jobName}</span>}
      </header>

      <main className="flex-1 overflow-x-hidden px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-6 xl:px-8 xl:py-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white md:hidden">
        {primary.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              active === item.key ? 'text-sky-700' : 'text-slate-500'
            }`}
          >
            <span aria-hidden className="text-base leading-none">{item.icon}</span>
            {item.label}
          </button>
        ))}
        <button
          onClick={() => onNavigate('more')}
          className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            overflowActive || active === 'more' ? 'text-sky-700' : 'text-slate-500'
          }`}
        >
          <span aria-hidden className="text-base leading-none">⋯</span>
          More
        </button>
      </nav>

      {active === 'more' && (
        <div className="no-print fixed inset-0 z-50 flex items-end bg-slate-900/40 md:hidden" onClick={() => onNavigate('home')}>
          <div className="w-full rounded-t-lg bg-white p-3" onClick={(e) => e.stopPropagation()}>
            {overflow.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
