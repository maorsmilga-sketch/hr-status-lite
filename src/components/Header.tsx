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
      <div className="flex flex-col items-center px-3 py-3 pt-[max(0.7rem,env(safe-area-inset-top))]">
        <Logo size="md" />
        <h1 className="mt-1.5 text-center text-xl font-black leading-tight tracking-tight text-slate-900">
          חטיבת כרמלי
          <span className="mt-0.5 block text-[1.05rem] font-extrabold">רפואה</span>
        </h1>
        <p className="mt-1.5 text-base font-bold tracking-wide text-[#2563eb]">{subtitle}</p>
      </div>
    </header>
  )
}
