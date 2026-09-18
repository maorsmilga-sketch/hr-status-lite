import { useEffect, useMemo, useState } from 'react'
import { emptyAssignments, slotsForName, type NamedShiftSlot } from '../constants/shifts'
import { eachDayInRange, formatDisplayDate, todayISO } from '../lib/dates'
import { fetchShiftsInRange, getAppSettings } from '../lib/db'
import type { Soldier } from '../types/database'
import { MoonIcon, SunIcon } from './DayShiftPreview'

type MyShiftsSheetProps = {
  open: boolean
  soldier: Soldier | null
  onClose: () => void
}

type AssignedDay = {
  date: string
  slots: NamedShiftSlot[]
}

function dutyRange(soldier: Soldier | null, dutyStart: string, dutyEnd: string): { start: string; end: string } {
  return {
    start: soldier?.operational_duty_start || dutyStart,
    end: soldier?.operational_duty_end || dutyEnd,
  }
}

export function MyShiftsSheet({ open, soldier, onClose }: MyShiftsSheetProps) {
  const [loading, setLoading] = useState(false)
  const [assigned, setAssigned] = useState<AssignedDay[]>([])
  const [totalDays, setTotalDays] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !soldier) {
      setAssigned([])
      setTotalDays(0)
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
        const allDates = eachDayInRange(start, end)
        return fetchShiftsInRange(start, end).then((map) => ({ map, allDates }))
      })
      .then((result) => {
        if (cancelled || !result) return
        const days: AssignedDay[] = result.allDates
          .map((date) => ({
            date,
            slots: slotsForName(result.map[date]?.assignments ?? emptyAssignments(), soldier.name),
          }))
          .filter((day) => day.slots.length > 0)
        setAssigned(days)
        setTotalDays(result.allDates.length)
      })
      .catch(() => {
        if (!cancelled) setError('טעינת המשמרות נכשלה')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, soldier])

  const today = todayISO()
  const upcoming = useMemo(() => assigned.filter((day) => day.date >= today), [assigned, today])
  const percent = totalDays > 0 ? Math.round((assigned.length / totalDays) * 100) : 0
  const percentOk = percent >= 50

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
            {soldier ? `המשמרות של ${soldier.name}` : 'המשמרות שלי'}
          </p>
          <button type="button" onClick={onClose} className="text-sm font-bold text-slate-400">
            סגור
          </button>
        </div>

        {!soldier ? (
          <p className="px-4 pb-6 text-sm text-slate-500">בחרו שם בעמוד העדכון כדי לראות משמרות.</p>
        ) : (
          <>
            <div className="mx-4 mb-2 rounded-2xl bg-slate-50 px-4 py-3">
              {loading ? (
                <p className="text-center text-sm text-slate-400">טוען…</p>
              ) : error ? (
                <p className="text-center text-sm font-bold text-rose-600">{error}</p>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-bold text-slate-500">
                    {assigned.length} מתוך {totalDays} ימי תעסוקה
                  </p>
                  <p
                    className={`text-2xl font-extrabold tabular-nums ${
                      percentOk ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {percent}%
                  </p>
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {loading ? null : upcoming.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-slate-400">אין משמרות משובצות קדימה</p>
              ) : (
                upcoming.map((day) => {
                  const hasDay = day.slots.some((s) => s.period === 'day')
                  const hasNight = day.slots.some((s) => s.period === 'night')
                  return (
                    <article key={day.date} className="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900">{formatDisplayDate(day.date)}</p>
                        <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                          {day.slots.map((s) => s.label).join(' · ')}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {hasDay && (
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-extrabold text-amber-800">
                            <SunIcon className="h-3.5 w-3.5" />
                            יום
                          </span>
                        )}
                        {hasNight && (
                          <span className="flex items-center gap-0.5 rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-extrabold text-indigo-800">
                            <MoonIcon className="h-3.5 w-3.5" />
                            לילה
                          </span>
                        )}
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
