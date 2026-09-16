import { NavLink } from 'react-router-dom'

const tabs = [
  {
    to: '/',
    label: 'עדכון',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 7h8M8 12h8M8 17h5" strokeLinecap="round" />
        <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      </svg>
    ),
  },
  {
    to: '/shifts',
    label: 'משמרות',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4.5l3 1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/admin',
    label: 'מנהל',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 4.5 7v5c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V7L12 3Z" />
        <path d="M9.5 12.2 11.2 14l3.4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b1f33]/95 backdrop-blur-xl">
      <div className="mx-auto grid max-w-lg grid-cols-3 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                isActive
                  ? 'bg-white/10 text-[#e8d5a3]'
                  : 'text-white/55 active:bg-white/5'
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
