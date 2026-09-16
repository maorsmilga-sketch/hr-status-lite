const SOLDIER_KEY = 'carmeli_selected_soldier_id'
const OP_DUTY_PROMPT_PREFIX = 'carmeli_op_duty_prompted_'

export function getStoredSoldierId(): string | null {
  return localStorage.getItem(SOLDIER_KEY)
}

export function setStoredSoldierId(id: string): void {
  localStorage.setItem(SOLDIER_KEY, id)
}

export function hasOpDutyPromptBeenShown(soldierId: string): boolean {
  return localStorage.getItem(`${OP_DUTY_PROMPT_PREFIX}${soldierId}`) === '1'
}

export function markOpDutyPromptShown(soldierId: string): void {
  localStorage.setItem(`${OP_DUTY_PROMPT_PREFIX}${soldierId}`, '1')
}
