import { useMemo, useState } from 'react'
import { roleLabel } from '../constants/roles'
import { soldiersForShiftSlot, type ShiftRoleId } from '../constants/shifts'
import type { Soldier } from '../types/database'

type ShiftAssignSelectProps = {
  soldiers: Soldier[]
  shiftRoleId: ShiftRoleId
  value: string
  onChange: (name: string) => void
}

export function ShiftAssignSelect({
  soldiers,
  shiftRoleId,
  value,
  onChange,
}: ShiftAssignSelectProps) {
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

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

  return (
    <div className="min-w-0 flex-1">
      <input
        type="search"
        value={query || value}
        placeholder="חיפוש…"
        onChange={(e) => {
          setQuery(e.target.value)
          if (!e.target.value) onChange('')
        }}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-[#2563eb]"
      />
      <div className="mt-0.5 max-h-16 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50">
        <button
          type="button"
          onClick={() => {
            onChange('')
            setQuery('')
          }}
          className="block w-full px-2 py-0.5 text-right text-[11px] text-slate-400"
        >
          — לא שובץ —
        </button>
        {filtered.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              onChange(s.name)
              setQuery('')
            }}
            className={`block w-full truncate px-2 py-0.5 text-right text-[11px] ${
              value === s.name ? 'bg-blue-50 font-bold text-[#2563eb]' : 'text-slate-700'
            }`}
          >
            {s.name}
          </button>
        ))}
        {value && !filtered.some((s) => s.name === value) && (
          <p className="px-2 py-0.5 text-[11px] font-semibold text-[#2563eb]">{value}</p>
        )}
      </div>
      {!showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-0.5 text-[10px] font-bold text-[#2563eb]"
        >
          אחר — כל החיילים
        </button>
      )}
      {showAll && (
        <p className="mt-0.5 text-[10px] text-slate-400">מוצגת רשימה מלאה ({roleLabel('other')})</p>
      )}
    </div>
  )
}
