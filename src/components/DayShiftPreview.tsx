import { rolesForPeriod, type ShiftAssignments, type ShiftPeriod } from '../constants/shifts'
import { shortDayLabel, weekdayShort } from '../lib/dates'

export function SunIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.2" fill="#f59e0b" />
      <path
        d="M12 2.8v2.4M12 18.8v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"
        stroke="#fbbf24"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MoonIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M15.4 3.6A8 8 0 1 0 20.4 14.2 6.6 6.6 0 0 1 15.4 3.6Z"
        fill="#6366f1"
        stroke="#4338ca"
        strokeWidth="0.7"
      />
      <circle cx="16.1" cy="8.1" r="0.75" fill="#c7d2fe" />
      <circle cx="17.8" cy="11.2" r="0.45" fill="#c7d2fe" />
      <circle cx="14.6" cy="12.4" r="0.35" fill="#e0e7ff" />
    </svg>
  )
}

export function ShiftPeriodIcon({ period }: { period: ShiftPeriod }) {
  return period === 'day' ? <SunIcon /> : <MoonIcon />
}

export function DayShiftPreview({
  date,
  assignments,
  loading,
  highlightName,
}: {
  date: string
  assignments: ShiftAssignments
  loading?: boolean
  highlightName?: string
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-xs font-extrabold text-slate-800">משמרות היום</p>
        <p className="text-[11px] font-bold text-slate-400">
          {weekdayShort(date)} · {shortDayLabel(date)}
        </p>
      </div>
      <div dir="rtl" className="grid min-h-0 flex-1 grid-cols-2 gap-2">
        <ShiftPreviewCard
          period="day"
          title="משמרת בוקר"
          badgeClass="bg-amber-100 text-amber-700"
          cardClass="bg-gradient-to-b from-amber-50 to-white ring-amber-100"
          assignments={assignments}
          loading={loading}
          highlightName={highlightName}
        />
        <ShiftPreviewCard
          period="night"
          title="משמרת לילה"
          badgeClass="bg-indigo-100 text-indigo-700"
          cardClass="bg-gradient-to-b from-indigo-50 to-white ring-indigo-100"
          assignments={assignments}
          loading={loading}
          highlightName={highlightName}
        />
      </div>
    </section>
  )
}

function ShiftPreviewCard({
  period,
  title,
  badgeClass,
  cardClass,
  assignments,
  loading,
  highlightName,
}: {
  period: ShiftPeriod
  title: string
  badgeClass: string
  cardClass: string
  assignments: ShiftAssignments
  loading?: boolean
  highlightName?: string
}) {
  const roles = rolesForPeriod(period)

  return (
    <article className={`flex min-h-0 flex-col overflow-hidden rounded-2xl p-2.5 shadow-sm ring-1 ${cardClass}`}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${badgeClass}`}>
          <ShiftPeriodIcon period={period} />
        </span>
        <p className="truncate text-[12px] font-extrabold leading-tight text-slate-800">{title}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-1 overflow-y-auto">
        {roles.map((role) => {
          const name = assignments[role.id]
          const mine = Boolean(highlightName && name && name === highlightName)
          return (
            <div
              key={role.id}
              className={`rounded-xl px-2 py-1 ring-1 ${
                mine ? 'bg-blue-50 ring-[#2563eb]/30' : 'bg-white/80 ring-slate-100'
              }`}
            >
              <p className="truncate text-[9px] font-bold text-slate-400">{role.label}</p>
              <p
                className={`truncate text-[11px] font-extrabold ${
                  mine ? 'text-[#2563eb]' : name ? 'text-slate-800' : 'text-slate-300'
                }`}
              >
                {loading ? '…' : name || 'לא שובץ'}
              </p>
            </div>
          )
        })}
      </div>
    </article>
  )
}
