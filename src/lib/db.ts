import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { isSoldierRole, type SoldierRoleId } from '../constants/roles'
import { emptyAssignments, type ShiftAssignments } from '../constants/shifts'
import type { AppSettings, AttendanceRecord, ShiftDay, Soldier } from '../types/database'
import { eachDayInRange } from './dates'
import { db } from './firebase'

const DEFAULT_ADMIN_PASSWORD = '112233'
const DEFAULT_DUTY_START = '2026-09-17'
const DEFAULT_DUTY_END = '2026-12-15'
const SETTINGS_REF = () => doc(db, 'settings', 'app')

function attendanceDocId(soldierId: string, recordDate: string): string {
  return `${soldierId}_${recordDate}`
}

function mapSoldier(id: string, data: Record<string, unknown>): Soldier {
  const roleRaw = String(data.role ?? 'other')
  return {
    id,
    name: String(data.name ?? ''),
    role: isSoldierRole(roleRaw) ? roleRaw : 'other',
    operational_duty_start: (data.operational_duty_start as string | null) ?? null,
    operational_duty_end: (data.operational_duty_end as string | null) ?? null,
    created_at: String(data.created_at ?? ''),
  }
}

function mapAttendance(id: string, data: Record<string, unknown>): AttendanceRecord {
  return {
    id,
    soldier_id: String(data.soldier_id ?? ''),
    record_date: String(data.record_date ?? ''),
    status: String(data.status ?? ''),
    notes: (data.notes as string | null) ?? null,
    created_at: String(data.created_at ?? ''),
    updated_at: String(data.updated_at ?? ''),
  }
}

function defaultsFromEnvPhone(): string {
  return String(import.meta.env.VITE_SHARE_PHONE ?? '').replace(/\D/g, '')
}

function mapSettings(data: Record<string, unknown> | undefined): AppSettings {
  return {
    adminPassword: String(data?.adminPassword ?? DEFAULT_ADMIN_PASSWORD) || DEFAULT_ADMIN_PASSWORD,
    dutyStart: String(data?.dutyStart ?? DEFAULT_DUTY_START) || DEFAULT_DUTY_START,
    dutyEnd: String(data?.dutyEnd ?? DEFAULT_DUTY_END) || DEFAULT_DUTY_END,
    sharePhone: String(data?.sharePhone ?? defaultsFromEnvPhone()),
  }
}

export async function fetchSoldiers(): Promise<Soldier[]> {
  const q = query(collection(db, 'soldiers'), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapSoldier(d.id, d.data()))
}

export async function updateSoldierOperationalDuty(
  soldierId: string,
  start: string,
  end: string,
): Promise<void> {
  await updateDoc(doc(db, 'soldiers', soldierId), {
    operational_duty_start: start,
    operational_duty_end: end,
  })
}

export async function insertSoldier(name: string, role: SoldierRoleId = 'other'): Promise<void> {
  const dup = await getDocs(query(collection(db, 'soldiers'), where('name', '==', name)))
  if (!dup.empty) {
    throw new Error('duplicate')
  }
  const now = new Date().toISOString()
  await addDoc(collection(db, 'soldiers'), {
    name,
    role,
    operational_duty_start: null,
    operational_duty_end: null,
    created_at: now,
  })
}

export async function updateSoldierRole(soldierId: string, role: SoldierRoleId): Promise<void> {
  await updateDoc(doc(db, 'soldiers', soldierId), { role })
}

export async function updateSoldier(
  soldierId: string,
  fields: { name: string; role: SoldierRoleId },
): Promise<void> {
  const name = fields.name.trim()
  if (!name) throw new Error('יש להזין שם')
  const dup = await getDocs(query(collection(db, 'soldiers'), where('name', '==', name)))
  if (dup.docs.some((d) => d.id !== soldierId)) {
    throw new Error('השם כבר קיים')
  }
  await updateDoc(doc(db, 'soldiers', soldierId), { name, role: fields.role })
}

export async function deleteSoldier(soldierId: string): Promise<void> {
  const attendance = await getDocs(
    query(collection(db, 'attendance_records'), where('soldier_id', '==', soldierId)),
  )
  const batch = writeBatch(db)
  attendance.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'soldiers', soldierId))
  await batch.commit()
}

export async function upsertAttendance(
  soldierId: string,
  dates: string[],
  status: string,
  notes: string | null,
): Promise<void> {
  const batch = writeBatch(db)
  const now = new Date().toISOString()

  for (const recordDate of dates) {
    const id = attendanceDocId(soldierId, recordDate)
    const ref = doc(db, 'attendance_records', id)
    batch.set(
      ref,
      {
        soldier_id: soldierId,
        record_date: recordDate,
        status,
        notes,
        updated_at: now,
      },
      { merge: true },
    )
  }

  await batch.commit()
}

export async function fetchAttendanceRecord(
  soldierId: string,
  recordDate: string,
): Promise<AttendanceRecord | null> {
  const snap = await getDoc(doc(db, 'attendance_records', attendanceDocId(soldierId, recordDate)))
  if (!snap.exists()) return null
  return mapAttendance(snap.id, snap.data())
}

export async function fetchAttendanceForDate(recordDate: string): Promise<AttendanceRecord[]> {
  const q = query(
    collection(db, 'attendance_records'),
    where('record_date', '==', recordDate),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapAttendance(d.id, d.data()))
}

export async function getAppSettings(): Promise<AppSettings> {
  const ref = SETTINGS_REF()
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    const seeded = mapSettings(undefined)
    await setDoc(ref, { ...seeded, updated_at: new Date().toISOString() })
    return seeded
  }
  const mapped = mapSettings(snap.data())
  const data = snap.data()
  if (data.dutyStart == null || data.dutyEnd == null) {
    await setDoc(
      ref,
      { dutyStart: mapped.dutyStart, dutyEnd: mapped.dutyEnd, updated_at: new Date().toISOString() },
      { merge: true },
    )
  }
  return mapped
}

export async function getAdminPassword(): Promise<string> {
  const settings = await getAppSettings()
  return settings.adminPassword
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const current = await getAdminPassword()
  return password === current
}

export async function updateAdminPassword(current: string, next: string): Promise<void> {
  const ok = await verifyAdminPassword(current)
  if (!ok) throw new Error('הסיסמה הנוכחית שגויה')
  if (next.trim().length < 4) throw new Error('הסיסמה החדשה קצרה מדי')
  await setDoc(
    SETTINGS_REF(),
    { adminPassword: next.trim(), updated_at: new Date().toISOString() },
    { merge: true },
  )
}

export async function updateDutyRange(start: string, end: string): Promise<void> {
  if (!start || !end) throw new Error('יש לבחור טווח תאריכים')
  if (end < start) throw new Error('תאריך הסיום חייב להיות אחרי תאריך ההתחלה')
  await setDoc(
    SETTINGS_REF(),
    { dutyStart: start, dutyEnd: end, updated_at: new Date().toISOString() },
    { merge: true },
  )
}

export async function updateSharePhone(phone: string): Promise<void> {
  const digits = phone.replace(/\D/g, '')
  await setDoc(
    SETTINGS_REF(),
    { sharePhone: digits, updated_at: new Date().toISOString() },
    { merge: true },
  )
}

function mapAssignments(data: Record<string, unknown> | undefined): ShiftAssignments {
  const base = emptyAssignments()
  if (!data) return base
  for (const key of Object.keys(base) as (keyof ShiftAssignments)[]) {
    base[key] = String(data[key] ?? '')
  }
  if (!base.karpach_a && data.karpach) base.karpach_a = String(data.karpach)
  if (!base.kar_day && data.kar) base.kar_day = String(data.kar)
  if (!base.training_day && data.training) base.training_day = String(data.training)
  return base
}

export async function fetchShiftsForDates(dates: string[]): Promise<Record<string, ShiftDay>> {
  const snaps = await Promise.all(dates.map((date) => getDoc(doc(db, 'shifts_schedule', date))))
  const result: Record<string, ShiftDay> = {}
  snaps.forEach((snap, i) => {
    const date = dates[i]
    const data = snap.exists() ? snap.data() : undefined
    result[date] = {
      id: date,
      date,
      assignments: mapAssignments(data?.assignments as Record<string, unknown> | undefined),
      updated_at: String(data?.updated_at ?? ''),
    }
  })
  return result
}

export async function fetchShiftsInRange(start: string, end: string): Promise<Record<string, ShiftDay>> {
  if (!start || !end || end < start) return {}
  try {
    const q = query(
      collection(db, 'shifts_schedule'),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date'),
    )
    const snap = await getDocs(q)
    const result: Record<string, ShiftDay> = {}
    snap.docs.forEach((d) => {
      const data = d.data()
      const date = String(data.date ?? d.id)
      result[date] = {
        id: d.id,
        date,
        assignments: mapAssignments(data.assignments as Record<string, unknown> | undefined),
        updated_at: String(data.updated_at ?? ''),
      }
    })
    return result
  } catch {
    return fetchShiftsForDates(eachDayInRange(start, end))
  }
}

export async function saveShiftDay(date: string, assignments: ShiftAssignments): Promise<void> {
  await setDoc(doc(db, 'shifts_schedule', date), {
    date,
    assignments,
    updated_at: new Date().toISOString(),
  })
}

export async function saveShiftWeek(
  days: Array<{ date: string; assignments: ShiftAssignments }>,
): Promise<void> {
  const batch = writeBatch(db)
  const now = new Date().toISOString()
  for (const day of days) {
    batch.set(doc(db, 'shifts_schedule', day.date), {
      date: day.date,
      assignments: day.assignments,
      updated_at: now,
    })
  }
  await batch.commit()
}
