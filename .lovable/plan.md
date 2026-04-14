

# Plan: Fix Funnel Routing, Default Workspace, and Custom First Funnel Name

## Issues Found

1. **Conversations routing**: The webhook and lead creation logic is working correctly -- conversations from API sessions (nv1, nv2) ARE being created and routed to the correct columns/workspaces. Sessions `13138475203` and `541170822381` show 0 conversations because no messages have been received on those sessions yet (confirmed in DB). The stats display for nv1/nv2 may have a timing issue but the underlying data is correct.

2. **No "default workspace" feature**: When opening the funnels page (`/leads`), it always selects the first workspace by position. There's no way to mark a workspace as default.

3. **No custom name for the first funnel**: When creating a workspace via `WorkspaceManagement`, a default funnel is NOT auto-created. When creating via Leads page auto-setup, it hardcodes "Nuevos Contactos". Neither allows a custom name.

## Changes

### 1. Add `is_default` column to `workspaces` table
- **Migration**: Add `is_default boolean DEFAULT false` to `workspaces`.
- Ensure only one workspace per user can be default (handled in app logic).

### 2. WorkspaceManagement: Add default toggle + custom first funnel name
- **Create/Edit workspace dialog**: Add a checkbox/switch "Espacio de trabajo predeterminado" (is_default).
- **Create workspace dialog**: Add an input field "Nombre del primer embudo" (only shown when creating, not editing). Default value: "Nuevos Contactos".
- **`handleCreateWorkspace`**: After creating the workspace, auto-create one `lead_column` with the user-specified name, `is_default: true`, position 0.
- **`handleUpdateWorkspace`**: When toggling `is_default` on, clear `is_default` from all other workspaces of the same user first.

### 3. Leads page: Use default workspace on load
- **`loadWorkspaces`**: After loading workspaces, if no workspace is currently selected, look for one with `is_default: true` first, then fall back to the first by position.

### 4. Update types
- Add `is_default` to the Workspace type in `supabase/types.ts`.

## Files to Modify

| File | Change |
|------|--------|
| **Migration SQL** | Add `is_default` boolean column to `workspaces` |
| `src/components/WorkspaceManagement.tsx` | Add default toggle, custom first funnel name input, auto-create column on workspace create |
| `src/pages/Leads.tsx` | Prefer `is_default` workspace on initial load |
| `src/integrations/supabase/types.ts` | Add `is_default` to workspaces type |

