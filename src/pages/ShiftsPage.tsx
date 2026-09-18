import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PasswordModal } from '../components/PasswordModal'
import { ShiftPeriodIcon } from '../components/DayShiftPreview'
import { MyShiftsSheet } from '../components/MyShiftsSheet'
import { ShiftPickerSheet } from '../components/ShiftPickerSheet'
import {
  emptyAssignments,
  rolesForPeriod,
  type ShiftAssignments,
  type ShiftPeriod,
  type ShiftRoleId,
} from '../constants/shifts'
import { isAdminSession, setAdminSession } from '../lib/auth'
import {
  canMoveWindow,
  formatWindowRange,
  initialWindowStart,
  moveWindow,
  todayISO,
  visibleWindowDays,
  weekdayShort,
} from '../lib/dates'
import {
  fetchShiftsForDates,
  fetchSoldiers,
  getAppSettings,
  saveShiftDay,
  verifyAdminPassword,
} from '../lib/db'
import { getStoredSoldierId } from '../lib/storage'
import type { Soldier } from '../types/database'

export function ShiftsPage() {
  const [dutyStart, setDutyStart] = useState('2026-09-17')
  const [dutyEnd, setDutyEnd] = useState('2026-12-15')
  const [viewStart, setViewStart] = useState(() => initialWindowStart('2026-09-17', '2026-12-15'))
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [days, setDays] = useState<Record<string, ShiftAssignments>>({})
  const [soldiers, setSoldiers] = useState<Soldier[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [picking, setPicking] = useState<{ id: ShiftRoleId; label: string } | null>(null)
  const [myShiftsOpen, setMyShiftsOpen] = useState(false)
  const touchX = useRef<number | null>(null)

  const dates = useMemo(
    () => visibleWindowDays(viewStart, dutyStart, dutyEnd),
    [viewStart, dutyStart, dutyEnd],
  )
  const today = todayISO()
  const canPrev = canMoveWindow(viewStart, -1, dutyStart, dutyEnd)
  const canNext = canMoveWindow(viewStart, 1, dutyStart, dutyEnd)
  const activeDate = dates.includes(selectedDate) ? selectedDate : (dates[0] ?? today)
  const assignments = days[activeDate] ?? emptyAssignments()
  const storedSoldier = soldiers.find((s) => s.id === getStoredSoldierId()) ?? null

  const loadMeta = useCallback(async () => {
    const settings = await getAppSettings()
    setDutyStart(settings.dutyStart)
    setDutyEnd(settings.dutyEnd)
    setViewStart(initialWindowStart(settings.dutyStart, settings.dutyEnd))
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

  useEffect(() => {
    if (dates.length > 0 && !dates.includes(selectedDate)) {
      setSelectedDate(dates[0])
    }
  }, [dates, selectedDate])

  function move(delta: number) {
    setViewStart((start) => moveWindow(start, delta, dutyStart, dutyEnd))
  }

  async function assignRole(roleId: ShiftRoleId, value: string) {
    const date = activeDate
    const next = { ...(days[date] ?? emptyAssignments()), [roleId]: value }
    setDays((prev) => ({ ...prev, [date]: next }))
    setPicking(null)
    try {
      await saveShiftDay(date, next)
      setMessage('נשמר')
    } catch {
      setMessage('שמירה נכשלה')
    }
  }

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.changedTouches[0]?.clientX ?? null
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (picking || myShiftsOpen || touchX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 70) return
    move(dx > 0 ? -1 : 1)
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col px-3 py-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
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
            className={`rounded-xl px-3 py-2 text-[11px] font-extrabold ${
              editing ? 'bg-slate-100 text-slate-600' : 'bg-[#2563eb] text-white'
            }`}
          >
            {editing ? 'יציאה' : 'עריכה'}
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
        <button
          type="button"
          onClick={() => setMyShiftsOpen(true)}
          className="mt-2 w-full rounded-xl bg-blue-50 px-3 py-2 text-[12px] font-extrabold text-[#2563eb]"
        >
          {storedSoldier ? `המשמרות של ${storedSoldier.name}` : 'המשמרות שלי'}
        </button>
      </section>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">טוען…</p>
      ) : dates.length === 0 ? (
        <p className="mt-3 text-center text-sm text-slate-400">אין ימים בטווח התעסוקה.</p>
      ) : (
        <div className="mt-2 grid min-h-0 flex-1 grid-rows-2 gap-2">
          <GlassShiftCard
            title="משמרת בוקר"
            period="day"
            tint="from-amber-100/70 to-white/40"
            assignments={assignments}
            editing={editing}
            onPick={(id, label) => setPicking({ id, label })}
          />
          <GlassShiftCard
            title="משמרת לילה"
            period="night"
            tint="from-indigo-100/80 to-white/40"
            assignments={assignments}
            editing={editing}
            onPick={(id, label) => setPicking({ id, label })}
          />
        </div>
      )}

      {editing && (
        <p className="mt-2 text-center text-[11px] font-bold text-slate-400">השינויים נשמרים אוטומטית</p>
      )}
      {message && <p className="mt-1 text-center text-[11px] font-bold text-[#2563eb]">{message}</p>}

      <MyShiftsSheet
        open={myShiftsOpen}
        soldier={storedSoldier}
        onClose={() => setMyShiftsOpen(false)}
      />

      <ShiftPickerSheet
        open={!!picking}
        title={picking?.label ?? ''}
        shiftRoleId={picking?.id ?? 'karpach_a'}
        soldiers={soldiers}
        value={picking ? assignments[picking.id] : ''}
        onClose={() => setPicking(null)}
        onSelect={(name) => {
          if (picking) void assignRole(picking.id, name)
        }}
      />

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

function GlassShiftCard({
  title,
  period,
  tint,
  assignments,
  editing,
  onPick,
}: {
  title: string
  period: ShiftPeriod
  tint: string
  assignments: ShiftAssignments
  editing: boolean
  onPick: (id: ShiftRoleId, label: string) => void
}) {
  const roles = rolesForPeriod(period)
  return (
    <section
      className={`min-h-0 overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br ${tint} p-3 shadow-lg ring-1 ring-white/50 backdrop-blur-xl`}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <ShiftPeriodIcon period={period} />
        <p className="text-[11px] font-extrabold tracking-wide text-slate-600">{title}</p>
      </div>
      <div className="flex h-[calc(100%-1.25rem)] flex-col justify-between gap-1">
        {roles.map((role) => {
          const name = assignments[role.id]
          return (
            <button
              key={role.id}
              type="button"
              disabled={!editing}
              onClick={() => onPick(role.id, role.label)}
              className="flex min-h-0 flex-1 items-center justify-between gap-2 rounded-2xl bg-white/50 px-3 py-1 text-right shadow-sm ring-1 ring-white/70 disabled:cursor-default"
            >
              <span className="shrink-0 text-[11px] font-extrabold text-slate-600">{role.label}</span>
              <span
                className={`min-w-0 truncate text-xs font-bold ${
                  name ? 'text-slate-900' : 'text-slate-300'
                }`}
              >
                {name || (editing ? 'הקש לשיבוץ' : 'לא שובץ')}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
