

# Plan: Fix Messages Disappearing After Sending

## Root Cause Analysis

Found **three bugs** working together causing sent messages to vanish:

### Bug 1: Silent DB Insert Failure (Critical)
In both `waha-send-message` and `twilio-send-message` edge functions, when the database insert fails, the function **still returns `success: true`**. The client thinks everything worked, removes the temporary optimistic message, and refetches from DB — but the message was never saved.

```
// Current code (both edge functions):
if (dbError) {
  console.error('Error saving message:', dbError);
  // ← continues and returns success: true!
}
```

### Bug 2: WAHA Race Condition
When sending via WAHA, the `waha-send-message` edge function saves the message with `metadata.waha_id`. Meanwhile, the `waha-webhook` receives the echo of the same outbound message (fromMe=true) and tries to insert it with the same `waha_id`. Due to the `messages_unique_waha_id` unique index, **whichever runs second gets a constraint violation**. If the webhook wins the race, the edge function's insert fails silently (Bug 1).

### Bug 3: Realtime Cache Key Mismatch
The query uses key `['messages', conversationId, effectiveUserId]` but the realtime subscription writes to `['messages', conversationId]` — a different cache entry. New messages arriving via realtime never update the actual displayed data.

---

## Fixes

### Fix 1: `supabase/functions/waha-send-message/index.ts`
- Use `upsert` with `ON CONFLICT` or insert with conflict handling on `waha_id`
- If the DB insert fails for a non-duplicate reason, return `success: false` with the error
- If it fails due to duplicate `waha_id` (23505), query the existing message and return it as `savedMessage`

### Fix 2: `supabase/functions/twilio-send-message/index.ts`
- Same pattern: if DB insert fails, return `success: false` so the client shows an error and keeps the optimistic message or reverts properly

### Fix 3: `src/hooks/useConversations.ts` — Fix realtime cache key
In the `useMessages` hook, change the realtime subscription's `setQueryData` call to use the correct key:
```typescript
// Before (line ~357):
queryClient.setQueryData(['messages', conversationId], ...)

// After:
queryClient.setQueryData(['messages', conversationId, effectiveUserId], ...)
```

Also update the subscription to deduplicate against temp optimistic messages (IDs starting with `temp-`).

---

## Files to Modify

1. **`supabase/functions/waha-send-message/index.ts`** — Handle DB insert failure, add conflict handling for waha_id
2. **`supabase/functions/twilio-send-message/index.ts`** — Handle DB insert failure, return proper error
3. **`src/hooks/useConversations.ts`** — Fix realtime cache key mismatch in `useMessages`

