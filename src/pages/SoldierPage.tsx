import { useCallback, useEffect, useMemo, useState } from 'react'
import { OperationalDutyModal } from '../components/OperationalDutyModal'
import { roleLabel } from '../constants/roles'
import { STATUSES, STATUS_OTHER } from '../constants/statuses'
import { eachDayInRange, todayISO } from '../lib/dates'
import {
  fetchSoldiers,
  updateSoldierOperationalDuty,
  upsertAttendance,
} from '../lib/db'
import {
  getStoredSoldierId,
  hasOpDutyPromptBeenShown,
  markOpDutyPromptShown,
  setStoredSoldierId,
} from '../lib/storage'
import type { Soldier } from '../types/database'

type DateMode = 'single' | 'range'

export function SoldierPage() {
  const [soldiers, setSoldiers] = useState<Soldier[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loadingSoldiers, setLoadingSoldiers] = useState(true)
  const [dateMode, setDateMode] = useState<DateMode>('single')
  const [singleDate, setSingleDate] = useState(todayISO())
  const [rangeStart, setRangeStart] = useState(todayISO())
  const [rangeEnd, setRangeEnd] = useState(todayISO())
  const [status, setStatus] = useState<string | null>(null)
  const [otherNotes, setOtherNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [opModalOpen, setOpModalOpen] = useState(false)
  const [opModalForced, setOpModalForced] = useState(false)

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
    if (!selectedId || loadingSoldiers) return
    setStoredSoldierId(selectedId)
    if (!hasOpDutyPromptBeenShown(selectedId)) {
      setOpModalForced(true)
      setOpModalOpen(true)
    }
  }, [selectedId, selectedSoldier, loadingSoldiers])

  async function saveOperationalDuty(start: string, end: string) {
    if (!selectedId) return
    await updateSoldierOperationalDuty(selectedId, start, end)
    markOpDutyPromptShown(selectedId)
    await loadSoldiers()
    setMessage({ type: 'ok', text: 'תעסוקה מבצעית עודכנה' })
  }

  function closeOpModal() {
    setOpModalOpen(false)
    if (opModalForced && selectedId) {
      markOpDutyPromptShown(selectedId)
      setOpModalForced(false)
    }
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

    const dates =
      dateMode === 'single' ? [singleDate] : eachDayInRange(rangeStart, rangeEnd)

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
      text: dates.length === 1 ? 'הסטטוס נשמר בהצלחה' : `נשמרו ${dates.length} ימים`,
    })
  }

  const dayCount = dateMode === 'single' ? 1 : eachDayInRange(rangeStart, rangeEnd).length

  return (
    <main className="px-4 pt-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100">
          <p className="text-[11px] font-bold tracking-wide text-[#c9a44a]">זיהוי</p>
          <label className="mt-1 block">
            <span className="text-base font-extrabold text-[#0b1f33]">שם החייל/ת</span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={loadingSoldiers}
              className="mt-2 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-[#c9a44a]/40"
            >
              <option value="">— בחרו שם —</option>
              {soldiers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({roleLabel(s.role)})
                </option>
              ))}
            </select>
          </label>
          {selectedId && (
            <button
              type="button"
              onClick={() => setOpModalOpen(true)}
              className="mt-3 inline-flex items-center rounded-full bg-[#0b1f33]/5 px-3 py-1.5 text-xs font-bold text-[#0b1f33] active:bg-[#0b1f33]/10"
            >
              עדכון תעסוקה מבצעית
            </button>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100">
          <p className="text-[11px] font-bold tracking-wide text-[#c9a44a]">תקופה</p>
          <p className="mt-1 text-base font-extrabold text-[#0b1f33]">תאריכים לעדכון</p>
          <div className="mt-3 flex gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setDateMode('single')}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                dateMode === 'single' ? 'bg-white text-[#0b1f33] shadow-md' : 'text-slate-500'
              }`}
            >
              יום בודד
            </button>
            <button
              type="button"
              onClick={() => setDateMode('range')}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                dateMode === 'range' ? 'bg-white text-[#0b1f33] shadow-md' : 'text-slate-500'
              }`}
            >
              טווח ימים
            </button>
          </div>
          {dateMode === 'single' ? (
            <label className="mt-3 block">
              <span className="text-xs font-semibold text-slate-500">תאריך</span>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-[#c9a44a]/40"
              />
            </label>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-slate-500">מתאריך</span>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="mt-1 w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3.5 text-base outline-none"
                />
              </label>
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-slate-500">עד תאריך</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="mt-1 w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3.5 text-base outline-none"
                />
              </label>
            </div>
          )}
          {dateMode === 'range' && dayCount > 0 && (
            <p className="mt-2 text-xs font-medium text-slate-500">{dayCount} ימים נבחרו</p>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100">
          <p className="text-[11px] font-bold tracking-wide text-[#c9a44a]">דיווח</p>
          <p className="mt-1 text-base font-extrabold text-[#0b1f33]">סטטוס</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {STATUSES.map((s) => {
              const selected = status === s.label
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.label)}
                  className={`rounded-2xl px-2 py-3.5 text-center text-sm font-bold leading-snug shadow-md transition active:scale-[0.97] ${s.color} ${
                    selected ? 'ring-2 ring-[#c9a44a] ring-offset-2' : 'opacity-90'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
          {status === STATUS_OTHER && (
            <label className="mt-3 block">
              <span className="text-sm font-semibold text-slate-700">פירוט</span>
              <input
                type="text"
                value={otherNotes}
                onChange={(e) => setOtherNotes(e.target.value)}
                placeholder="הזינו הערה…"
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-[#c9a44a]/40"
              />
            </label>
          )}
        </section>

        {message && (
          <p
            className={`text-center text-sm font-bold ${
              message.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-3xl bg-[#0b1f33] py-4 text-lg font-extrabold text-white shadow-xl shadow-[#0b1f33]/25 active:scale-[0.99] disabled:opacity-60"
        >
          {submitting ? 'שומר…' : 'שליחה'}
        </button>
      </form>

      <OperationalDutyModal
        open={opModalOpen}
        initialStart={selectedSoldier?.operational_duty_start}
        initialEnd={selectedSoldier?.operational_duty_end}
        onClose={closeOpModal}
        onSave={saveOperationalDuty}
      />
    </main>
  )
}
