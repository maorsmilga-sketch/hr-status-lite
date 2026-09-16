export const SOLDIER_ROLES = [
  { id: 'sambaz', label: 'סמב"צ' },
  { id: 'karpach', label: 'קרפ"ח' },
  { id: 'instructor', label: 'מדריך' },
  { id: 'other', label: 'אחר' },
] as const

export type SoldierRoleId = (typeof SOLDIER_ROLES)[number]['id']

export function roleLabel(id: string | null | undefined): string {
  return SOLDIER_ROLES.find((r) => r.id === id)?.label ?? 'אחר'
}

export function isSoldierRole(value: string): value is SoldierRoleId {
  return SOLDIER_ROLES.some((r) => r.id === value)
}
