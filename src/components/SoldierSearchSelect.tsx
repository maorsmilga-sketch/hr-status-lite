import { useEffect, useMemo, useRef, useState } from 'react'
import { roleLabel } from '../constants/roles'
import type { Soldier } from '../types/database'

type SoldierSearchSelectProps = {
  soldiers: Soldier[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  placeholder?: string
}

export function SoldierSearchSelect({
  soldiers,
  value,
  onChange,
  disabled,
  placeholder = 'חיפוש שם…',
}: SoldierSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const selected = soldiers.find((s) => s.id === value)

  useEffect(() => {
    setQuery(selected?.name ?? '')
  }, [selected?.name, value])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return soldiers
    return soldiers.filter(
      (s) => s.name.toLowerCase().includes(q) || roleLabel(s.role).includes(query.trim()),
    )
  }, [query, soldiers])

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="search"
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (!e.target.value) onChange('')
        }}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm outline-none ring-[#2563eb]/25 focus:border-[#2563eb] focus:ring-2"
      />
      {open && (
        <ul className="absolute z-30 mt-1 max-h-40 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400">לא נמצאו תוצאות</li>
          )}
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(s.id)
                  setQuery(s.name)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-right text-sm ${
                  s.id === value ? 'bg-blue-50 font-bold text-[#2563eb]' : 'text-slate-800'
                }`}
              >
                <span>{s.name}</span>
                <span className="text-[11px] font-medium text-slate-400">{roleLabel(s.role)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
