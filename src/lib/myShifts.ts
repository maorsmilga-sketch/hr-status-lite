import { SHIFT_ROLES } from '../constants/shifts'
import type { ShiftDay } from '../types/database'

export function selectMyShifts(
  days: Record<string, ShiftDay>,
  soldierName: string,
  start: string,
  end: string,
) {
  const name = soldierName.trim()
  if (!name) return []
  return Object.values(days)
    .filter((day) => day.date >= start && day.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      date: day.date,
      roles: SHIFT_ROLES.filter((role) => day.assignments[role.id]?.trim() === name),
    }))
    .filter((day) => day.roles.length > 0)
}
