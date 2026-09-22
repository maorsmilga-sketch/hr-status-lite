import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StandbyDayBoardReadonly } from '../components/StandbyDayBoard'
import { emptyStandbyAssignments, type StandbyAssignments } from '../constants/standby'
import {
  canMoveWindow,
  formatWindowRange,
  initialWindowStart,
  moveWindow,
  todayISO,
  visibleWindowDays,
  weekdayShort,
} from '../lib/dates'
import { fetchStandbyForDates, getAppSettings } from '../lib/db'

export function StandbyPage() {
  const [dutyStart, setDutyStart] = useState('2026-09-17')
  const [dutyEnd, setDutyEnd] = useState('2026-12-15')
  const [viewStart, setViewStart] = useState(() => initialWindowStart('2026-09-17', '2026-12-15'))
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [assignments, setAssignments] = useState<StandbyAssignments>(emptyStandbyAssignments())
  const [loading, setLoading] = useState(true)
  const touchX = useRef<number | null>(null)

  const dates = useMemo(
    () => visibleWindowDays(viewStart, dutyStart, dutyEnd),
    [viewStart, dutyStart, dutyEnd],
  )
  const today = todayISO()
  const canPrev = canMoveWindow(viewStart, -1, dutyStart, dutyEnd)
  const canNext = canMoveWindow(viewStart, 1, dutyStart, dutyEnd)
  const activeDate = dates.includes(selectedDate) ? selectedDate : (dates[0] ?? today)

  const loadMeta = useCallback(async () => {
    const settings = await getAppSettings()
    setDutyStart(settings.dutyStart)
    setDutyEnd(settings.dutyEnd)
    setViewStart(initialWindowStart(settings.dutyStart, settings.dutyEnd))
  }, [])

  const loadDay = useCallback(async () => {
    setLoading(true)
    try {
      const map = await fetchStandbyForDates([activeDate])
      setAssignments(map[activeDate]?.assignments ?? emptyStandbyAssignments())
    } catch {
      setAssignments(emptyStandbyAssignments())
    }
    setLoading(false)
  }, [activeDate])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
    void loadDay()
  }, [loadDay])

  useEffect(() => {
    if (dates.length > 0 && !dates.includes(selectedDate)) {
      setSelectedDate(dates[0])
    }
  }, [dates, selectedDate])

  function move(delta: number) {
    setViewStart((start) => moveWindow(start, delta, dutyStart, dutyEnd))
  }

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.changedTouches[0]?.clientX ?? null
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 70) return
    move(dx > 0 ? -1 : 1)
  }

  return (
    <main
      className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-2"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <section className="shrink-0 rounded-2xl bg-white/80 p-2.5 shadow-sm ring-1 ring-white/70 backdrop-blur">
        <div dir="ltr" className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => move(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg disabled:opacity-30"
            aria-label="ימים קודמים"
          >
            ‹
          </button>
          <p dir="rtl" className="min-w-0 flex-1 truncate text-center text-[11px] font-extrabold text-slate-800">
            {formatWindowRange(viewStart, dutyStart, dutyEnd)}
          </p>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => move(1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg disabled:opacity-30"
            aria-label="ימים הבאים"
          >
            ›
          </button>
        </div>
        <div dir="rtl" className="mt-2 flex gap-1">
          {dates.map((date) => {
            const isToday = date === today
            const isActive = date === activeDate
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`min-w-0 flex-1 rounded-xl px-0.5 py-1.5 text-center ${
                  isActive
                    ? 'bg-[#2563eb] text-white shadow-md'
                    : isToday
                      ? 'bg-blue-50 text-[#2563eb] ring-1 ring-[#2563eb]'
                      : 'bg-white/70 text-slate-600'
                }`}
              >
                <p className="truncate text-[8px] font-bold leading-none">{isToday ? 'היום' : weekdayShort(date)}</p>
                <p className="mt-1 text-[13px] font-extrabold leading-none tabular-nums">
                  {Number(date.slice(-2))}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-400">טוען…</p>
      ) : (
        <StandbyDayBoardReadonly assignments={assignments} />
      )}
    </main>
  )
}
