import { STANDBY_BATTALIONS, type StandbyAssignments } from '../constants/standby'
import { MtbNamePicker } from './MtbNamePicker'

function MtbReadLine({ label, name }: { label: string; name: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-white/75 px-2 py-1 ring-1 ring-white/90">
      <p className="text-[8px] font-bold text-slate-400">{label}</p>
      <p className={`truncate text-[11px] font-extrabold ${name ? 'text-slate-900' : 'text-slate-300'}`}>
        {name || '—'}
      </p>
    </div>
  )
}

export function StandbyDayBoardReadonly({ assignments }: { assignments: StandbyAssignments }) {
  return (
    <div className="grid min-h-0 flex-1 grid-rows-5 gap-1.5">
      {STANDBY_BATTALIONS.map((b) => {
        const slot = assignments[b.id]
        return (
          <article
            key={b.id}
            className={`grid min-h-0 grid-cols-[auto_1fr_1fr] items-stretch gap-1.5 rounded-2xl bg-gradient-to-l ${b.card} p-1.5 ring-1`}
          >
            <div
              className={`flex w-[3.25rem] shrink-0 flex-col items-center justify-center rounded-xl px-1 py-1 text-center ${b.header}`}
            >
              <p className="text-[9px] font-extrabold leading-tight">{b.short}</p>
            </div>
            <MtbReadLine label='מט"ב 1' name={slot.mtb1} />
            <MtbReadLine label='מט"ב 2' name={slot.mtb2} />
          </article>
        )
      })}
    </div>
  )
}

export function StandbyDayBoardEditor({
  assignments,
  presets,
  onChange,
  saving,
}: {
  assignments: StandbyAssignments
  presets: string[]
  onChange: (next: StandbyAssignments) => void
  saving?: boolean
}) {
  return (
    <div className="grid min-h-0 flex-1 grid-rows-5 gap-1.5">
      {STANDBY_BATTALIONS.map((b) => {
        const slot = assignments[b.id]
        return (
          <article
            key={b.id}
            className={`grid min-h-0 grid-cols-[auto_1fr_1fr] items-stretch gap-1.5 rounded-2xl bg-gradient-to-l ${b.card} p-1.5 ring-1`}
          >
            <div
              className={`flex w-[3.25rem] shrink-0 flex-col items-center justify-center rounded-xl px-1 py-1 text-center ${b.header}`}
            >
              <p className="text-[9px] font-extrabold leading-tight">{b.short}</p>
            </div>
            <MtbNamePicker
              label='מט"ב 1'
              value={slot.mtb1}
              presets={presets}
              disabled={saving}
              onChange={(mtb1) => onChange({ ...assignments, [b.id]: { ...slot, mtb1 } })}
            />
            <MtbNamePicker
              label='מט"ב 2'
              value={slot.mtb2}
              presets={presets}
              disabled={saving}
              onChange={(mtb2) => onChange({ ...assignments, [b.id]: { ...slot, mtb2 } })}
            />
          </article>
        )
      })}
    </div>
  )
}
