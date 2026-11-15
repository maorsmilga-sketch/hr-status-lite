import { useEffect, useState } from 'react'
import { fetchAttendanceForSoldierInRange, fetchShiftsInRange } from '../lib/db'
import { addDays, formatDisplayDate, todayISO } from '../lib/dates'
import {
  computeReportingFifty,
  projectWithShifts,
  type ShiftProjection,
  REPORTING_PERIOD_DEFAULT_START,
  reportingPeriodFor,
  type ReportingFiftyResult,
} from '../lib/reportingFifty'
import type { Soldier } from '../types/database'

type ReportingFiftyModalProps = {
  open: boolean
  soldier: Soldier | null
  onClose: () => void
}

type CheckResult = ReportingFiftyResult & {
  start: string
  end: string
  projection: ShiftProjection | null
}

export function ReportingFiftyModal({ open, soldier, onClose }: ReportingFiftyModalProps) {
  const [arrival, setArrival] = useState('')
  // arrival stays ISO (yyyy-mm-dd) for the calculation; display is Israeli DD/MM/YYYY.
  const arrivalDisplay = arrival ? arrival.split('-').reverse().join('/') : ''
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckResult | null>(null)

  useEffect(() => {
    if (open) {
      // Auto-fill the arrival date: the soldier's operational-duty start, else the default.
      // Stays editable - the soldier can change it before checking.
      setArrival(soldier?.operational_duty_start || REPORTING_PERIOD_DEFAULT_START)
      setError(null)
      setResult(null)
      setChecking(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, soldier?.id, soldier?.operational_duty_start])

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
      const base = computeReportingFifty(records, arrival, start, end)
      let projection: ShiftProjection | null = null
      if (!base.reached) {
        try {
          const today = todayISO()
          const shifts = await fetchShiftsInRange(addDays(today, 1), end)
          projection = projectWithShifts(records, shifts, soldier.name, base, arrival, start, end, today)
        } catch {
          projection = null
        }
      }
      setResult({ ...base, start, end, projection })
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
              {/* Native picker underneath (keeps the device's calendar UI), but the
                  displayed value is always Israeli DD/MM/YYYY, on every device. */}
              <div className="relative mt-1.5">
                <div
                  aria-hidden
                  dir="ltr"
                  className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-base ${
                    arrival ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {arrivalDisplay || 'DD/MM/YYYY'}
                </div>
                <input
                  type="date"
                  aria-label="תאריך התייצבות"
                  value={arrival}
                  onChange={(e) => {
                    setArrival(e.target.value)
                    setResult(null)
                    setError(null)
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </div>
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
                {!result.reached && result.projection && (
                  <p className="mt-2 border-t border-slate-200 pt-2 text-[13px] font-bold text-slate-600">
                    {result.projection.missingAfterShifts === 0
                      ? 'לפי המשמרות שהוזנו באפליקציה, תגיע ליעד של 50% עד סוף התעסוקה.'
                      : `לפי המשמרות שהוזנו באפליקציה עד סוף התעסוקה, יישארו לך עוד ${result.projection.missingAfterShifts} ימי דיווח/משמרת כדי להגיע ל־50%.`
                    }
                  </p>
                )}
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
