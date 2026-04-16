

# Solution: Fix Session Selection in Funnels

## Root Cause

Two issues cause messages to be sent from the wrong number:

1. **Leads.tsx fallback (line 219)**: When `selectedWhatsAppSession` is null, the fallback query only searches for `status = 'WORKING'`. But all sessions in the database have `status = 'connected'` (the normalized status). This means the fallback **never finds any session** or picks an incorrect one.

2. **State propagation timing**: The `ChatModal` correctly identifies the right session via `whatsapp_number` matching, but there can be a race condition where `handleSendMessage` fires before the `onWhatsAppSessionChange` callback updates the parent state.

## Fix

### File: `src/pages/Leads.tsx` (line ~219)

Change the fallback query from:
```sql
.eq('status', 'WORKING').limit(1)
```
to:
```sql
.in('status', ['WORKING', 'connected']).limit(1)
```

But more importantly, add a **direct lookup** that matches the conversation's `whatsapp_number` first, before falling back to any active session:

```typescript
// Priority 1: Find the original session by matching whatsapp_number
if (selectedConversation.whatsapp_number) {
  const { data: originalConn } = await supabase
    .from('whatsapp_connections')
    .select('name')
    .eq('user_id', effectiveUserId)
    .eq('phone_number', selectedConversation.whatsapp_number)
    .in('status', ['WORKING', 'connected'])
    .limit(1)
    .single();
  if (originalConn) sessionName = originalConn.name;
}

// Priority 2: Any active session (fallback)
if (!sessionName) {
  const { data: anyConn } = await supabase
    .from('whatsapp_connections')
    .select('name')
    .eq('user_id', effectiveUserId)
    .in('status', ['WORKING', 'connected'])
    .limit(1)
    .single();
  sessionName = anyConn?.name;
}
```

This ensures that even if the ChatModal's state propagation fails, the `handleSendMessage` function independently resolves the correct session from the conversation's `whatsapp_number`.

### Summary

| What | Where | Change |
|------|-------|--------|
| Fix status filter | `Leads.tsx` line 219 | Add `'connected'` to status check |
| Add direct session lookup | `Leads.tsx` ~line 216 | Match `whatsapp_number` → `phone_number` before fallback |

One file changed, ~15 lines modified. No migration needed.

