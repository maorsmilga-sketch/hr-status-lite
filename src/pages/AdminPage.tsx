import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { PasswordModal } from '../components/PasswordModal'
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
  updateSoldierRole,
  verifyAdminPassword,
} from '../lib/db'
import { buildDaySummaryText, openShareIntent } from '../lib/shareSummary'
import type { AttendanceRecord, Soldier } from '../types/database'

export function AdminGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(isAdminSession)
  const [gateOpen, setGateOpen] = useState(!isAdminSession())

  if (authed) return <>{children}</>

  return (
    <main className="px-4 pt-8">
      <section className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100">
        <p className="text-[11px] font-bold tracking-wide text-[#c9a44a]">גישה מוגבלת</p>
        <h1 className="mt-1 text-xl font-extrabold text-[#0b1f33]">כניסת מנהל</h1>
        <p className="mt-2 text-sm text-slate-500">נדרשת סיסמה כדי לצפות בלוח הבקרה.</p>
        <button
          type="button"
          onClick={() => setGateOpen(true)}
          className="mt-5 w-full rounded-2xl bg-[#0b1f33] py-3.5 font-bold text-white shadow-md"
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
  const [viewDate, setViewDate] = useState(todayISO())
  const [soldiers, setSoldiers] = useState<Soldier[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<SoldierRoleId>('sambaz')
  const [adding, setAdding] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [currentPw, setCurrentPw] = useState('')
  const [nextPw, setNextPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pwBusy, setPwBusy] = useState(false)
  const [dutyStart, setDutyStart] = useState('2026-09-17')
  const [dutyEnd, setDutyEnd] = useState('2026-12-15')
  const [dutyMsg, setDutyMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [dutyBusy, setDutyBusy] = useState(false)
  const [sharePhone, setSharePhone] = useState('')
  const [phoneMsg, setPhoneMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [phoneBusy, setPhoneBusy] = useState(false)

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
      /* keep previous data */
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
    } catch {
      setAdding(false)
      setFeedback('הוספה נכשלה (ייתכן שהשם כבר קיים)')
      return
    }
    setAdding(false)
    setNewName('')
    setFeedback('חייל/ת נוסף/ה לרשימה')
    await load()
  }

  async function removeSoldier(s: Soldier) {
    if (!window.confirm(`להסיר את ${s.name} מהרשימה?`)) return
    try {
      await deleteSoldier(s.id)
      setFeedback(`${s.name} הוסר/ה`)
      await load()
    } catch {
      setFeedback('ההסרה נכשלה')
    }
  }

  async function changeRole(soldierId: string, role: SoldierRoleId) {
    try {
      await updateSoldierRole(soldierId, role)
      setSoldiers((prev) => prev.map((s) => (s.id === soldierId ? { ...s, role } : s)))
    } catch {
      setFeedback('עדכון התפקיד נכשל')
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (nextPw !== confirmPw) {
      setPwMsg({ type: 'err', text: 'הסיסמאות החדשות אינן תואמות' })
      return
    }
    setPwBusy(true)
    try {
      await updateAdminPassword(currentPw, nextPw)
      setCurrentPw('')
      setNextPw('')
      setConfirmPw('')
      setPwMsg({ type: 'ok', text: 'הסיסמה עודכנה' })
    } catch (err) {
      setPwMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'עדכון הסיסמה נכשל',
      })
    } finally {
      setPwBusy(false)
    }
  }

  async function saveDutyRange(e: React.FormEvent) {
    e.preventDefault()
    setDutyMsg(null)
    setDutyBusy(true)
    try {
      await updateDutyRange(dutyStart, dutyEnd)
      setDutyMsg({ type: 'ok', text: 'תאריכי התעסוקה עודכנו — לוח המשמרות יתעדכן בהתאם' })
    } catch (err) {
      setDutyMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'עדכון התאריכים נכשל',
      })
    } finally {
      setDutyBusy(false)
    }
  }

  async function savePhone(e: React.FormEvent) {
    e.preventDefault()
    setPhoneMsg(null)
    setPhoneBusy(true)
    try {
      await updateSharePhone(sharePhone)
      setPhoneMsg({ type: 'ok', text: 'מספר השיתוף עודכן' })
    } catch {
      setPhoneMsg({ type: 'err', text: 'עדכון המספר נכשל' })
    } finally {
      setPhoneBusy(false)
    }
  }

  function handleShare() {
    const text = buildDaySummaryText(viewDate, soldiers, records)
    openShareIntent(text, sharePhone)
  }

  const recordBySoldier = new Map(records.map((r) => [r.soldier_id, r]))
  const reported = records.length

  return (
    <main className="px-4 pt-4">
      <section className="overflow-hidden rounded-3xl bg-[#0b1f33] p-5 text-white shadow-xl shadow-[#0b1f33]/25">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="יום קודם"
            onClick={() => setViewDate((d) => addDays(d, -1))}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lg active:bg-white/20"
          >
            ‹
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-extrabold">{formatDisplayDate(viewDate)}</p>
            <input
              type="date"
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value)}
              className="mt-1 rounded-lg border-0 bg-white/10 px-2 py-1 text-xs text-white"
            />
          </div>
          <button
            type="button"
            aria-label="יום הבא"
            onClick={() => setViewDate((d) => addDays(d, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lg active:bg-white/20"
          >
            ›
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/10 px-3 py-2.5">
            <p className="text-[11px] text-white/60">דיווחו</p>
            <p className="text-lg font-extrabold text-[#e8d5a3]">
              {reported}/{soldiers.length || 0}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2.5">
            <p className="text-[11px] text-white/60">חסרים</p>
            <p className="text-lg font-extrabold">{Math.max(soldiers.length - reported, 0)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleShare}
          className="mt-4 w-full rounded-2xl bg-[#c9a44a] py-3.5 text-base font-extrabold text-[#0b1f33] shadow-md active:bg-[#b8933d]"
        >
          שיתוף סיכום
        </button>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100">
        <p className="text-[11px] font-bold tracking-wide text-[#c9a44a]">תעסוקה</p>
        <h2 className="mt-1 text-base font-extrabold text-[#0b1f33]">עדכון תאריכי תעסוקה מבצעית</h2>
        <p className="mt-1 text-sm text-slate-500">לוח המשמרות יוצג רק בטווח זה.</p>
        <form onSubmit={saveDutyRange} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block min-w-0">
              <span className="text-xs font-semibold text-slate-500">מתאריך</span>
              <input
                type="date"
                value={dutyStart}
                onChange={(e) => setDutyStart(e.target.value)}
                className="mt-1 w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 text-base"
              />
            </label>
            <label className="block min-w-0">
              <span className="text-xs font-semibold text-slate-500">עד תאריך</span>
              <input
                type="date"
                value={dutyEnd}
                onChange={(e) => setDutyEnd(e.target.value)}
                className="mt-1 w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 text-base"
              />
            </label>
          </div>
          {dutyMsg && (
            <p className={`text-sm font-medium ${dutyMsg.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
              {dutyMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={dutyBusy}
            className="w-full rounded-2xl bg-[#0b1f33] py-3.5 font-bold text-white disabled:opacity-60"
          >
            {dutyBusy ? 'שומר…' : 'שמירת טווח'}
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100">
        <p className="text-[11px] font-bold tracking-wide text-[#c9a44a]">שיתוף</p>
        <h2 className="mt-1 text-base font-extrabold text-[#0b1f33]">טלפון לשיתוף סיכום</h2>
        <p className="mt-1 text-sm text-slate-500">מספר עם קידומת מדינה, לדוגמה 972546819166</p>
        <form onSubmit={savePhone} className="mt-3 space-y-2.5">
          <input
            type="tel"
            inputMode="numeric"
            value={sharePhone}
            onChange={(e) => setSharePhone(e.target.value)}
            placeholder="9725…"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none"
          />
          {phoneMsg && (
            <p className={`text-sm font-medium ${phoneMsg.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'}`}>
              {phoneMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={phoneBusy}
            className="w-full rounded-2xl bg-[#0b1f33] py-3.5 font-bold text-white disabled:opacity-60"
          >
            {phoneBusy ? 'שומר…' : 'שמירת מספר'}
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100">
        <p className="text-[11px] font-bold tracking-wide text-[#c9a44a]">כוח אדם</p>
        <h2 className="mt-1 text-base font-extrabold text-[#0b1f33]">ניהול חיילים</h2>
        <form onSubmit={addSoldier} className="mt-3 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="שם מלא"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-[#c9a44a]/40"
          />
          <div className="flex gap-2">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as SoldierRoleId)}
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3.5 text-base"
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
              className="shrink-0 rounded-2xl bg-[#0b1f33] px-4 py-3.5 font-bold text-white disabled:opacity-60"
            >
              הוסף
            </button>
          </div>
        </form>
        {feedback && <p className="mt-2 text-sm font-medium text-slate-600">{feedback}</p>}
        <div className="mt-3 space-y-2">
          {soldiers.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-[#0b1f33]">{s.name}</p>
                <select
                  value={s.role}
                  onChange={(e) => void changeRole(s.id, e.target.value as SoldierRoleId)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                >
                  {SOLDIER_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => void removeSoldier(s)}
                className="shrink-0 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
              >
                הסר
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 space-y-2.5">
        <h2 className="px-1 text-sm font-extrabold text-[#0b1f33]">נוכחות יומית</h2>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">טוען…</p>
        ) : soldiers.length === 0 ? (
          <p className="rounded-3xl bg-white p-5 text-center text-sm text-slate-500 shadow-md">
            אין חיילים ברשימה. הוסיפו חייל/ת למעלה.
          </p>
        ) : (
          soldiers.map((s) => {
            const rec = recordBySoldier.get(s.id)
            const op =
              s.operational_duty_start && s.operational_duty_end
                ? `${s.operational_duty_start} – ${s.operational_duty_end}`
                : `${dutyStart} – ${dutyEnd}`
            return (
              <article
                key={s.id}
                className="rounded-3xl bg-white p-4 shadow-md shadow-slate-900/5 ring-1 ring-slate-100"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-[#0b1f33]">{s.name}</p>
                    <p className="text-[11px] font-semibold text-slate-500">{roleLabel(s.role)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      rec ? statusBadgeClass(rec.status) : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {rec ? rec.status : 'לא דווח'}
                  </span>
                </div>
                {rec?.notes && <p className="mt-1 text-sm text-slate-600">{rec.notes}</p>}
                <p className="mt-2 text-xs text-slate-500">
                  תעסוקה מבצעית:{' '}
                  <span className="font-semibold text-slate-700">{op}</span>
                </p>
              </article>
            )
          })
        )}
      </section>

      <section className="mt-4 mb-2 rounded-3xl bg-white p-5 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100">
        <p className="text-[11px] font-bold tracking-wide text-[#c9a44a]">אבטחה</p>
        <h2 className="mt-1 text-base font-extrabold text-[#0b1f33]">שינוי סיסמת מנהל</h2>
        <form onSubmit={changePassword} className="mt-3 space-y-2.5">
          <input
            type="password"
            inputMode="numeric"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="סיסמה נוכחית"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none"
          />
          <input
            type="password"
            inputMode="numeric"
            value={nextPw}
            onChange={(e) => setNextPw(e.target.value)}
            placeholder="סיסמה חדשה"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none"
          />
          <input
            type="password"
            inputMode="numeric"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="אימות סיסמה חדשה"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none"
          />
          {pwMsg && (
            <p
              className={`text-sm font-medium ${
                pwMsg.type === 'ok' ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {pwMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={pwBusy}
            className="w-full rounded-2xl bg-[#0b1f33] py-3.5 font-bold text-white disabled:opacity-60"
          >
            {pwBusy ? 'מעדכן…' : 'עדכון סיסמה'}
          </button>
        </form>
      </section>
    </main>
  )
}
