import { useCallback, useEffect, useRef, useState } from 'react'
import { StandbyDayBoardEditor } from '../components/StandbyDayBoard'
import { emptyStandbyAssignments, type StandbyAssignments } from '../constants/standby'
import { addDays, formatDisplayDate, todayISO } from '../lib/dates'
import {
  fetchStandbyForDates,
  getAppSettings,
  mergedMtbPresets,
  saveStandbyDayAndPresets,
} from '../lib/db'

type Props = {
  dutyStart: string
  dutyEnd: string
}

export function AdminStandbyPanel({ dutyStart, dutyEnd }: Props) {
  const [viewDate, setViewDate] = useState(() => {
    const t = todayISO()
    if (t < dutyStart) return dutyStart
    if (t > dutyEnd) return dutyEnd
    return t
  })
  const [assignments, setAssignments] = useState<StandbyAssignments>(emptyStandbyAssignments())
  const [presets, setPresets] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const settings = await getAppSettings()
      setPresets(mergedMtbPresets(settings))
      const map = await fetchStandbyForDates([viewDate])
      setAssignments(map[viewDate]?.assignments ?? emptyStandbyAssignments())
    } catch {
      setMessage('טעינה נכשלה')
    }
    setLoading(false)
  }, [viewDate])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setViewDate((d) => {
      if (d < dutyStart) return dutyStart
      if (d > dutyEnd) return dutyEnd
      return d
    })
  }, [dutyStart, dutyEnd])

  function queueSave(next: StandbyAssignments) {
    setAssignments(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void persist(next)
    }, 450)
  }

  async function persist(next: StandbyAssignments) {
    if (viewDate < dutyStart || viewDate > dutyEnd) {
      setMessage('תאריך מחוץ לטווח התעסוקה')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const updated = await saveStandbyDayAndPresets(viewDate, next, presets)
      setPresets(updated)
      setMessage('נשמר')
    } catch {
      setMessage('שמירה נכשלה')
    }
    setSaving(false)
  }

  function shiftDate(delta: number) {
    setViewDate((d) => {
      const next = addDays(d, delta)
      if (next < dutyStart) return dutyStart
      if (next > dutyEnd) return dutyEnd
      return next
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <section className="shrink-0 rounded-2xl bg-[#2563eb] p-3 text-white shadow-md">
        <p className="text-[10px] font-bold text-white/80">ניהול מטבים · טווח תעסוקה</p>
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            disabled={viewDate <= dutyStart}
            onClick={() => shiftDate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 disabled:opacity-30"
          >
            ‹
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-xs font-extrabold">{formatDisplayDate(viewDate)}</p>
            <input
              type="date"
              min={dutyStart}
              max={dutyEnd}
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value)}
              className="mt-0.5 rounded border-0 bg-white/15 px-1 py-0.5 text-[10px]"
            />
          </div>
          <button
            type="button"
            disabled={viewDate >= dutyEnd}
            onClick={() => shiftDate(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 disabled:opacity-30"
          >
            ›
          </button>
        </div>
        <p className="mt-1 text-center text-[10px] text-white/70">
          {saving ? 'שומר…' : message ?? 'השינויים נשמרים אוטומטית'}
        </p>
      </section>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">טוען…</p>
      ) : (
        <StandbyDayBoardEditor
          assignments={assignments}
          presets={presets}
          saving={saving}
          onChange={queueSave}
        />
      )}
    </div>
  )
}
