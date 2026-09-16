import type { SoldierRoleId } from './roles'

export const SHIFT_ROLES = [
  { id: 'karpach_a', label: 'קרפ"ח א\'', needed: 'karpach' },
  { id: 'karpach_b', label: 'קרפ"ח ב\'', needed: 'karpach' },
  { id: 'sambaz_day_1', label: 'סמב"צ יום 1', needed: 'sambaz' },
  { id: 'sambaz_day_2', label: 'סמב"צ יום 2', needed: 'sambaz' },
  { id: 'sambaz_night_1', label: 'סמב"צ לילה 1', needed: 'sambaz' },
  { id: 'sambaz_night_2', label: 'סמב"צ לילה 2', needed: 'sambaz' },
  { id: 'kar', label: 'קא"ר', needed: 'kar' },
  { id: 'training', label: 'אימון', needed: 'instructor' },
] as const

export type ShiftRoleId = (typeof SHIFT_ROLES)[number]['id']
export type ShiftAssignments = Record<ShiftRoleId, string>

export function emptyAssignments(): ShiftAssignments {
  return {
    karpach_a: '',
    karpach_b: '',
    sambaz_day_1: '',
    sambaz_day_2: '',
    sambaz_night_1: '',
    sambaz_night_2: '',
    kar: '',
    training: '',
  }
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
