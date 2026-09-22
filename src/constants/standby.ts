export const STANDBY_BATTALIONS = [
  {
    id: 'b221',
    label: 'גדוד 221',
    short: '221',
    header: 'bg-sky-600 text-white',
    card: 'from-sky-50 to-white ring-sky-200',
    accent: 'text-sky-700',
  },
  {
    id: 'b222',
    label: 'גדוד 222',
    short: '222',
    header: 'bg-emerald-600 text-white',
    card: 'from-emerald-50 to-white ring-emerald-200',
    accent: 'text-emerald-700',
  },
  {
    id: 'b223',
    label: 'גדוד 223',
    short: '223',
    header: 'bg-violet-600 text-white',
    card: 'from-violet-50 to-white ring-violet-200',
    accent: 'text-violet-700',
  },
  {
    id: 'b224',
    label: 'גדוד 224',
    short: '224',
    header: 'bg-amber-500 text-white',
    card: 'from-amber-50 to-white ring-amber-200',
    accent: 'text-amber-800',
  },
  {
    id: 'gadsem',
    label: 'גדס"מ',
    short: 'גדס"מ',
    header: 'bg-rose-600 text-white',
    card: 'from-rose-50 to-white ring-rose-200',
    accent: 'text-rose-700',
  },
] as const

export type BattalionId = (typeof STANDBY_BATTALIONS)[number]['id']

export type BattalionStandby = {
  mtb1: string
  mtb2: string
}

export type StandbyAssignments = Record<BattalionId, BattalionStandby>

export function emptyStandbyAssignments(): StandbyAssignments {
  return {
    b221: { mtb1: '', mtb2: '' },
    b222: { mtb1: '', mtb2: '' },
    b223: { mtb1: '', mtb2: '' },
    b224: { mtb1: '', mtb2: '' },
    gadsem: { mtb1: '', mtb2: '' },
  }
}

export function battalionMeta(id: BattalionId) {
  return STANDBY_BATTALIONS.find((b) => b.id === id)!
}
