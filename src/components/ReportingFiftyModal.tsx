import { useEffect, useState } from 'react'
import { fetchAttendanceForSoldierInRange } from '../lib/db'
import { formatDisplayDate } from '../lib/dates'
import {
  computeReportingFifty,
  reportingPeriodFor,
  type ReportingFiftyResult,
} from '../lib/reportingFifty'
import type { Soldier } from '../types/database'

type ReportingFiftyModalProps = {
  open: boolean
  soldier: Soldier | null
  onClose: () => void
}

type CheckResult = ReportingFiftyResult & { start: string; end: string }

export function ReportingFiftyModal({ open, soldier, onClose }: ReportingFiftyModalProps) {
  const [arrival, setArrival] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckResult | null>(null)

  useEffect(() => {
    if (open) {
      setArrival('')
      setError(null)
      setResult(null)
      setChecking(false)
    }
  }, [open])

  if (!open) return null

  async function check() {
    if (!soldier) return
    if (!arrival) {
      setError('יש להזין תאריך התייצבות')
      return
    }
    const { start, end } = reportingPeriodFor(soldier)
    if (end < start) {
      setError('טווח התקופה אינו תקין')
      return
    }
    setChecking(true)
    setError(null)
    try {
      const records = await fetchAttendanceForSoldierInRange(soldier.id, arrival, end)
      setResult({ ...computeReportingFifty(records, arrival, start, end), start, end })
    } catch {
      setError('הבדיקה נכשלה. נסו שוב.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-[2px] sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reporting-fifty-title"
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <p className="text-[11px] font-bold tracking-wide text-[#2563eb]">
          {soldier ? soldier.name : ''}
        </p>
        <h2 id="reporting-fifty-title" className="mt-1 text-xl font-extrabold text-slate-900">
          בדיקת 50%
        </h2>
        {!soldier ? (
          <p className="mt-1 text-sm text-slate-500">בחרו שם בעמוד העדכון כדי לבדוק.</p>
        ) : (
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">תאריך התייצבות</span>
              <input
                type="date"
                autoFocus
                value={arrival}
                onChange={(e) => {
                  setArrival(e.target.value)
                  setResult(null)
                  setError(null)
                }}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-[#c9a44a]/40"
              />
            </label>
            <button
              type="button"
              disabled={checking}
              onClick={() => void check()}
              className="w-full rounded-2xl bg-[#2563eb] py-3.5 font-bold text-white shadow-md disabled:opacity-60"
            >
              {checking ? 'בודק…' : 'בדוק'}
            </button>
            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
            {result && (
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-bold leading-snug text-slate-500">
                      {result.onDutyCount} מתוך {result.periodDays} ימי תקופה
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">
                      {formatDisplayDate(result.start)} – {formatDisplayDate(result.end)}
                    </p>
                  </div>
                  <p
                    className={`text-2xl font-extrabold tabular-nums ${
                      result.reached ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {result.percent}%
                  </p>
                </div>
                <p
                  className={`mt-2 text-sm font-extrabold ${
                    result.reached ? 'text-emerald-600' : 'text-slate-700'
                  }`}
                >
                  {result.reached
                    ? 'הגעת ל-50% מהתקופה'
                    : `נשארו עוד ${result.neededForFifty} ימים בבסיס כדי להגיע ל-50%`}
                </p>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-2xl bg-slate-100 py-3.5 font-bold text-slate-600"
        >
          סגור
        </button>
      </div>
    </div>
  )
}
