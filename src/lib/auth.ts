const ADMIN_SESSION_KEY = 'carmeli_admin_ok'

export function isAdminSession(): boolean {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1'
}

export function setAdminSession(ok: boolean): void {
  if (ok) sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
  else sessionStorage.removeItem(ADMIN_SESSION_KEY)
}
