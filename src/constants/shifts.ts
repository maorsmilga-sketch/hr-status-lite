import type { SoldierRoleId } from './roles'

export const SHIFT_ROLES = [
  { id: 'karpach_a', label: 'קרפ"ח א\'', needed: 'karpach', period: 'day' },
  { id: 'karpach_b', label: 'קרפ"ח ב\'', needed: 'karpach', period: 'day' },
  { id: 'sambaz_day_1', label: 'סמב"צ יום 1', needed: 'sambaz', period: 'day' },
  { id: 'sambaz_day_2', label: 'סמב"צ יום 2', needed: 'sambaz', period: 'day' },
  { id: 'kar_day', label: 'קא"ר', needed: 'kar', period: 'day' },
  { id: 'training_day', label: 'אימון', needed: 'instructor', period: 'day' },
  { id: 'sambaz_night_1', label: 'סמב"צ לילה 1', needed: 'sambaz', period: 'night' },
  { id: 'sambaz_night_2', label: 'סמב"צ לילה 2', needed: 'sambaz', period: 'night' },
  { id: 'kar_night', label: 'קא"ר', needed: 'kar', period: 'night' },
  { id: 'training_night', label: 'אימון', needed: 'instructor', period: 'night' },
] as const

export type ShiftRoleId = (typeof SHIFT_ROLES)[number]['id']
export type ShiftAssignments = Record<ShiftRoleId, string>
export type ShiftPeriod = 'day' | 'night'

export function emptyAssignments(): ShiftAssignments {
  return {
    karpach_a: '',
    karpach_b: '',
    sambaz_day_1: '',
    sambaz_day_2: '',
    kar_day: '',
    training_day: '',
    sambaz_night_1: '',
    sambaz_night_2: '',
    kar_night: '',
    training_night: '',
  }
}

export function rolesForPeriod(period: ShiftPeriod) {
  return SHIFT_ROLES.filter((r) => r.period === period)
}

export function neededQualification(shiftRoleId: ShiftRoleId): SoldierRoleId {
  const role = SHIFT_ROLES.find((r) => r.id === shiftRoleId)
  return (role?.needed ?? 'other') as SoldierRoleId
}

export function soldiersForShiftSlot<T extends { role: string }>(
  soldiers: T[],
  shiftRoleId: ShiftRoleId,
): T[] {
  const needed = neededQualification(shiftRoleId)
  return soldiers.filter((s) => s.role === needed)
}

export type NamedShiftSlot = {
  id: ShiftRoleId
  period: ShiftPeriod
  label: string
}

export function slotsForName(assignments: ShiftAssignments, name: string): NamedShiftSlot[] {
  const n = name.trim()
  if (!n) return []
  return SHIFT_ROLES.filter((role) => assignments[role.id] === n).map((role) => ({
    id: role.id,
    period: role.period,
    label: role.label,
  }))
}
