import { useEffect, useMemo, useState } from 'react'
import { MTB_OTHER_VALUE } from '../constants/mtbNames'

type MtbNamePickerProps = {
  label: string
  value: string
  presets: string[]
  onChange: (name: string) => void
  disabled?: boolean
}

export function MtbNamePicker({ label, value, presets, onChange, disabled }: MtbNamePickerProps) {
  const options = useMemo(
    () => [...new Set(presets.map((n) => n.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he')),
    [presets],
  )
  const inList = value && options.includes(value)
  const [mode, setMode] = useState<'list' | 'other'>(inList || !value ? 'list' : 'other')
  const [custom, setCustom] = useState(inList ? '' : value)

  useEffect(() => {
    if (value && options.includes(value)) {
      setMode('list')
      setCustom('')
    } else if (value) {
      setMode('other')
      setCustom(value)
    }
  }, [value, options])

  return (
    <label className="block min-w-0">
      <span className="text-[9px] font-bold text-slate-400">{label}</span>
      {mode === 'list' ? (
        <select
          disabled={disabled}
          value={inList ? value : value ? MTB_OTHER_VALUE : ''}
          onChange={(e) => {
            const next = e.target.value
            if (next === MTB_OTHER_VALUE) {
              setMode('other')
              setCustom(value && !options.includes(value) ? value : '')
              return
            }
            onChange(next)
          }}
          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-[11px] font-bold text-slate-800"
        >
          <option value="">—</option>
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value={MTB_OTHER_VALUE}>אחר…</option>
          {!inList && value ? <option value={value}>{value}</option> : null}
        </select>
      ) : (
        <div className="mt-0.5 flex gap-1">
          <input
            type="text"
            disabled={disabled}
            value={custom}
            placeholder="שם מט״ב"
            onChange={(e) => {
              setCustom(e.target.value)
              onChange(e.target.value.trim())
            }}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setMode('list')
              setCustom('')
              onChange('')
            }}
            className="shrink-0 rounded-lg bg-slate-100 px-2 text-[10px] font-bold text-slate-600"
          >
            רשימה
          </button>
        </div>
      )}
    </label>
  )
}
