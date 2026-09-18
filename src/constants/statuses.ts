export const STATUSES = [
  {
    id: 'home',
    label: 'בית',
    color: 'bg-sky-500 text-white',
    badge: 'bg-sky-100 text-sky-800',
  },
  {
    id: 'on_base',
    label: 'בבסיס',
    color: 'bg-emerald-500 text-white',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'training',
    label: 'באימון',
    color: 'bg-amber-400 text-slate-900',
    badge: 'bg-amber-100 text-amber-800',
  },
] as const

export type StatusLabel = (typeof STATUSES)[number]['label']

const LEGACY_BADGES: Record<string, string> = {
  'משמרת במלכ"א': 'bg-violet-100 text-violet-800',
  'בבית בשמ"פ': 'bg-sky-100 text-sky-800',
  'בבית לא בשמ"פ': 'bg-rose-100 text-rose-800',
  אימון: 'bg-amber-100 text-amber-800',
  אחר: 'bg-slate-200 text-slate-700',
}

export function statusBadgeClass(label: string): string {
  return (
    STATUSES.find((s) => s.label === label)?.badge ??
    LEGACY_BADGES[label] ??
    'bg-slate-100 text-slate-600'
  )
}
