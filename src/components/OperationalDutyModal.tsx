import { useEffect, useState } from 'react'

type OperationalDutyModalProps = {
  open: boolean
  initialStart?: string | null
  initialEnd?: string | null
  onClose: () => void
  onSave: (start: string, end: string) => Promise<void>
}

export function OperationalDutyModal({
  open,
  initialStart,
  initialEnd,
  onClose,
  onSave,
}: OperationalDutyModalProps) {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (open) {
      setStart(initialStart ?? '')
      setEnd(initialEnd ?? '')
      setError(null)
      setSaved(false)
      setDirty(false)
    }
  }, [open, initialStart, initialEnd])

  useEffect(() => {
    if (!open || !dirty) return
    if (!start || !end) return
    if (end < start) {
      setError('תאריך הסיום חייב להיות אחרי תאריך ההתחלה')
      setSaved(false)
      return
    }
    const t = window.setTimeout(() => {
      setSaving(true)
      setError(null)
      void onSave(start, end)
        .then(() => setSaved(true))
        .catch(() => setError('שמירה נכשלה. נסו שוב.'))
        .finally(() => setSaving(false))
    }, 400)
    return () => window.clearTimeout(t)
  }, [start, end, open, dirty, onSave])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-[2px] sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="op-duty-title"
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
      >
        <p className="text-[11px] font-bold tracking-wide text-[#2563eb]">זמינות מבצעית</p>
        <h2 id="op-duty-title" className="mt-1 text-xl font-extrabold text-slate-900">
          תעסוקה מבצעית
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          הזינו את טווח התאריכים שבו אתם זמינים לתעסוקה מבצעית. השינוי נשמר אוטומטית.
        </p>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">מתאריך</span>
            <input
              type="date"
              value={start}
              onChange={(e) => {
                setDirty(true)
                setSaved(false)
                setStart(e.target.value)
              }}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-[#c9a44a]/40"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">עד תאריך</span>
            <input
              type="date"
              value={end}
              onChange={(e) => {
                setDirty(true)
                setSaved(false)
                setEnd(e.target.value)
              }}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base outline-none focus:ring-2 focus:ring-[#c9a44a]/40"
            />
          </label>
          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
          {!error && (saving || saved) && (
            <p className="text-sm font-medium text-emerald-600">{saving ? 'שומר…' : 'נשמר'}</p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-[#2563eb] py-3.5 font-bold text-white shadow-md"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  )
}
