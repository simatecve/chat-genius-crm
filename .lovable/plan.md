

# Plan: Fix Embudos Realtime + Version Update + Mass Campaign Anti-Ban with Multi-Session

## 1. Fix Embudos (Funnels) Realtime Updates

**Root Cause**: The `debouncedLoadLeads` calls `loadLeadsRef.current` (which is the old `loadLeads` function that sets `setLeads()`), but the KanbanBoard uses data from `useInfiniteLeads` hook (`getLeadsForColumn`, `getAllLeads`). The old `loadLeads` data goes into a `leads` state that isn't rendered by the Kanban — the paginated hook's internal state is what's displayed.

**Fix** in `src/pages/Leads.tsx`:
- Change `debouncedLoadLeads` to call `refreshAll()` from the `useInfiniteLeads` hook instead of `loadLeadsRef.current()`. This ensures the Kanban's actual data source refreshes.
- Remove the stale `loadLeadsRef` pattern since it updates the wrong state.

## 2. Update Version String

Replace `Versión 3.0 17-03-26` → `Versión 3.1 30-03-26` in:
- `src/pages/Login.tsx` (line 163)
- `src/components/layout/Sidebar.tsx` (line 249)
- `src/components/layout/AdminLayout.tsx` (line 184)

## 3. Mass Campaign Anti-Ban Logic (WAHA)

Enhance `supabase/functions/send-mass-campaign/index.ts` WhatsApp sending with WAHA anti-ban techniques:

**Before each message send:**
1. **Send presence `online`** — `POST /api/{session}/presence` with `{"presence":"online"}`
2. **Send `sendSeen`** — `POST /api/sendSeen` to mark chat as read (simulates reading before replying)
3. **Send presence `typing`** — Set typing indicator for the target chat via `POST /api/{session}/presence` with `{"chatId":"...@c.us","presence":"typing"}`
4. **Random typing delay** — Wait 2-5 seconds to simulate typing time
5. **Send the message** (existing `POST /api/sendText`)
6. **Send presence `paused`** — Clear typing state after sending
7. **Send presence `offline`** — After a batch of messages, go offline

**AI message variation** (already partially implemented with `edit_with_ai`):
- When `edit_with_ai` is enabled, each message gets rewritten with a higher temperature (0.9) for more variation, ensuring each recipient gets a unique message to avoid spam detection.

**Random longer pauses**: Every 5-10 messages, insert a longer pause (30-90 seconds) to simulate natural human behavior.

## 4. Multi-Session Round-Robin for Mass Campaigns

### Database Changes
Add a new column to `mass_campaigns` to store multiple WAHA connections:

```sql
ALTER TABLE mass_campaigns 
ADD COLUMN whatsapp_connection_ids uuid[] DEFAULT NULL;
```

### UI Changes — `src/pages/CreateMassCampaign.tsx`
- When `channelType === 'whatsapp'`, change the session selector to allow **multi-select** (checkboxes for each active WAHA connection).
- Store selected connection IDs in a new state `selectedConnections: string[]`.
- Save to `whatsapp_connection_ids` array column (keep backward compatibility with `whatsapp_connection_id` for single-session campaigns).

### Edge Function — `send-mass-campaign/index.ts`
- Load all selected WAHA connections from `whatsapp_connection_ids` (fallback to single `whatsapp_connection_id`).
- Implement **round-robin distribution**: distribute contacts across sessions evenly.
  - Example: 5 sessions, 10 contacts → 2 contacts per session per round.
  - Each round sends 1 message per session asynchronously (not truly parallel, but cycling through sessions).
- Vary the session order each round to avoid predictable patterns.

```text
Round-Robin Logic:
Sessions: [S1, S2, S3, S4, S5]
Contacts: [C1, C2, C3, C4, C5, C6, C7, C8, C9, C10]

Round 1: S1→C1, S2→C2, S3→C3, S4→C4, S5→C5
  (long pause 30-90s)
Round 2: S3→C6, S1→C7, S5→C8, S2→C9, S4→C10
  (shuffled order each round)
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Leads.tsx` | Fix realtime to use `refreshAll()` instead of stale `loadLeads` |
| `src/pages/Login.tsx` | Version 3.1 30-03-26 |
| `src/components/layout/Sidebar.tsx` | Version 3.1 30-03-26 |
| `src/components/layout/AdminLayout.tsx` | Version 3.1 30-03-26 |
| `src/pages/CreateMassCampaign.tsx` | Multi-select WhatsApp sessions UI |
| `supabase/functions/send-mass-campaign/index.ts` | Anti-ban logic + multi-session round-robin |
| **Migration** | Add `whatsapp_connection_ids` column to `mass_campaigns` |

