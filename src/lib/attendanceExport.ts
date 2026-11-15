import type { AttendanceRecord } from '../types/database'

export async function downloadAttendanceXlsx(
  soldierName: string,
  records: AttendanceRecord[],
): Promise<void> {
  const XLSX = await import('xlsx')
  const rows = records.map((rec) => ({
    'תאריך': rec.record_date,
    'סטטוס': rec.status,
    'הערות': rec.notes ?? '',
  }))
  const worksheet = XLSX.utils.json_to_sheet(rows)
  worksheet['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 30 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'דיווחים')
  workbook.Workbook = { Views: [{ RTL: true }] }
  const safeName = soldierName.trim().replace(/[\\/:*?"[\]]/g, '_') || 'חייל'
  XLSX.writeFile(workbook, `דיווחים_${safeName}.xlsx`)
}
