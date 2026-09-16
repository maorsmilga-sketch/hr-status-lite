export const SHIFT_ROLES = [
  { id: 'karpach', label: 'קרפ"ח', period: 'morning' },
  { id: 'sambaz_day_1', label: 'סמב"צ יום 1', period: 'morning' },
  { id: 'sambaz_day_2', label: 'סמב"צ יום 2', period: 'morning' },
  { id: 'training', label: 'אימון', period: 'morning' },
  { id: 'sambaz_night_1', label: 'סמב"צ לילה 1', period: 'night' },
  { id: 'sambaz_night_2', label: 'סמב"צ לילה 2', period: 'night' },
] as const

export type ShiftRoleId = (typeof SHIFT_ROLES)[number]['id']
export type ShiftAssignments = Record<ShiftRoleId, string>

export function emptyAssignments(): ShiftAssignments {
  return {
    karpach: '',
    sambaz_day_1: '',
    sambaz_day_2: '',
    training: '',
    sambaz_night_1: '',
    sambaz_night_2: '',
  }
}

export function soldiersForShiftSlot<T extends { role: string }>(
  soldiers: T[],
  shiftRoleId: ShiftRoleId,
): T[] {
  const needed =
    shiftRoleId === 'karpach'
      ? 'karpach'
      : shiftRoleId === 'training'
        ? 'instructor'
        : 'sambaz'
  const preferred = soldiers.filter((s) => s.role === needed || s.role === 'other')
  return preferred.length > 0 ? preferred : soldiers
}
