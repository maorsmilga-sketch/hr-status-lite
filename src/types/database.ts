import type { SoldierRoleId } from '../constants/roles'
import type { ShiftAssignments } from '../constants/shifts'

export type Soldier = {
  id: string
  name: string
  role: SoldierRoleId
  operational_duty_start: string | null
  operational_duty_end: string | null
  created_at: string
}

export type AttendanceRecord = {
  id: string
  soldier_id: string
  record_date: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type ShiftDay = {
  id: string
  date: string
  assignments: ShiftAssignments
  updated_at: string
}

export type AppSettings = {
  adminPassword: string
  dutyStart: string
  dutyEnd: string
  sharePhone: string
}
