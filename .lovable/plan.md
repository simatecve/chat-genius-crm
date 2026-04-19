
The user is asking what else can be improved after completing Phases 1-3 (security, performance, cleanup). Let me think about what's left without re-running tools — I already have strong context from the audit.

Remaining opportunities I identified earlier but didn't include in the original 3 phases:
1. Refactor of large files (Leads.tsx ~1000 lines, Conversations.tsx, KanbanBoard.tsx) — was Phase 3 action 3.2 originally
2. React Query usage standardization — many hooks use raw useState/useEffect instead of useQuery
3. Bundle size — no code splitting on routes (everything loads on first paint)
4. Missing error boundaries per route
5. Accessibility (missing ARIA labels, keyboard nav)
6. Edge function consolidation (waha-* are 8 separate functions, lots of duplicated CORS/auth)
7. Realtime subscription leaks (channels not always cleaned up)
8. Missing rate limiting on public edge functions (web-chat-message, mercadopago-webhook)
9. SQL: still some N+1 queries in dashboard hooks
10. Type safety: many `any` types in services
11. i18n: hardcoded Spanish strings everywhere
12. Test coverage: zero tests

I should present this as Phase 4+ with prioritization. Keep concise.
