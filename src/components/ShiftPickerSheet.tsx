import { useEffect, useMemo, useState } from 'react'
import { roleLabel } from '../constants/roles'
import { soldiersForShiftSlot, type ShiftRoleId } from '../constants/shifts'
import type { Soldier } from '../types/database'

type ShiftPickerSheetProps = {
  open: boolean
  title: string
  shiftRoleId: ShiftRoleId
  soldiers: Soldier[]
  value: string
  onClose: () => void
  onSelect: (name: string) => void
}

export function ShiftPickerSheet({
  open,
  title,
  shiftRoleId,
  soldiers,
  value,
  onClose,
  onSelect,
}: ShiftPickerSheetProps) {
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (open) {
      setQuery('')
      setShowAll(false)
    }
  }, [open])

  const preferred = useMemo(
    () => soldiersForShiftSlot(soldiers, shiftRoleId),
    [soldiers, shiftRoleId],
  )
  const pool = showAll ? soldiers : preferred
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pool
    return pool.filter((s) => s.name.toLowerCase().includes(q))
  }, [pool, query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px]">
      <div className="flex max-h-[80dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-extrabold text-slate-900">שיבוץ {title}</p>
          <button type="button" onClick={onClose} className="text-sm font-bold text-slate-400">
            סגור
          </button>
        </div>
        <div className="px-4">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש שם…"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none focus:border-[#2563eb]"
          />
        </div>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2">
          <button
            type="button"
            onClick={() => {
              onSelect('')
              onClose()
            }}
            className="w-full rounded-xl px-3 py-3 text-right text-sm text-slate-400"
          >
            — לא שובץ —
          </button>
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s.name)
                onClose()
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-right ${
                value === s.name ? 'bg-blue-50 font-extrabold text-[#2563eb]' : 'text-slate-800'
              }`}
            >
              <span className="text-base">{s.name}</span>
              <span className="text-[11px] font-medium text-slate-400">{roleLabel(s.role)}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-slate-400">אין תוצאות</p>
          )}
        </div>
        {!showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mx-4 mt-2 rounded-2xl bg-slate-100 py-3 text-sm font-extrabold text-[#2563eb]"
          >
            אחר — הצג את כל החיילים
          </button>
        )}
      </div>
    </div>
  )
}
