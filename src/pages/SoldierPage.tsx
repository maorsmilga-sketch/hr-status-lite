import { useCallback, useEffect, useMemo, useState } from 'react'
import { OperationalDutyModal } from '../components/OperationalDutyModal'
import { SoldierSearchSelect } from '../components/SoldierSearchSelect'
import { STATUSES, STATUS_OTHER } from '../constants/statuses'
import { eachDayInRange, todayISO } from '../lib/dates'
import { fetchSoldiers, updateSoldierOperationalDuty, upsertAttendance } from '../lib/db'
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
  const [otherNotes, setOtherNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [opModalOpen, setOpModalOpen] = useState(false)

  const selectedSoldier = useMemo(
    () => soldiers.find((s) => s.id === selectedId),
    [soldiers, selectedId],
  )

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

  async function saveOperationalDuty(start: string, end: string) {
    if (!selectedId) return
    await updateSoldierOperationalDuty(selectedId, start, end)
    await loadSoldiers()
    setMessage({ type: 'ok', text: 'תעסוקה מבצעית עודכנה' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    if (!selectedId) {
      setMessage({ type: 'err', text: 'יש לבחור שם' })
      return
    }
    if (!status) {
      setMessage({ type: 'err', text: 'יש לבחור סטטוס' })
      return
    }
    if (status === STATUS_OTHER && !otherNotes.trim()) {
      setMessage({ type: 'err', text: 'יש להזין פירוט עבור "אחר"' })
      return
    }

    const dates = showRange ? eachDayInRange(rangeStart, rangeEnd) : [singleDate]
    if (dates.length === 0) {
      setMessage({ type: 'err', text: 'טווח תאריכים לא תקין' })
      return
    }

    setSubmitting(true)
    const notes = status === STATUS_OTHER ? otherNotes.trim() : null
    try {
      await upsertAttendance(selectedId, dates, status, notes)
    } catch {
      setSubmitting(false)
      setMessage({ type: 'err', text: 'שמירה נכשלה' })
      return
    }
    setSubmitting(false)
    setMessage({
      type: 'ok',
      text: dates.length === 1 ? 'הסטטוס נשמר' : `נשמרו ${dates.length} ימים`,
    })
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col px-3 py-2">
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-2">
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
        </section>

        <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="text-[10px] font-semibold text-slate-400">תאריך</span>
              <input
                type="date"
                value={showRange ? rangeStart : singleDate}
                onChange={(e) => {
                  if (showRange) setRangeStart(e.target.value)
                  else setSingleDate(e.target.value)
                }}
                className="mt-0.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm"
              />
            </label>
            {showRange && (
              <label className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold text-slate-400">עד</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="mt-0.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm"
                />
              </label>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowRange((v) => !v)}
            className="mt-1.5 text-[11px] font-bold text-[#2563eb]"
          >
            {showRange ? 'חזרה ליום בודד' : 'עדכון טווח ימים'}
          </button>
        </section>

        <section className="min-h-0 flex-1 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
          <p className="mb-1.5 text-xs font-extrabold text-slate-800">סטטוס</p>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUSES.map((s) => {
              const selected = status === s.label
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.label)}
                  className={`rounded-xl px-2 py-2 text-center text-xs font-bold leading-snug transition ${s.color} ${
                    selected ? 'ring-2 ring-[#2563eb] ring-offset-1' : 'opacity-90'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
          {status === STATUS_OTHER && (
            <input
              type="text"
              value={otherNotes}
              onChange={(e) => setOtherNotes(e.target.value)}
              placeholder="פירוט…"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          )}
        </section>

        {message && (
          <p
            className={`text-center text-xs font-bold ${
              message.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-[#2563eb] py-3 text-base font-extrabold text-white shadow-md shadow-blue-500/25 disabled:opacity-60"
        >
          {submitting ? 'שומר…' : 'שליחה'}
        </button>
      </form>

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
