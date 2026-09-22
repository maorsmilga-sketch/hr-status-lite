import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { PasswordModal } from '../components/PasswordModal'
import { SoldierSearchSelect } from '../components/SoldierSearchSelect'
import { SOLDIER_ROLES, roleLabel, type SoldierRoleId } from '../constants/roles'
import { statusBadgeClass } from '../constants/statuses'
import { isAdminSession, setAdminSession } from '../lib/auth'
import { addDays, formatDisplayDate, todayISO } from '../lib/dates'
import {
  deleteSoldier,
  fetchAttendanceForDate,
  fetchSoldiers,
  getAppSettings,
  insertSoldier,
  updateAdminPassword,
  updateDutyRange,
  updateSharePhone,
  updateSoldier,
  verifyAdminPassword,
} from '../lib/db'
import {
  buildAttendanceReminderText,
  buildDaySummaryText,
  openGroupShareIntent,
  openShareIntent,
} from '../lib/shareSummary'
import type { AttendanceRecord, Soldier } from '../types/database'
import { AdminStandbyPanel } from './AdminStandbyPanel'

type AdminTab = 'summary' | 'soldiers' | 'standby'

export function AdminGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(isAdminSession)
  const [gateOpen, setGateOpen] = useState(!isAdminSession())

  if (authed) return <>{children}</>

  return (
    <main className="flex min-h-0 flex-1 flex-col justify-center px-4">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="text-[11px] font-bold text-[#2563eb]">גישה מוגבלת</p>
        <h1 className="mt-1 text-lg font-extrabold text-slate-900">כניסת מנהל</h1>
        <button
          type="button"
          onClick={() => setGateOpen(true)}
          className="mt-4 w-full rounded-xl bg-[#2563eb] py-3 font-bold text-white"
        >
          הזנת סיסמה
        </button>
      </section>
      <PasswordModal
        open={gateOpen}
        title="כניסת מנהל"
        hint="הזינו את סיסמת המנהל"
        submitLabel="כניסה"
        onClose={() => setGateOpen(false)}
        onSubmit={async (password) => {
          const ok = await verifyAdminPassword(password)
          if (!ok) throw new Error('סיסמה שגויה')
          setAdminSession(true)
          setAuthed(true)
        }}
      />
    </main>
  )
}

export function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('summary')
  const [viewDate, setViewDate] = useState(todayISO())
  const [soldiers, setSoldiers] = useState<Soldier[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<SoldierRoleId>('sambaz')
  const [adding, setAdding] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<SoldierRoleId>('other')
  const [currentPw, setCurrentPw] = useState('')
  const [nextPw, setNextPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [dutyStart, setDutyStart] = useState('2026-09-17')
  const [dutyEnd, setDutyEnd] = useState('2026-12-15')
  const [dutyMsg, setDutyMsg] = useState<string | null>(null)
  const [sharePhone, setSharePhone] = useState('')
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null)
  const [filterId, setFilterId] = useState('')
  const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [soldiersList, dayRecords, settings] = await Promise.all([
        fetchSoldiers(),
        fetchAttendanceForDate(viewDate),
        getAppSettings(),
      ])
      setSoldiers(soldiersList)
      setRecords(dayRecords)
      setDutyStart(settings.dutyStart)
      setDutyEnd(settings.dutyEnd)
      setSharePhone(settings.sharePhone)
    } catch {
      /* keep */
    }
    setLoading(false)
  }, [viewDate])

  useEffect(() => {
    void load()
  }, [load])

  async function addSoldier(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    setFeedback(null)
    try {
      await insertSoldier(name, newRole)
      setNewName('')
      setFeedback('נוסף')
      await load()
    } catch {
      setFeedback('הוספה נכשלה')
    }
    setAdding(false)
  }

  async function persistDuty(start: string, end: string) {
    if (!start || !end) return
    if (end < start) {
      setDutyMsg('תאריך הסיום חייב להיות אחרי תאריך ההתחלה')
      return
    }
    try {
      await updateDutyRange(start, end)
      setDutyMsg('נשמר')
    } catch (err) {
      setDutyMsg(err instanceof Error ? err.message : 'שגיאה')
    }
  }

  function queueSharePhone(value: string) {
    setSharePhone(value)
    if (phoneTimer.current) clearTimeout(phoneTimer.current)
    phoneTimer.current = setTimeout(() => {
      void updateSharePhone(value).then(() => setPhoneMsg('נשמר'))
    }, 500)
  }

  async function saveEdit(id: string, name = editName, role = editRole) {
    const soldier = soldiers.find((item) => item.id === id)
    if (soldier && soldier.name === name.trim() && soldier.role === role) return
    try {
      await updateSoldier(id, { name, role })
      setFeedback('נשמר')
      await load()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'עדכון נכשל')
    }
  }

  async function removeSoldier(s: Soldier) {
    if (!window.confirm(`להסיר את ${s.name}?`)) return
    try {
      await deleteSoldier(s.id)
      setFeedback(`${s.name} הוסר/ה`)
      await load()
    } catch {
      setFeedback('ההסרה נכשלה')
    }
  }

  const recordBySoldier = new Map(records.map((r) => [r.soldier_id, r]))
  const reported = records.length
  const visibleSoldiers = filterId ? soldiers.filter((s) => s.id === filterId) : soldiers

  return (
    <main className="flex min-h-0 flex-1 flex-col px-3 py-2">
      <div className="mb-2 grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-100">
        <button
          type="button"
          onClick={() => setTab('summary')}
          className={`rounded-lg py-2 text-[10px] font-extrabold leading-tight ${
            tab === 'summary' ? 'bg-[#2563eb] text-white' : 'text-slate-500'
          }`}
        >
          סיכום
        </button>
        <button
          type="button"
          onClick={() => setTab('standby')}
          className={`rounded-lg py-2 text-[10px] font-extrabold leading-tight ${
            tab === 'standby' ? 'bg-[#2563eb] text-white' : 'text-slate-500'
          }`}
        >
          ניהול מטבים
        </button>
        <button
          type="button"
          onClick={() => setTab('soldiers')}
          className={`rounded-lg py-2 text-[10px] font-extrabold leading-tight ${
            tab === 'soldiers' ? 'bg-[#2563eb] text-white' : 'text-slate-500'
          }`}
        >
          חיילים
        </button>
      </div>

      {tab === 'standby' ? (
        <AdminStandbyPanel dutyStart={dutyStart} dutyEnd={dutyEnd} />
      ) : tab === 'summary' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <section className="shrink-0 rounded-2xl bg-[#2563eb] p-3 text-white shadow-md">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewDate((d) => addDays(d, -1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
              >
                ‹
              </button>
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-xs font-extrabold">{formatDisplayDate(viewDate)}</p>
                <input
                  type="date"
                  value={viewDate}
                  onChange={(e) => setViewDate(e.target.value)}
                  className="mt-0.5 rounded border-0 bg-white/15 px-1 py-0.5 text-[10px]"
                />
              </div>
              <button
                type="button"
                onClick={() => setViewDate((d) => addDays(d, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15"
              >
                ›
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
              <span className="shrink-0">
                דיווחו <b>{reported}/{soldiers.length}</b>
              </span>
              <div className="flex flex-wrap justify-end gap-1">
                <button
                  type="button"
                  onClick={() => openGroupShareIntent(buildAttendanceReminderText(viewDate))}
                  className="rounded-lg bg-white/15 px-3 py-1.5 text-[11px] font-extrabold text-white ring-1 ring-white/40"
                >
                  תזכורת לקבוצה
                </button>
                <button
                  type="button"
                  onClick={() => openShareIntent(buildDaySummaryText(viewDate, soldiers, records), sharePhone)}
                  className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-extrabold text-[#2563eb]"
                >
                  שיתוף סיכום
                </button>
              </div>
            </div>
          </section>

          <section className="shrink-0 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-100">
            <p className="text-[10px] font-bold text-[#2563eb]">עדכון תאריכי תעסוקה מבצעית</p>
            <div className="mt-1 flex items-end gap-1.5">
              <input
                type="date"
                value={dutyStart}
                onChange={(e) => {
                  const value = e.target.value
                  setDutyStart(value)
                  void persistDuty(value, dutyEnd)
                }}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-1 py-1 text-[11px]"
              />
              <input
                type="date"
                value={dutyEnd}
                onChange={(e) => {
                  const value = e.target.value
                  setDutyEnd(value)
                  void persistDuty(dutyStart, value)
                }}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-1 py-1 text-[11px]"
              />
            </div>
            {dutyMsg && <p className="mt-0.5 text-[10px] text-emerald-600">{dutyMsg}</p>}
          </section>

          <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
            {loading ? (
              <p className="py-6 text-center text-xs text-slate-400">טוען…</p>
            ) : (
              soldiers.map((s) => {
                const rec = recordBySoldier.get(s.id)
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 border-b border-slate-50 py-1.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-400">{roleLabel(s.role)}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        rec ? statusBadgeClass(rec.status) : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {rec ? rec.status : 'לא דווח'}
                    </span>
                  </div>
                )
              })
            )}
          </section>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <section className="shrink-0 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-100">
            <p className="mb-1 text-[10px] font-bold text-[#2563eb]">חיפוש / הוספה</p>
            <SoldierSearchSelect soldiers={soldiers} value={filterId} onChange={setFilterId} />
            <form onSubmit={addSoldier} className="mt-2 flex gap-1.5">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="שם חדש"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as SoldierRoleId)}
                className="rounded-lg border border-slate-200 px-1 py-1.5 text-[11px]"
              >
                {SOLDIER_ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={adding}
                className="rounded-lg bg-[#2563eb] px-2.5 text-[11px] font-bold text-white"
              >
                הוסף
              </button>
            </form>
            {feedback && <p className="mt-1 text-[10px] text-slate-500">{feedback}</p>}
          </section>

          <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
            {visibleSoldiers.map((s) => (
              <div key={s.id} className="border-b border-slate-50 py-1.5">
                {editingId === s.id ? (
                  <div className="flex flex-col gap-1">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => void saveEdit(s.id, editName, editRole)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    />
                    <select
                      value={editRole}
                      onChange={(e) => {
                        const role = e.target.value as SoldierRoleId
                        setEditRole(role)
                        void saveEdit(s.id, editName, role)
                      }}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    >
                      {SOLDIER_ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="self-start rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold"
                    >
                      סגור
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{s.name}</p>
                      <p className="text-[10px] text-slate-400">{roleLabel(s.role)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(s.id)
                        setEditName(s.name)
                        setEditRole(s.role)
                      }}
                      className="text-[10px] font-bold text-[#2563eb]"
                    >
                      עריכה
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeSoldier(s)}
                      className="text-[10px] font-bold text-rose-500"
                    >
                      הסר
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>

          <section className="shrink-0 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-slate-100">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-bold text-slate-500">טלפון לשיתוף</p>
                <input
                  value={sharePhone}
                  onChange={(e) => queueSharePhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-1 py-1 text-[11px]"
                />
                {phoneMsg && <p className="text-[10px] text-emerald-600">{phoneMsg}</p>}
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  setPwMsg(null)
                  if (nextPw !== confirmPw) {
                    setPwMsg({ type: 'err', text: 'לא תואם' })
                    return
                  }
                  try {
                    await updateAdminPassword(currentPw, nextPw)
                    setCurrentPw('')
                    setNextPw('')
                    setConfirmPw('')
                    setPwMsg({ type: 'ok', text: 'עודכן' })
                  } catch (err) {
                    setPwMsg({ type: 'err', text: err instanceof Error ? err.message : 'שגיאה' })
                  }
                }}
              >
                <p className="text-[10px] font-bold text-slate-500">סיסמת מנהל</p>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="נוכחית"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-1 py-1 text-[11px]"
                />
                <input
                  type="password"
                  value={nextPw}
                  onChange={(e) => setNextPw(e.target.value)}
                  placeholder="חדשה"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-1 py-1 text-[11px]"
                />
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="אימות"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-1 py-1 text-[11px]"
                />
                <button type="submit" className="mt-1 w-full rounded-lg bg-slate-100 py-1 text-[10px] font-bold">
                  עדכון
                </button>
                {pwMsg && (
                  <p className={`text-[10px] ${pwMsg.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {pwMsg.text}
                  </p>
                )}
              </form>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
