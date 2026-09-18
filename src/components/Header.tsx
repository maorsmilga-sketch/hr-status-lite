import { useLocation } from 'react-router-dom'
import { Logo } from './Logo'

const PAGE_COPY: Record<string, string> = {
  '/': 'עדכון נוכחות',
  '/shifts': 'לוח משמרות',
  '/admin': 'לוח בקרה',
  '/my-shifts': 'המשמרות שלי',
}

export function Header() {
  const { pathname } = useLocation()
  const subtitle = PAGE_COPY[pathname] ?? PAGE_COPY['/']

  return (
    <header className="shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="flex items-center gap-2 px-2.5 py-1 pb-1 pt-[max(0.25rem,env(safe-area-inset-top))] sm:px-3 sm:py-1.5">
        <Logo size="sm" />
        <div className="min-w-0 flex-1 text-center leading-none">
          <h1 className="text-[clamp(0.8125rem,3.4vw,1.125rem)] font-black tracking-tight text-slate-900">
            חטיבת כרמלי
            <span className="font-extrabold text-slate-800"> · רפואה</span>
          </h1>
          <p className="mt-0.5 text-[clamp(0.6875rem,2.9vw,0.9375rem)] font-bold text-[#2563eb]">{subtitle}</p>
        </div>
        <div className="shrink-0" aria-hidden>
          <Logo size="sm" />
        </div>
      </div>
    </header>
  )
}
