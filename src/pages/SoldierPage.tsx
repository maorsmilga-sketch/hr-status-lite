import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DayShiftPreview } from '../components/DayShiftPreview'
import { OperationalDutyModal } from '../components/OperationalDutyModal'
import { SoldierSearchSelect } from '../components/SoldierSearchSelect'
import { emptyAssignments, type ShiftAssignments } from '../constants/shifts'
import { STATUSES } from '../constants/statuses'
import { clampToMaxUpdateDate, eachDayInRange, maxUpdateDateISO, todayISO } from '../lib/dates'
import {
  fetchAttendanceRecord,
  fetchShiftsForDates,
  fetchSoldiers,
  updateSoldierOperationalDuty,
  upsertAttendance,
} from '../lib/db'
import { getStoredSoldierId, setStoredSoldierId } from '../lib/storage'
import type { Soldier } from '../types/database'

function StatusIcon({ id }: { id: string }) {
  if (id === 'home') {
    return (
      <svg viewBox="0 0 24 24" className="mx-auto h-5 w-5" fill="none" aria-hidden>
        <path d="M4.5 11.2 12 5l7.5 6.2V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.2H10.2V20.5H6A1.5 1.5 0 0 1 4.5 19v-7.8Z" fill="currentColor" opacity="0.95" />
      </svg>
    )
  }
  if (id === 'on_base') {
    return (
      <svg viewBox="0 0 24 24" className="mx-auto h-5 w-5" fill="none" aria-hidden>
        <path d="M5 20.5V9.2L12 4.5l7 4.7v11.3H5Z" fill="currentColor" opacity="0.95" />
        <path d="M10.2 20.5v-5.4h3.6v5.4" stroke="#fff" strokeWidth="1.6" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="mx-auto h-5 w-5" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      <path d="M12 4.8v2.4M12 16.8v2.4M4.8 12h2.4M16.8 12h2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function SoldierPage() {
  const [soldiers, setSoldiers] = useState<Soldier[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loadingSoldiers, setLoadingSoldiers] = useState(true)
  const [showRange, setShowRange] = useState(false)
  const [singleDate, setSingleDate] = useState(todayISO())
  const [rangeStart, setRangeStart] = useState(todayISO())
  const [rangeEnd, setRangeEnd] = useState(todayISO())
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [opModalOpen, setOpModalOpen] = useState(false)
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignments>(emptyAssignments)
  const [shiftsLoading, setShiftsLoading] = useState(true)
  const hydrateRef = useRef(0)
  const today = todayISO()

  const selectedSoldier = useMemo(
    () => soldiers.find((s) => s.id === selectedId),
    [soldiers, selectedId],
  )
  const maxDate = maxUpdateDateISO()

  const loadSoldiers = useCallback(async () => {
    setLoadingSoldiers(true)
    try {
      setSoldiers(await fetchSoldiers())
    } catch {
      setMessage({ type: 'err', text: 'טעינת רשימת החיילים נכשלה' })
    }
    setLoadingSoldiers(false)
  }, [])

  useEffect(() => {
    void loadSoldiers()
  }, [loadSoldiers])

  useEffect(() => {
    const stored = getStoredSoldierId()
    if (stored) setSelectedId(stored)
  }, [])

  useEffect(() => {
    if (selectedId) setStoredSoldierId(selectedId)
  }, [selectedId])

  useEffect(() => {
    if (!selectedId || showRange) return
    const token = ++hydrateRef.current
    void fetchAttendanceRecord(selectedId, singleDate).then((rec) => {
      if (token !== hydrateRef.current) return
      if (rec) {
        setStatus(rec.status)
      } else {
        setStatus(null)
      }
    })
  }, [selectedId, singleDate, showRange])

  useEffect(() => {
    let cancelled = false
    setShiftsLoading(true)
    void fetchShiftsForDates([today])
      .then((map) => {
        if (cancelled) return
        setShiftAssignments(map[today]?.assignments ?? emptyAssignments())
      })
      .catch(() => {
        if (!cancelled) setShiftAssignments(emptyAssignments())
      })
      .finally(() => {
        if (!cancelled) setShiftsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [today])

  const saveOperationalDuty = useCallback(async (start: string, end: string) => {
    if (!selectedId) return
    await updateSoldierOperationalDuty(selectedId, start, end)
    await loadSoldiers()
    setMessage({ type: 'ok', text: 'תעסוקה מבצעית עודכנה' })
  }, [selectedId, loadSoldiers])

  async function persist(nextStatus: string) {
    if (!selectedId) {
      setMessage({ type: 'err', text: 'יש לבחור שם' })
      return
    }
    const dates = showRange ? eachDayInRange(rangeStart, rangeEnd) : [singleDate]
    if (dates.length === 0) {
      setMessage({ type: 'err', text: 'טווח תאריכים לא תקין' })
      return
    }
    if (dates.some((date) => date > maxDate)) {
      setMessage({ type: 'err', text: 'ניתן לעדכן עד 4 ימים קדימה מהיום' })
      return
    }

    setSubmitting(true)
    setMessage(null)
    try {
      await upsertAttendance(selectedId, dates, nextStatus, null)
      setMessage({
        type: 'ok',
        text: dates.length === 1 ? 'נשמר' : `נשמרו ${dates.length} ימים`,
      })
    } catch {
      setMessage({ type: 'err', text: 'שמירה נכשלה' })
    } finally {
      setSubmitting(false)
    }
  }

  function pickStatus(label: string) {
    setStatus(label)
    void persist(label)
  }

  useEffect(() => {
    if (!showRange || !status) return
    const t = window.setTimeout(() => {
      void persist(status)
    }, 400)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, rangeEnd])

  function applyDate(value: string, setter: (next: string) => void) {
    setter(clampToMaxUpdateDate(value, todayISO()))
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-2">
      <section className="shrink-0 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-extrabold text-slate-800">עדכון נוכחות</p>
          <button
            type="button"
            disabled={!selectedId}
            onClick={() => setOpModalOpen(true)}
            className="text-[11px] font-bold text-[#2563eb] disabled:text-slate-300"
          >
            תעסוקה מבצעית
          </button>
        </div>

        <label className="block">
          <span className="text-[10px] font-semibold text-slate-400">שם החייל/ת</span>
          <div className="mt-0.5">
            <SoldierSearchSelect
              soldiers={soldiers}
              value={selectedId}
              onChange={setSelectedId}
              disabled={loadingSoldiers}
            />
          </div>
        </label>

        <div className="mt-2 flex items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-slate-400">תאריך</span>
            <input
              type="date"
              max={maxDate}
              value={showRange ? rangeStart : singleDate}
              onChange={(e) => {
                if (showRange) applyDate(e.target.value, setRangeStart)
                else applyDate(e.target.value, setSingleDate)
              }}
              className="mt-0.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
            />
          </label>
          {showRange && (
            <label className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-slate-400">עד</span>
              <input
                type="date"
                max={maxDate}
                value={rangeEnd}
                onChange={(e) => applyDate(e.target.value, setRangeEnd)}
                className="mt-0.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
              />
            </label>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setSingleDate((d) => clampToMaxUpdateDate(d))
              setRangeStart((d) => clampToMaxUpdateDate(d))
              setRangeEnd((d) => clampToMaxUpdateDate(d))
              setShowRange((v) => !v)
            }}
            className="text-[11px] font-bold text-[#2563eb]"
          >
            {showRange ? 'חזרה ליום בודד' : 'עדכון טווח ימים'}
          </button>
          <p className="text-[10px] text-slate-400">עד 4 ימים קדימה</p>
        </div>

        <p className="mt-2.5 mb-1.5 text-xs font-extrabold text-slate-800">סטטוס</p>
        <div className="grid grid-cols-3 gap-1.5">
          {STATUSES.map((s) => {
            const selected = status === s.label
            return (
              <button
                key={s.id}
                type="button"
                disabled={submitting}
                onClick={() => pickStatus(s.label)}
                className={`rounded-2xl px-2 py-2.5 text-center text-xs font-bold leading-snug transition ${s.color} ${
                  selected ? 'ring-2 ring-[#2563eb] ring-offset-1' : 'opacity-95'
                } disabled:opacity-60`}
              >
                <StatusIcon id={s.id} />
                <span className="mt-0.5 block">{s.label}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 min-h-[1rem] text-center text-[11px] font-bold text-slate-400">
          {submitting ? 'שומר…' : message ? (
            <span className={message.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}>
              {message.text}
            </span>
          ) : (
            'השינויים נשמרים אוטומטית'
          )}
        </p>
      </section>

      <DayShiftPreview
        date={today}
        assignments={shiftAssignments}
        loading={shiftsLoading}
        highlightName={selectedSoldier?.name}
      />

      <OperationalDutyModal
        open={opModalOpen}
        initialStart={selectedSoldier?.operational_duty_start}
        initialEnd={selectedSoldier?.operational_duty_end}
        onClose={() => setOpModalOpen(false)}
        onSave={saveOperationalDuty}
      />
    </main>
  )
}
