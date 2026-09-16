export const STATUS_OTHER = 'אחר'

export const STATUSES = [
  {
    id: 'malca_shift',
    label: 'משמרת במלכ"א',
    color: 'bg-violet-500 text-white',
    badge: 'bg-violet-100 text-violet-800',
  },
  {
    id: 'on_base',
    label: 'בבסיס',
    color: 'bg-emerald-500 text-white',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'home_shmp',
    label: 'בבית בשמ"פ',
    color: 'bg-sky-500 text-white',
    badge: 'bg-sky-100 text-sky-800',
  },
  {
    id: 'training',
    label: 'אימון',
    color: 'bg-amber-400 text-slate-900',
    badge: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'home_no_shmp',
    label: 'בבית לא בשמ"פ',
    color: 'bg-rose-500 text-white',
    badge: 'bg-rose-100 text-rose-800',
  },
  {
    id: 'other',
    label: STATUS_OTHER,
    color: 'bg-slate-400 text-white',
    badge: 'bg-slate-200 text-slate-700',
  },
] as const

export type StatusLabel = (typeof STATUSES)[number]['label']

export function statusBadgeClass(label: string): string {
  return STATUSES.find((s) => s.label === label)?.badge ?? 'bg-slate-100 text-slate-600'
}
