import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PasswordModal } from '../components/PasswordModal'
import { ShiftAssignSelect } from '../components/ShiftAssignSelect'
import { emptyAssignments, SHIFT_ROLES, type ShiftAssignments, type ShiftRoleId } from '../constants/shifts'
import { isAdminSession, setAdminSession } from '../lib/auth'
import {
  addWeeks,
  canMoveWeek,
  formatWeekRange,
  initialWeekStart,
  shortDayLabel,
  todayISO,
  visibleWeekDays,
  weekdayShort,
} from '../lib/dates'
import {
  fetchShiftsForDates,
  fetchSoldiers,
  getAppSettings,
  saveShiftWeek,
  verifyAdminPassword,
} from '../lib/db'
import type { Soldier } from '../types/database'

export function ShiftsPage() {
  const [dutyStart, setDutyStart] = useState('2026-09-17')
  const [dutyEnd, setDutyEnd] = useState('2026-12-15')
  const [weekStart, setWeekStart] = useState(() => initialWeekStart('2026-09-17', '2026-12-15'))
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [days, setDays] = useState<Record<string, ShiftAssignments>>({})
  const [soldiers, setSoldiers] = useState<Soldier[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const touchX = useRef<number | null>(null)

  const dates = useMemo(
    () => visibleWeekDays(weekStart, dutyStart, dutyEnd),
    [weekStart, dutyStart, dutyEnd],
  )
  const today = todayISO()
  const canPrev = canMoveWeek(weekStart, -1, dutyStart, dutyEnd)
  const canNext = canMoveWeek(weekStart, 1, dutyStart, dutyEnd)
  const activeDate = dates.includes(selectedDate) ? selectedDate : (dates[0] ?? today)
  const assignments = days[activeDate] ?? emptyAssignments()

  const loadMeta = useCallback(async () => {
    const settings = await getAppSettings()
    setDutyStart(settings.dutyStart)
    setDutyEnd(settings.dutyEnd)
    setWeekStart((current) => {
      const visible = visibleWeekDays(current, settings.dutyStart, settings.dutyEnd)
      if (visible.length > 0) return current
      return initialWeekStart(settings.dutyStart, settings.dutyEnd)
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [shiftMap, soldierList] = await Promise.all([
        fetchShiftsForDates(dates),
        fetchSoldiers(),
      ])
      const next: Record<string, ShiftAssignments> = {}
      for (const date of dates) {
        next[date] = shiftMap[date]?.assignments ?? emptyAssignments()
      }
      setDays(next)
      setSoldiers(soldierList)
    } catch {
      setMessage('טעינת המשמרות נכשלה')
    }
    setLoading(false)
  }, [dates])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
    void load()
  }, [load])

  function moveWeek(delta: number) {
    if (!canMoveWeek(weekStart, delta, dutyStart, dutyEnd)) return
    setWeekStart((w) => addWeeks(w, delta))
  }

  function setRole(roleId: ShiftRoleId, value: string) {
    setDays((prev) => ({
      ...prev,
      [activeDate]: { ...(prev[activeDate] ?? emptyAssignments()), [roleId]: value },
    }))
  }

  async function saveAll() {
    setSaving(true)
    setMessage(null)
    try {
      await saveShiftWeek(dates.map((date) => ({ date, assignments: days[date] ?? emptyAssignments() })))
      setMessage('נשמר')
      setEditing(false)
    } catch {
      setMessage('שמירה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.changedTouches[0]?.clientX ?? null
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 60) return
    moveWeek(dx > 0 ? -1 : 1)
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col px-3 py-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <section className="shrink-0 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => moveWeek(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-lg disabled:opacity-30"
          >
            ‹
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[11px] font-extrabold text-slate-800">{formatWeekRange(weekStart)}</p>
          </div>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => moveWeek(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-lg disabled:opacity-30"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => {
              if (editing) {
                setEditing(false)
                void load()
                return
              }
              if (isAdminSession()) {
                setEditing(true)
                return
              }
              setPwOpen(true)
            }}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold ${
              editing ? 'bg-slate-100 text-slate-600' : 'bg-[#2563eb] text-white'
            }`}
          >
            {editing ? 'יציאה' : 'עריכה'}
          </button>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {dates.map((date) => {
            const isToday = date === today
            const isActive = date === activeDate
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`rounded-xl px-0.5 py-1.5 text-center ${
                  isActive
                    ? 'bg-[#2563eb] text-white shadow-md'
                    : isToday
                      ? 'bg-blue-50 text-[#2563eb] ring-1 ring-[#2563eb]'
                      : 'bg-slate-50 text-slate-600'
                }`}
              >
                <p className="text-[9px] font-bold">{weekdayShort(date)}</p>
                <p className="text-[11px] font-extrabold">{shortDayLabel(date).split('.')[0]}</p>
              </button>
            )
          })}
        </div>
      </section>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">טוען…</p>
      ) : dates.length === 0 ? (
        <p className="mt-3 text-center text-sm text-slate-400">אין ימים בטווח התעסוקה.</p>
      ) : (
        <section className="mt-2 min-h-0 flex-1 overflow-hidden rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
          <div className="flex h-full flex-col gap-1">
            {SHIFT_ROLES.map((role) => (
              <div key={role.id} className="flex min-h-0 items-center gap-2 rounded-xl bg-slate-50 px-2">
                <span className="w-[5.6rem] shrink-0 text-[11px] font-extrabold text-slate-700">
                  {role.label}
                </span>
                {editing ? (
                  <ShiftAssignSelect
                    soldiers={soldiers}
                    shiftRoleId={role.id}
                    value={assignments[role.id]}
                    onChange={(name) => setRole(role.id, name)}
                  />
                ) : (
                  <span
                    className={`min-w-0 flex-1 truncate text-xs font-semibold ${
                      assignments[role.id] ? 'text-slate-800' : 'text-slate-300'
                    }`}
                  >
                    {assignments[role.id] || 'לא שובץ'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {editing && (
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={saving}
          className="mt-2 w-full shrink-0 rounded-2xl bg-[#2563eb] py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {saving ? 'שומר…' : 'שמירת שבוע'}
        </button>
      )}
      {message && <p className="mt-1 text-center text-[11px] font-bold text-[#2563eb]">{message}</p>}

      <PasswordModal
        open={pwOpen}
        title="עריכת משמרות"
        hint="נדרשת סיסמת מנהל"
        submitLabel="כניסה לעריכה"
        onClose={() => setPwOpen(false)}
        onSubmit={async (password) => {
          const ok = await verifyAdminPassword(password)
          if (!ok) throw new Error('סיסמה שגויה')
          setAdminSession(true)
          setEditing(true)
          setPwOpen(false)
        }}
      />
    </main>
  )
}
