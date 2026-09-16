import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PasswordModal } from '../components/PasswordModal'
import { roleLabel } from '../constants/roles'
import {
  emptyAssignments,
  SHIFT_ROLES,
  soldiersForShiftSlot,
  type ShiftAssignments,
  type ShiftRoleId,
} from '../constants/shifts'
import { isAdminSession, setAdminSession } from '../lib/auth'
import {
  addWeeks,
  canMoveWeek,
  formatWeekRange,
  initialWeekStart,
  shortDayLabel,
  todayISO,
  visibleWeekDays,
  weekdayName,
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

  function setRole(date: string, roleId: ShiftRoleId, value: string) {
    setDays((prev) => ({
      ...prev,
      [date]: { ...(prev[date] ?? emptyAssignments()), [roleId]: value },
    }))
  }

  async function saveAll() {
    setSaving(true)
    setMessage(null)
    try {
      await saveShiftWeek(dates.map((date) => ({ date, assignments: days[date] ?? emptyAssignments() })))
      setMessage('המשמרות נשמרו')
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

  const morningRoles = SHIFT_ROLES.filter((r) => r.period === 'morning')
  const nightRoles = SHIFT_ROLES.filter((r) => r.period === 'night')

  return (
    <main className="px-4 pt-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <section className="rounded-3xl bg-white p-4 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="שבוע קודם"
            disabled={!canPrev}
            onClick={() => moveWeek(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b1f33] text-lg text-white shadow-md disabled:opacity-30"
          >
            ‹
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[11px] font-bold tracking-wide text-[#c9a44a]">שבוע בטווח התעסוקה</p>
            <p className="truncate text-sm font-extrabold text-[#0b1f33]">
              {formatWeekRange(weekStart)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {dutyStart.split('-').reverse().join('.')} – {dutyEnd.split('-').reverse().join('.')}
            </p>
          </div>
          <button
            type="button"
            aria-label="שבוע הבא"
            disabled={!canNext}
            onClick={() => moveWeek(1)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b1f33] text-lg text-white shadow-md disabled:opacity-30"
          >
            ›
          </button>
        </div>
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
          className={`mt-3 w-full rounded-2xl py-3 text-sm font-extrabold shadow-md ${
            editing ? 'bg-slate-100 text-slate-700' : 'bg-[#0b1f33] text-white'
          }`}
        >
          {editing ? 'יציאה מעריכה' : 'עריכת משמרות'}
        </button>
      </section>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-500">טוען לוח משמרות…</p>
      ) : dates.length === 0 ? (
        <p className="mt-4 rounded-3xl bg-white p-5 text-center text-sm text-slate-500 shadow-md">
          אין ימים בטווח התעסוקה המבצעית. עדכנו תאריכים במסך המנהל.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {dates.map((date) => {
            const assignments = days[date] ?? emptyAssignments()
            const isToday = date === today
            return (
              <article
                key={date}
                className={`overflow-hidden rounded-3xl bg-white shadow-lg shadow-slate-900/5 ring-1 ${
                  isToday ? 'ring-[#c9a44a]' : 'ring-slate-100'
                }`}
              >
                <div className="flex items-center justify-between bg-[#0b1f33] px-4 py-3 text-white">
                  <div>
                    <p className="text-sm font-extrabold">{weekdayName(date)}</p>
                    <p className="text-xs text-white/70">{shortDayLabel(date)}</p>
                  </div>
                  {isToday && (
                    <span className="rounded-full bg-[#c9a44a] px-2.5 py-1 text-[11px] font-extrabold text-[#0b1f33]">
                      היום
                    </span>
                  )}
                </div>

                <div className="space-y-3 p-3">
                  <ShiftGroup
                    title="משמרת בוקר"
                    accent="from-amber-50 to-white"
                    roles={morningRoles}
                    assignments={assignments}
                    soldiers={soldiers}
                    editing={editing}
                    date={date}
                    onChange={setRole}
                  />
                  <ShiftGroup
                    title="משמרת לילה"
                    accent="from-indigo-50 to-white"
                    roles={nightRoles}
                    assignments={assignments}
                    soldiers={soldiers}
                    editing={editing}
                    date={date}
                    onChange={setRole}
                  />
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editing && dates.length > 0 && (
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={saving}
          className="mt-4 w-full rounded-3xl bg-[#c9a44a] py-4 text-lg font-extrabold text-[#0b1f33] shadow-xl disabled:opacity-60"
        >
          {saving ? 'שומר…' : 'שמירת שבוע'}
        </button>
      )}

      {message && (
        <p className="mt-3 text-center text-sm font-bold text-[#0b1f33]">{message}</p>
      )}

      <PasswordModal
        open={pwOpen}
        title="עריכת משמרות"
        hint="נדרשת סיסמת מנהל כדי לערוך את הלוח"
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

function ShiftGroup({
  title,
  accent,
  roles,
  assignments,
  soldiers,
  editing,
  date,
  onChange,
}: {
  title: string
  accent: string
  roles: Array<(typeof SHIFT_ROLES)[number]>
  assignments: ShiftAssignments
  soldiers: Soldier[]
  editing: boolean
  date: string
  onChange: (date: string, roleId: ShiftRoleId, value: string) => void
}) {
  return (
    <div className={`rounded-2xl bg-gradient-to-b ${accent} p-3 ring-1 ring-slate-100`}>
      <p className="mb-2 text-[11px] font-extrabold tracking-wide text-slate-500">{title}</p>
      <div className="space-y-2">
        {roles.map((role) => {
          const value = assignments[role.id]
          const options = soldiersForShiftSlot(soldiers, role.id)
          return (
            <div
              key={role.id}
              className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 shadow-sm"
            >
              <span className="w-[7.2rem] shrink-0 text-xs font-bold text-[#0b1f33]">
                {role.label}
              </span>
              {editing ? (
                <select
                  value={value}
                  onChange={(e) => onChange(date, role.id, e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm"
                >
                  <option value="">— לא שובץ —</option>
                  {options.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({roleLabel(s.role)})
                    </option>
                  ))}
                  {value && !options.some((s) => s.name === value) && (
                    <option value={value}>{value}</option>
                  )}
                </select>
              ) : (
                <span
                  className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                    value ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {value || 'לא שובץ'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
