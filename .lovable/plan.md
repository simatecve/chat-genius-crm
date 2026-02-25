

# Plan: Fix WAHA LID Resolution for Missing Messages

## Problem Identified

Messages are arriving to the webhook but being **rejected** because Meta is now using LIDs (Linked IDs) instead of regular phone numbers. Looking at the logs:

```text
[DEBUG] JID extraction: remoteJid=undefined, remoteJidAlt=undefined, participant=null
[LID Detection Early] Rejecting LID before normalization: 40381852995718@lid
[DEBUG] Initial rawPhoneNumber: 40381852995718@lid
```

The message `from` field is `40381852995718@lid` (a LID), and `remoteJid`/`remoteJidAlt` are both `undefined`. The code has no fallback, so it assigns the LID as `rawPhoneNumber` and then rejects it at line 724.

**However**, the real phone number IS present in the payload at `_data.Info.SenderAlt`:
```json
"SenderAlt": "5491176250197@s.whatsapp.net"
```

This field is currently **not being checked** by the JID extraction logic.

## Root Cause

The WAHA GOWS engine (version 2026.2.3) changed how it structures JIDs. The `_data.key` object no longer contains `remoteJid`/`remoteJidAlt` for LID-based chats. Instead, the real phone number is in `_data.Info.SenderAlt` (for inbound) and `_data.Info.RecipientAlt` (for outbound).

## Solution

Modify `supabase/functions/waha-webhook/index.ts` to add `SenderAlt` and `RecipientAlt` as additional fallback sources when extracting phone numbers.

### Changes to `processMessageEvent` function

**1. Expand JID extraction (around line 653-661):**

Add extraction of `SenderAlt` and `RecipientAlt` from `_data.Info`:

```typescript
const remoteJid = messageData._data?.key?.remoteJid;
const remoteJidAlt = messageData._data?.key?.remoteJidAlt;
const participant = messageData._data?.key?.participant || 
                   messageData.participant ||
                   messageData._data?.participant ||
                   null;
const participantNumber = participant ? normalizePhoneNumber(participant) : null;

// NEW: Extract SenderAlt and RecipientAlt from _data.Info
const senderAlt = messageData._data?.Info?.SenderAlt || null;
const recipientAlt = messageData._data?.Info?.RecipientAlt || null;
```

**2. Update inbound LID resolution (around line 697-712):**

Add `senderAlt` as a fallback for inbound messages when all other JIDs are LIDs:

```typescript
// Inbound: check senderAlt before giving up
} else if (senderAlt && !isMetaLid(senderAlt)) {
  rawPhoneNumber = senderAlt;
  console.log(`[LID Fix] Using SenderAlt for inbound: ${senderAlt}`);
}
```

**3. Update outbound LID resolution (around line 680-695):**

Add `recipientAlt` as a fallback for outbound messages:

```typescript
// Outbound: check recipientAlt before giving up
} else if (recipientAlt && !isMetaLid(recipientAlt)) {
  rawPhoneNumber = recipientAlt;
  console.log(`[LID Fix] Using RecipientAlt for outbound: ${recipientAlt}`);
}
```

**4. Update the fallback assignments (lines 694, 711):**

Add `senderAlt`/`recipientAlt` to the fallback chain for non-LID cases too:

```typescript
// Outbound fallback
rawPhoneNumber = remoteJid || remoteJidAlt || recipientAlt || messageData.to || messageData.from;

// Inbound fallback
rawPhoneNumber = remoteJid || remoteJidAlt || senderAlt || messageData.from;
```

**5. Last-resort LID resolution before rejection (line 723-727):**

Instead of immediately rejecting a LID, try `messageData.from` alternatives:

```typescript
if (isMetaLid(rawPhoneNumber)) {
  // Last resort: try SenderAlt/RecipientAlt or from/to fields
  const lastResort = fromMe 
    ? (recipientAlt || messageData.to)
    : (senderAlt || messageData._data?.Info?.SenderAlt);
  
  if (lastResort && !isMetaLid(lastResort)) {
    rawPhoneNumber = lastResort;
    console.log(`[LID Fix] Last resort resolution: ${rawPhoneNumber}`);
  } else {
    console.log(`[LID Detection Early] Rejecting LID, no alternatives: ${rawPhoneNumber}`);
    return;
  }
}
```

## File to Modify

| File | Changes |
|------|---------|
| `supabase/functions/waha-webhook/index.ts` | Add SenderAlt/RecipientAlt extraction and fallback chain |

## Expected Result

- Messages from LID-based contacts will be correctly resolved to real phone numbers using `SenderAlt`/`RecipientAlt`
- All sessions (ewil22, ewil45, ewil46, etc.) that are currently `connected` will start receiving messages in the CRM
- No changes to existing non-LID message processing

