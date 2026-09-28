import { formatDisplayDate } from './dates'
import type { AttendanceRecord, Soldier } from '../types/database'

const DEFAULT_SHARE_PHONE = import.meta.env.VITE_SHARE_PHONE ?? ''
const FALLBACK_APP_URL = 'https://hr-status-lite.vercel.app'

export function getPublicAppUrl(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return window.location.origin
  }
  return FALLBACK_APP_URL
}

export type AdminSummaryStatusFilter = 'all' | 'unreported' | 'בית' | 'בבסיס'

function recordBySoldier(records: AttendanceRecord[]) {
  return new Map(records.map((r) => [r.soldier_id, r]))
}

export function soldierMatchesSummaryFilter(
  soldierId: string,
  records: AttendanceRecord[],
  filter: AdminSummaryStatusFilter,
): boolean {
  if (filter === 'all') return true
  const rec = recordBySoldier(records).get(soldierId)
  if (filter === 'unreported') return !rec
  return rec?.status === filter
}

export function buildDaySummaryText(
  dateIso: string,
  soldiers: Soldier[],
  records: AttendanceRecord[],
  filter: AdminSummaryStatusFilter = 'all',
): string {
  const bySoldier = recordBySoldier(records)
  const filtered = soldiers.filter((s) => soldierMatchesSummaryFilter(s.id, records, filter))
  const lines: string[] = [`סיכום נוכחות — ${formatDisplayDate(dateIso)}`, '']

  if (filter === 'unreported') {
    for (const s of filtered) {
      lines.push(s.name)
    }
    if (filtered.length === 0) {
      lines.push('כולם דיווחו')
    }
    return lines.join('\n')
  }

  for (const s of filtered) {
    const rec = bySoldier.get(s.id)
    if (!rec) continue
    const extra = rec.notes ? ` (${rec.notes})` : ''
    lines.push(`${s.name}: ${rec.status}${extra}`)
  }

  if (lines.length === 2) {
    lines.push(filter === 'all' ? 'אין דיווחים ליום זה' : 'אין התאמות לסינון')
  }

  return lines.join('\n')
}

export function buildUnreportedSummaryShareText(
  dateIso: string,
  soldiers: Soldier[],
  records: AttendanceRecord[],
  appUrl: string = getPublicAppUrl(),
): string {
  const missing = soldiers.filter((s) => soldierMatchesSummaryFilter(s.id, records, 'unreported'))
  const lines: string[] = [
    `תזכורת — ${formatDisplayDate(dateIso)}`,
    '',
    'שעדיין לא עדכתם נוכחות. נא להיכנס ולעדכן.',
    appUrl,
    '',
  ]
  if (missing.length > 0) {
    lines.push('חסרים דיווח:')
    missing.forEach((s) => lines.push(`• ${s.name}`))
  } else {
    lines.push('כולם דיווחו 🙏')
  }
  return lines.join('\n')
}

export function buildAdminSummaryShareText(
  dateIso: string,
  soldiers: Soldier[],
  records: AttendanceRecord[],
  filter: AdminSummaryStatusFilter,
): string {
  if (filter === 'unreported') {
    return buildUnreportedSummaryShareText(dateIso, soldiers, records)
  }
  return buildDaySummaryText(dateIso, soldiers, records, filter)
}

export function buildAttendanceReminderText(
  dateIso: string,
  appUrl: string = getPublicAppUrl(),
): string {
  return [
    'שלום לכולם 👋',
    `תזכורת לעדכן נוכחות — ${formatDisplayDate(dateIso)}.`,
    '',
    'נא להיכנס לקישור, לבחור את השם שלכם ולעדכן את הסטטוס:',
    appUrl,
    '',
    'תודה 🙏',
  ].join('\n')
}

export function openGroupShareIntent(text: string): void {
  const encoded = encodeURIComponent(text)
  const groupChooser = `https://wa.me/?text=${encoded}`

  if (navigator.share) {
    void navigator.share({ text }).catch(() => {
      window.location.href = groupChooser
    })
    return
  }
  window.location.href = groupChooser
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
