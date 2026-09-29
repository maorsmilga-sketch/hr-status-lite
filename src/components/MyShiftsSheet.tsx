import { useEffect, useMemo, useState } from 'react'
import { statusBadgeClass } from '../constants/statuses'
import { formatDisplayDate, todayISO } from '../lib/dates'
import { fetchAttendanceForSoldierInRange, getAppSettings } from '../lib/db'
import { computeOnDutyThroughToday, type OnDutyDayRow } from '../lib/onDutyAttendance'
import type { Soldier } from '../types/database'

type MyShiftsSheetProps = {
  open: boolean
  soldier: Soldier | null
  onClose: () => void
}

function dutyRange(soldier: Soldier | null, dutyStart: string, dutyEnd: string): { start: string; end: string } {
  return {
    start: soldier?.operational_duty_start || dutyStart,
    end: soldier?.operational_duty_end || dutyEnd,
  }
}

export function MyShiftsSheet({ open, soldier, onClose }: MyShiftsSheetProps) {
  const [loading, setLoading] = useState(false)
  const [onDutyDays, setOnDutyDays] = useState<OnDutyDayRow[]>([])
  const [stats, setStats] = useState({ onDutyCount: 0, elapsedDutyDays: 0, percent: 0 })
  const [error, setError] = useState<string | null>(null)

  const today = todayISO()
  const percentOk = stats.percent >= 50

  useEffect(() => {
    if (!open || !soldier) {
      setOnDutyDays([])
      setStats({ onDutyCount: 0, elapsedDutyDays: 0, percent: 0 })
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void getAppSettings()
      .then((settings) => {
        if (cancelled) return null
        const { start, end } = dutyRange(soldier, settings.dutyStart, settings.dutyEnd)
        return fetchAttendanceForSoldierInRange(soldier.id, start, end).then((records) => ({
          records,
          start,
          end,
        }))
      })
      .then((result) => {
        if (cancelled || !result) return
        const computed = computeOnDutyThroughToday(result.records, result.start, result.end, today)
        setOnDutyDays(computed.onDutyDays)
        setStats({
          onDutyCount: computed.onDutyCount,
          elapsedDutyDays: computed.elapsedDutyDays,
          percent: computed.percent,
        })
      })
      .catch(() => {
        if (!cancelled) setError('טעינת הדיווחים נכשלה')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, soldier, today])

  const listSubtitle = useMemo(
    () => 'ימים עם דיווח בבסיס / אימון / מלכ״א (עד היום, לפי הדיווח האחרון ביום)',
    [],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px]"
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div
        className="flex max-h-[80dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-extrabold text-slate-900">
            {soldier ? `נוכחות בתעסוקה — ${soldier.name}` : 'נוכחות בתעסוקה'}
          </p>
          <button type="button" onClick={onClose} className="text-sm font-bold text-slate-400">
            סגור
          </button>
        </div>

        {!soldier ? (
          <p className="px-4 pb-6 text-sm text-slate-500">בחרו שם בעמוד העדכון כדי לראות סיכום.</p>
        ) : (
          <>
            <div className="mx-4 mb-2 rounded-2xl bg-slate-50 px-4 py-3">
              {loading ? (
                <p className="text-center text-sm text-slate-400">טוען…</p>
              ) : error ? (
                <p className="text-center text-sm font-bold text-rose-600">{error}</p>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-bold leading-snug text-slate-500">
                    {stats.onDutyCount} מתוך {stats.elapsedDutyDays} ימי תעסוקה (עד היום)
                  </p>
                  <p
                    className={`text-2xl font-extrabold tabular-nums ${
                      percentOk ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {stats.percent}%
                  </p>
                </div>
              )}
            </div>
            <p className="mx-4 mb-1 text-[10px] font-bold text-slate-400">{listSubtitle}</p>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {loading ? null : onDutyDays.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-slate-400">
                  אין ימים עם דיווח רלוונטי עד היום
                </p>
              ) : (
                onDutyDays.map((day) => (
                  <article
                    key={day.date}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                  >
                    <p className="text-sm font-extrabold text-slate-900">{formatDisplayDate(day.date)}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClass(day.status)}`}
                    >
                      {day.status}
                    </span>
                  </article>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
