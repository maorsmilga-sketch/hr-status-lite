import { useState } from 'react'

type PasswordModalProps = {
  open: boolean
  title: string
  hint?: string
  submitLabel?: string
  onClose: () => void
  onSubmit: (password: string) => Promise<void> | void
}

export function PasswordModal({
  open,
  title,
  hint,
  submitLabel = 'אישור',
  onClose,
  onSubmit,
}: PasswordModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onSubmit(password)
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'סיסמה שגויה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-[2px] sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
      >
        <h2 className="text-lg font-extrabold text-[#0b1f33]">{title}</h2>
        {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="סיסמה"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none ring-[#c9a44a]/40 focus:ring-2"
          />
          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setPassword('')
                setError(null)
                onClose()
              }}
              className="flex-1 rounded-2xl border border-slate-200 py-3 font-semibold text-slate-700 active:bg-slate-50"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-2xl bg-[#0b1f33] py-3 font-bold text-white shadow-md disabled:opacity-60"
            >
              {busy ? 'בודק…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
