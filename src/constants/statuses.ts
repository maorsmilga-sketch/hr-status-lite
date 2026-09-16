export const STATUS_OTHER = 'אחר'

export const STATUSES = [
  {
    id: 'malca_shift',
    label: 'משמרת במלכ"א',
    color: 'bg-[#4c3d8a] text-white',
    badge: 'bg-[#4c3d8a]/15 text-[#3a2d6e]',
  },
  {
    id: 'on_base',
    label: 'בבסיס',
    color: 'bg-[#2f6b4f] text-white',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'home_shmp',
    label: 'בבית בשמ"פ',
    color: 'bg-[#2b6ea3] text-white',
    badge: 'bg-sky-100 text-sky-800',
  },
  {
    id: 'training',
    label: 'אימון',
    color: 'bg-[#c27a1a] text-white',
    badge: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'home_no_shmp',
    label: 'בבית לא בשמ"פ',
    color: 'bg-[#b44545] text-white',
    badge: 'bg-rose-100 text-rose-800',
  },
  {
    id: 'other',
    label: STATUS_OTHER,
    color: 'bg-[#4a5563] text-white',
    badge: 'bg-slate-200 text-slate-700',
  },
] as const

export type StatusLabel = (typeof STATUSES)[number]['label']

export function statusBadgeClass(label: string): string {
  return STATUSES.find((s) => s.label === label)?.badge ?? 'bg-slate-100 text-slate-600'
}
