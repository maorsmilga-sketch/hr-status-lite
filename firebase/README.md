# Firebase (Firestore) setup

## Collections

### `soldiers`

| Field | Type | Notes |
|--------|------|--------|
| `name` | string | Display name (unique in app logic) |
| `operational_duty_start` | string \| null | ISO date `YYYY-MM-DD` |
| `operational_duty_end` | string \| null | ISO date `YYYY-MM-DD` |
| `created_at` | string | ISO timestamp |

Document ID: auto-generated.

### `attendance_records`

| Field | Type | Notes |
|--------|------|--------|
| `soldier_id` | string | References `soldiers` document ID |
| `record_date` | string | ISO date `YYYY-MM-DD` |
| `status` | string | Hebrew status label |
| `notes` | string \| null | For "אחר" |
| `created_at` | string | ISO timestamp |
| `updated_at` | string | ISO timestamp |

Document ID: `{soldierId}_{recordDate}` (one row per soldier per day).

### `shifts_schedule`

One document per calendar day (`YYYY-MM-DD`).

| Field | Type | Notes |
|--------|------|--------|
| `date` | string | ISO date |
| `assignments` | map | Keys: `karpach`, `sambaz_day_1`, `sambaz_day_2`, `training`, `sambaz_night_1`, `sambaz_night_2` |
| `updated_at` | string | ISO timestamp |

### `standby_schedule`

One document per calendar day (`YYYY-MM-DD`) for battalion MTB (מט"ב) on-call.

| Field | Type | Notes |
|--------|------|--------|
| `date` | string | ISO date |
| `assignments` | map | Keys: `b221`, `b222`, `b223`, `b224`, `gadsem` — each `{ mtb1, mtb2 }` strings |
| `updated_at` | string | ISO timestamp |

### `settings/app`

| Field | Type | Notes |
|--------|------|--------|
| `adminPassword` | string | Defaults to `112233` on first use |
| `dutyStart` | string | Operational / shift range start (`YYYY-MM-DD`), default `2026-09-17` |
| `dutyEnd` | string | Operational / shift range end, default `2026-12-15` |
| `sharePhone` | string | WhatsApp share target digits |
| `mtbPresets` | array | Optional list of MTB names for pickers (merged with `src/constants/mtbNames.ts`) |
| `updated_at` | string | ISO timestamp |

## Console steps

1. Create a Firebase project → add a **Web app** → copy config into `.env`.
2. Enable **Firestore Database**.
3. Paste [`firestore.rules`](firestore.rules) in Firestore → Rules and **Publish** (must include `shifts_schedule`, `standby_schedule`, and `settings`).
4. Create composite indexes if the console prompts you.
