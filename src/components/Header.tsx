import { useLocation } from 'react-router-dom'
import { Logo } from './Logo'

const PAGE_COPY: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'כרמלי', subtitle: 'עדכון נוכחות' },
  '/shifts': { title: 'כרמלי', subtitle: 'לוח משמרות' },
  '/admin': { title: 'כרמלי', subtitle: 'לוח בקרה' },
}

export function Header() {
  const { pathname } = useLocation()
  const copy = PAGE_COPY[pathname] ?? PAGE_COPY['/']

  return (
    <header className="shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="flex items-center gap-2.5 px-3 py-2 pt-[max(0.4rem,env(safe-area-inset-top))]">
        <Logo size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold tracking-tight text-slate-900">{copy.title}</p>
          <p className="truncate text-[11px] font-medium text-[#2563eb]">{copy.subtitle}</p>
        </div>
      </div>
    </header>
  )
}
