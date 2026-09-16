import { formatDisplayDate } from './dates'
import type { AttendanceRecord, Soldier } from '../types/database'

const DEFAULT_SHARE_PHONE = import.meta.env.VITE_SHARE_PHONE ?? ''

export function buildDaySummaryText(
  dateIso: string,
  soldiers: Soldier[],
  records: AttendanceRecord[],
): string {
  const bySoldier = new Map(records.map((r) => [r.soldier_id, r]))
  const lines: string[] = [
    `סיכום נוכחות — ${formatDisplayDate(dateIso)}`,
    '─────────────────',
  ]

  for (const s of soldiers) {
    const rec = bySoldier.get(s.id)
    const statusLine = rec
      ? rec.status + (rec.notes ? ` (${rec.notes})` : '')
      : 'לא דווח'
    const op =
      s.operational_duty_start && s.operational_duty_end
        ? ` | תעסוקה: ${s.operational_duty_start} → ${s.operational_duty_end}`
        : ' | תעסוקה: לא הוגדר'
    lines.push(`${s.name}: ${statusLine}${op}`)
  }

  return lines.join('\n')
}

export function openShareIntent(text: string, phone?: string): void {
  const encoded = encodeURIComponent(text)
  const targetPhone = (phone ?? DEFAULT_SHARE_PHONE).replace(/\D/g, '')

  if (navigator.share) {
    void navigator.share({ text }).catch(() => {
      fallbackShare(encoded, targetPhone)
    })
    return
  }
  fallbackShare(encoded, targetPhone)
}

function fallbackShare(encodedText: string, digits: string) {
  if (digits) {
    window.location.href = `https://wa.me/${digits}?text=${encodedText}`
  } else {
    window.location.href = `sms:?body=${encodedText}`
  }
}
