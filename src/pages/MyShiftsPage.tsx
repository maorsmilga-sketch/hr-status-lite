import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { eachDayInRange, formatDisplayDate, todayISO } from '../lib/dates'
import { fetchShiftsForDates, fetchSoldiers, getAppSettings } from '../lib/db'
import { selectMyShifts } from '../lib/myShifts'
import { getStoredSoldierId } from '../lib/storage'

type Schedule = {
  name: string
  end: string
  days: ReturnType<typeof selectMyShifts>
}

export function MyShiftsPage() {
  const [params] = useSearchParams()
  const soldierId = params.get('soldier') ?? getStoredSoldierId()
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    let request = 0
    async function load() {
      const token = ++request
      setLoading(true)
      setError('')
      try {
        if (!soldierId) throw new Error('יש לבחור חייל/ת בטאב עדכון כדי לראות את המשמרות.')
        const [soldiers, settings] = await Promise.all([fetchSoldiers(), getAppSettings()])
        const soldier = soldiers.find((entry) => entry.id === soldierId)
        if (!soldier) throw new Error('החייל/ת לא נמצא/ה. יש לבחור שם מחדש בטאב עדכון.')
        const start = [todayISO(), settings.dutyStart].sort().at(-1)!
        const shifts = await fetchShiftsForDates(eachDayInRange(start, settings.dutyEnd))
        if (active && token === request) {
          setSchedule({
            name: soldier.name,
            end: settings.dutyEnd,
            days: selectMyShifts(shifts, soldier.name, start, settings.dutyEnd),
          })
        }
      } catch (reason) {
        if (active && token === request) {
          setSchedule(null)
          setError(reason instanceof Error && !('code' in reason)
            ? reason.message
            : 'טעינת המשמרות נכשלה. נסו שוב.')
        }
      } finally {
        if (active && token === request) setLoading(false)
      }
    }
    void load()
    const onFocus = () => { void load() }
    window.addEventListener('focus', onFocus)
    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
    }
  }, [soldierId, revision])

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2">
      <section className="shrink-0 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-base font-extrabold text-slate-800">המשמרות שלי</h1>
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
            disabled={loading}
            className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#2563eb] disabled:opacity-40"
          >רענון</button>
        </div>
        {schedule && <p className="mt-1 text-sm font-bold">{schedule.name}</p>}
        {schedule && <p className="mt-1 text-xs text-slate-500">מהיום ועד {formatDisplayDate(schedule.end)}</p>}
        <Link to="/" className="mt-2 inline-block text-xs font-bold text-[#2563eb]">חזרה לעדכון</Link>
      </section>

      {loading ? (
        <p role="status" className="py-8 text-center text-sm text-slate-500">טוען משמרות…</p>
      ) : error ? (
        <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
      ) : schedule?.days.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">אין משמרות משובצות עבורך מהיום ועד סוף האופק.</p>
      ) : (
        <div className="flex flex-col gap-3 pb-2">
          {schedule?.days.map((day) => (
            <section key={day.date} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
              <h2 className="mb-2 text-sm font-extrabold"><time dateTime={day.date}>{formatDisplayDate(day.date)}</time></h2>
              <ul className="space-y-2">
                {day.roles.map((role) => (
                  <li key={role.id} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${role.period === 'day' ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                    <span className="font-bold">{role.label}</span>
                    <span className="text-xs text-slate-600">{role.period === 'day' ? 'משמרת יום' : 'משמרת לילה'}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
