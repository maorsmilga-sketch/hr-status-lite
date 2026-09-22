import { NavLink } from 'react-router-dom'

const tabs = [
  {
    to: '/',
    label: 'עדכון',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 7h8M8 12h8M8 17h5" strokeLinecap="round" />
        <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      </svg>
    ),
  },
  {
    to: '/shifts',
    label: 'משמרות',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4.5l3 1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/standby',
    label: 'כוננות',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 5 6v6c0 3.5 2.8 6.4 7 7.5 4.2-1.1 7-4 7-7.5V6l-7-3Z" />
        <path d="M12 9v4" strokeLinecap="round" />
        <circle cx="12" cy="16" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    to: '/admin',
    label: 'מנהל',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 4.5 7v5c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V7L12 3Z" />
        <path d="M9.5 12.2 11.2 14l3.4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export function BottomNav() {
  return (
    <nav className="shrink-0 border-t border-slate-200 bg-white pb-[max(0.3rem,env(safe-area-inset-bottom))] pt-1">
      <div className="grid grid-cols-4 px-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-bold transition ${
                isActive ? 'bg-blue-50 text-[#2563eb]' : 'text-slate-400 active:bg-slate-50'
              }`
            }
          >
            {tab.icon}
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
