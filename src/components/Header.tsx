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
    <header className="sticky top-0 z-40 bg-[#0b1f33] text-white shadow-lg">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-l from-transparent via-[#c9a44a] to-transparent" />
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3.5 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Logo size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold tracking-tight">{copy.title}</p>
          <p className="truncate text-xs font-medium text-[#e8d5a3]/90">{copy.subtitle}</p>
        </div>
      </div>
    </header>
  )
}
