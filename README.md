# SponsorStory

Personalized post-event sponsor impact reports. Spec: [`SponsorStory_PRD_v1.md`](SponsorStory_PRD_v1.md).

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

## Shared contract

[`lib/contract.ts`](lib/contract.ts) defines the content shapes, template slots, rich-text allowlist, and
server action signatures that frontend and backend both build against. [`lib/report.ts`](lib/report.ts)
turns stored records into the `ResolvedReport` the renderer consumes (draft preview and published page alike).
Contract changes go in their own small PR.

## Scripts

`npm run dev` · `npm run build` · `npm test` · `npm run typecheck` · `npm run lint`

## Workflow

Short-lived `backend/*` and `frontend/*` branches, PRs into `main`.
