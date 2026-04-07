
# Plan: Add "WhatsApp API" Channel (Duplicate of WhatsApp QR)

## Summary
Create a new channel called "WhatsApp API" that reuses the entire WAHA backend logic but has its own visual identity (icon: 🔌, color: purple/violet). Sessions are stored in the same `whatsapp_connections` table with a `connection_subtype` field to distinguish them.

## Database
- Add column `connection_subtype text DEFAULT 'qr'` to `whatsapp_connections` — values: `'qr'` (WhatsApp QR) or `'api'` (WhatsApp API).

## New File: `src/components/sessions/WhatsAppAPIConnectionForm.tsx`
- Copy of `WhatsAppConnectionForm.tsx` with:
  - Title changed to "Conectar WhatsApp API"
  - Saves `connection_subtype: 'api'` when inserting into `whatsapp_connections`
  - Same QR flow, same edge functions (`waha-create-session`, `waha-get-qr`, etc.)

## Modify: `src/components/sessions/SessionsManager.tsx`
- **Channel list**: Enable `whatsapp-api` entry, change icon to `🔌` and color to `hsl(var(--primary))` (or a purple tone).
- **Session type**: Add `'whatsapp-api'` to the `Session['type']` union.
- **`fetchAllSessions`**: When mapping `whatsapp_connections`, check `connection_subtype` — if `'api'`, set `type: 'whatsapp-api'`.
- **`getTypeIcon`**: Return `🔌` for `'whatsapp-api'`.
- **`getTypeColor`**: Return a distinct purple color for `'whatsapp-api'`.
- **`handleVerifyStatus`**: Allow `'whatsapp-api'` (same WAHA verify logic).
- **`handleDeleteSession`**: Add `case 'whatsapp-api':` with same logic as `'whatsapp'`.
- **Filter options**: Add `{ value: 'whatsapp-api', label: 'WhatsApp API', icon: '🔌' }`.
- **Connection form render**: Add `{selectedChannel === 'whatsapp-api' && <WhatsAppAPIConnectionForm onClose={handleCloseForm} />}`.

## Other Files (Visual Identity)
- **`src/components/conversations/ConversationList.tsx`**: Add icon case for `channel_type === 'whatsapp'` + subtype detection (or treat all whatsapp conversations the same visually — since channel_type in DB remains `'whatsapp'`, no changes needed here).
- **`src/services/reportsService.ts`**, **`src/hooks/useSessionStats.ts`**: No changes — they query `whatsapp_connections` generically, both subtypes are included.

## Files to Modify
| File | Change |
|------|--------|
| **Migration SQL** | Add `connection_subtype` column to `whatsapp_connections` |
| **`WhatsAppAPIConnectionForm.tsx`** (new) | Duplicate of WhatsAppConnectionForm with subtype='api' |
| **`SessionsManager.tsx`** | Enable channel, add type, icon, color, filter, form render, delete/verify cases |
