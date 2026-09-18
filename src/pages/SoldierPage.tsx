import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { OperationalDutyModal } from '../components/OperationalDutyModal'
import { SoldierSearchSelect } from '../components/SoldierSearchSelect'
import { STATUSES } from '../constants/statuses'
import { clampToMaxUpdateDate, eachDayInRange, maxUpdateDateISO, todayISO } from '../lib/dates'
import {
  fetchAttendanceRecord,
  fetchSoldiers,
  updateSoldierOperationalDuty,
  upsertAttendance,
} from '../lib/db'
import { getStoredSoldierId, setStoredSoldierId } from '../lib/storage'
import type { Soldier } from '../types/database'

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
  const hydrateRef = useRef(0)

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
    <main className="flex min-h-0 flex-1 flex-col px-3 py-2">
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold text-slate-800">שם החייל/ת</p>
            <button
              type="button"
              disabled={!selectedId}
              onClick={() => setOpModalOpen(true)}
              className="text-[11px] font-bold text-[#2563eb] disabled:text-slate-300"
            >
              עדכון תעסוקה מבצעית
            </button>
          </div>
          <SoldierSearchSelect
            soldiers={soldiers}
            value={selectedId}
            onChange={setSelectedId}
            disabled={loadingSoldiers}
          />
          {selectedSoldier && (
            <Link
              to={`/my-shifts?soldier=${encodeURIComponent(selectedSoldier.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex rounded-lg bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-[#2563eb]"
              aria-label="המשמרות שלי (נפתח בלשונית חדשה)"
            >
              המשמרות שלי
            </Link>
          )}
        </section>

        <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-2">
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
                className="mt-0.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm"
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
                  className="mt-0.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm"
                />
              </label>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSingleDate((d) => clampToMaxUpdateDate(d))
              setRangeStart((d) => clampToMaxUpdateDate(d))
              setRangeEnd((d) => clampToMaxUpdateDate(d))
              setShowRange((v) => !v)
            }}
            className="mt-1.5 text-[11px] font-bold text-[#2563eb]"
          >
            {showRange ? 'חזרה ליום בודד' : 'עדכון טווח ימים'}
          </button>
          <p className="mt-1 text-[10px] text-slate-400">ניתן לעדכן עד 4 ימים קדימה מהיום</p>
        </section>

        <section className="min-h-0 flex-1 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <p className="mb-1.5 text-xs font-extrabold text-slate-800">סטטוס</p>
          <div className="grid grid-cols-3 gap-1.5">
            {STATUSES.map((s) => {
              const selected = status === s.label
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => pickStatus(s.label)}
                  className={`rounded-xl px-2 py-3 text-center text-xs font-bold leading-snug transition ${s.color} ${
                    selected ? 'ring-2 ring-[#2563eb] ring-offset-1' : 'opacity-90'
                  } disabled:opacity-60`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </section>

        <p className="text-center text-[11px] font-bold text-slate-400">
          {submitting ? 'שומר…' : 'השינויים נשמרים אוטומטית'}
        </p>
        {message && (
          <p
            className={`text-center text-xs font-bold ${
              message.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

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
