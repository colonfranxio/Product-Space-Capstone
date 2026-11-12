# SponsorStory — Product Requirements Document (PRD)

**Version:** 1.0 — initial build specification  
**Status:** Ready for implementation  
**Product:** SponsorStory (working name)  
**Initial audience:** Student organizations running events with approximately 10–20 sponsors  
**Build constraint:** Approximately six hours with two builder agents; one website template in the first build  
**Prepared:** November 12, 2026

## 1. Product summary

SponsorStory is a guided, no-code website generator for **personalized post-event sponsor impact reports**. A student organization records an event once, then creates an individually branded, shareable thank-you website for each sponsor. Each report combines event-wide information with sponsor-specific photographs, impact evidence, messages, and an optional set of relevant metrics. The page ends with a customizable invitation to sponsor a future event.

Unlike a general-purpose website builder, SponsorStory optimizes a single repetitive job: **creating and publishing 10–20 consistent but personalized sponsor reports after one event**. It is not a CRM, outreach manager, redemption system, or sponsor analytics platform.

**One-sentence value proposition:** Turn one event's results into polished, personalized sponsor thank-you websites, with minimal repeated work and a clear path to renewal.

## 2. Problem, users, and hypotheses

### Problem
Student organization teams often finish an event without a consistent, compelling way to show sponsors what their support accomplished. Preparing individual thank-you communications manually requires writing copy, selecting photographs, formatting designs, and publishing or assembling deliverables repeatedly. This work can be particularly costly when one event has 10–20 sponsors. Poor post-event communication may also weaken opportunities to secure early renewals.

These are **product hypotheses**, not yet demonstrated outcomes. The team's research established fragmented sponsorship operations and limited continuity, but did not establish that individual report creation is currently a frequent or measured pain point or that reports increase renewal rates.

### Primary user
A student organization officer, sponsorship committee member, or team lead who has little web design expertise and needs to produce individualized post-event sponsor communications quickly.

### Secondary recipient
A sponsor contact at a local business or corporation viewing a mobile-friendly report and potentially following a link to express early renewal interest.

### MVP goals
1. Let one administrator create an event and reuse its common information across multiple sponsor pages.
2. Guide an inexperienced student through creating a polished sponsor website, from template choice to publication.
3. Make photos, text, branding, previewing, and editing simple and controlled within the template.
4. Keep live sponsor pages accessible when a published report is being revised.
5. Publish each sponsor report to an individual, editable-slug URL and include a configurable renewal call to action (CTA).

### Out of scope
- Sponsor CRM, contact pipelines, prospect discovery, mail merge, follow-up sequences, payment processing, automated sponsor acquisition, or managing sponsor fulfillment.
- Automatic claims of ROI or business impact; the app only displays metrics the organizer supplies.
- Fully freeform drag-and-drop website design.
- Multiple organization members / complex roles in the initial build.
- Multiple website templates in today's MVP; architecture should support more later.

## 3. Key product principles

**Guided first, flexible second.** The right sidebar leads the user through clearly sequenced steps, using plain-language instructions and showing one task at a time. No design knowledge should be required. The left side remains a live website preview.

**Template layouts are fixed.** Users may change content, image crops, fonts, text formatting, and colors—but not arbitrarily reposition sections.

**Shared once, personalized many times.** Event-level information is entered once. Sponsor-level details are entered per sponsor. Event-level metrics are optional and are displayed only when the applicable page template/configuration selects them; attendance is not required.

**Drafts are safe.** Students may save drafts and preview at any point. Editing a published page creates unpublished revisions without interrupting the currently published URL.

**No fabricated impact.** Only display user-entered statistics and supplied photographs. Optional missing sections disappear cleanly instead of showing placeholder figures on published reports.

## 4. Information architecture and navigation

### 4.1 Sign-in / organization setup
- One administrator signs into the organization's workspace using Supabase Auth.
- First-use organization setup: organization name; optional logo and default brand colors.
- Initial version supports **one administrator account per organization**. Invites and member permissions are deferred.

### 4.2 Organization home: Events
- Grid of **event cards** showing event title and a small cover image (plus optional date).
- **Add Event** button in the top-right corner.
- Clicking an event card opens that event's sponsor gallery.
- A card may use a neutral fallback image when the event has no cover photo.

### 4.3 Event page: Sponsors
- Visually similar card layout to the organization home, but cards represent sponsors of the chosen event.
- **Add Sponsor** button in the top-right corner.
- Each sponsor card shows sponsor name/logo or fallback, plus a visible **Draft** or **Published** status.
- A pencil icon at the **top-left of each sponsor card** opens that sponsor's editor.
- Clicking the body of a **Published** card opens the in-app viewing page showing the currently published website.
- Clicking the body of a **Draft** card opens the incomplete preview in viewing mode, with an obvious Edit action. Draft preview must not be mistaken for a publicly published link.
- When a published sponsor has newer draft changes, its card remains **Published** and may additionally display **Unpublished edits**.

### 4.4 Sponsor viewer
- Displays the website using exactly the same report renderer as the public page.
- Viewing is separate from editing: no editing controls obscure the report.
- For published pages, offers **Open public link** and **Copy link**.
- For unpublished pages, clearly labels the preview **Draft — not public**.

### 4.5 Sponsor editor
- Two primary regions on desktop: **left = live website preview**, **right = guided editing sidebar**.
- On small screens, show a usable preview/edit toggle or stacked arrangement rather than shrinking both regions to unreadable widths.
- Persistent **Save Draft** and **Preview** controls are accessible throughout the process. Include a visible saving/saved indicator.
- Sidebar includes step title, concise instructions, Back/Next navigation, and a step indicator (e.g., “3 of 6”).
- No section dragging or unrestricted layout changes.

## 5. Event creation and event-wide settings

Required: **event title**. Other recommended fields:
- Event date.
- Short description / event summary.
- Event cover image.
- Optional event logo.
- Default event color palette (primary, secondary, background/text where appropriate).
- Optional structured event-wide metrics (e.g., number of attendees, number of competitors, number of participating organizations, verified engagement counts). **No metric, including attendance, is mandatory or automatically included in a sponsor page.**
- Optional event-wide photos, if useful, but **no shared photo-gallery feature is required for the initial build**.
- Default renewal CTA heading, body copy, button label, and destination URL. These can be overridden per sponsor.
- Unique event URL slug, initially auto-generated from the title; ensure uniqueness within public route namespace.

Changes to event-wide information should update **draft previews** for sponsors using those fields. They must **not silently alter already published report snapshots**; the user must republish each affected sponsor (or use a future explicit bulk republish action).

## 6. Guided sponsor-creation workflow — detailed specification

Create a new draft sponsor record when the officer clicks **Add Sponsor**, then immediately open the editor. The creator can save and leave at any step. The wizard's sidebar controls content while the left pane renders the website in real time.

### Step 1 — Select template
- Show template choices in the right sidebar; selecting a template immediately updates the live preview on the left.
- **Initial MVP ships with ONE polished template.** Build the template selection/data model so a second, genuinely different layout can be added later without redesigning sponsor records.
- Selected template establishes fixed photo placements, text blocks, metric presentation, section order, and renewal CTA position.

### Step 2 — Sponsor identity and logo
- Capture sponsor display name (required for publication).
- Upload sponsor logo (recommended; not required to save draft).
- Show the logo in its designated template position immediately.
- Replace or remove the uploaded logo from the sidebar.

### Step 3 — Color palette
- Offer three options: **Use Event Colors**, **Extract from Sponsor Logo**, and **Choose Manually**.
- Manual controls should at least support primary/accent and background/text colors, with safe defaults.
- Logo-based extraction proposes colors rather than silently applying inaccessible combinations; allow selection/override and enforce readable contrast in key UI elements.
- Preview updates immediately.

### Step 4 — Photographs
- Display the template's named image slots **one by one** in the right sidebar (e.g., hero image, sponsor visibility evidence, event/gallery photograph). The template should define a small manageable number of slots.
- Upload an image into each slot; skip optional slots.
- Provide **crop, zoom, and reposition** inside that slot's predetermined aspect ratio; store crop/focal-position metadata. No filters, brightness, or contrast tools in the MVP.
- Clicking an image in the live preview selects the corresponding sidebar slot for re-cropping or replacement. The sidebar also provides Remove/Replace controls.
- The published renderer never displays blank photo placeholders; unused optional image sections are hidden gracefully.

### Step 5 — Text and impact content
- Show each pre-populated template text block in order. Examples: hero heading, personal thank-you note, event narrative, sponsorship benefits/evidence description, and closing message.
- Students can edit **the full text of each block**, not the physical placement of the block.
- Offer a basic rich-text toolbar: **4–5 curated font families, font size, bold, italic, underline, text color, and text alignment**. Support inline formatting where feasible; at minimum preserve block-level styling reliably. Use a bounded editor, not a full document-layout application.
- Clicking a text block in the preview focuses its corresponding editor control in the sidebar.
- Allow adding relevant sponsor-specific metrics (label + value + optional context) and optionally selecting available event-level metrics. Do not presume attendance must appear.
- Provide clear copy suggestions/defaults without making AI generation necessary. All content remains user-editable.
- Validate/sanitize edited rich text before rendering publicly.

### Step 6 — Renewal call to action (CTA)
- Populate a standard “Looking forward to next year” section from the event default, with an optional sponsor-specific override.
- User may edit CTA heading, supporting text, button text, and a **destination HTTPS link** (such as a Google Form, inquiry form, or existing organization contact page).
- The suggested early-renewal message may mention future-year perks **only if authorized by the organization**. Never invent or guarantee future benefits.
- No native checkout or lead-capture flow is required in the MVP. The CTA opens the provided external link.

### Step 7 — Finish, URL, and publish
- Clicking **Next** after completing the content steps opens a final review/publishing panel.
- Auto-suggest a sponsor URL slug from the sponsor name; allow editing the slug before initial publication.
- Public URL format: `https://<app-domain>/<event-slug>/<sponsor-slug>`; e.g., `/berkeley-open/local-restaurant`.
- Check slug validity and uniqueness within the event before publishing; show the complete URL.
- Provide final preview, **Publish**, and **Copy Link** once published.
- Publish only when minimally required information exists: event, sponsor name, template, valid slug, and CTA link if the CTA button is enabled. Missing optional metrics/photos should not block publication.
- On publication, persist an **immutable published snapshot** (or equivalent versioned published content) separate from the mutable draft. Public URL renders the published snapshot, never partial edits.
- For a published site, **Edit** shows a warning that changes create an unpublished draft while the existing live site remains accessible; **Republish** replaces the live snapshot at the same URL.
- If a published slug must change later, warn about old links and, if implemented, redirect the old path; for the MVP, prefer locking the public slug after first publication unless an explicit redirect feature exists.

## 7. Initial website template: required content slots

The first template should be visually polished, responsive, and intentionally **scroll-driven**. Simple section-reveal/fade-in effects may be used if they don't block mobile access or reduced-motion users.

Suggested fixed section order (builder may refine visual composition without changing the workflow):

1. **Hero:** Event name + sponsor name/logo + personalized headline + strong event/sponsor image.
2. **Thank-you narrative:** Short personalized message explaining the partnership.
3. **Impact / highlights:** Optional verified sponsor-specific metrics and any event metrics explicitly selected for inclusion.
4. **Proof in pictures:** Sponsor logo on poster, booth or signage photos, and other genuine evidence with short contextual captions.
5. **Closing appreciation:** Additional editable recognition copy.
6. **Renewal CTA:** “Looking forward to next year” / configurable text and button linking to the organization's chosen conversion method.

Every content slot has an editable value and style metadata, but its placement is governed by the template. Omit empty optional sections in published output. Use responsive layouts, accessible color contrast, alt-text options for uploaded images, and no fabricated numbers.

## 8. Publishing, draft versioning, and statuses

### Sponsor states
- **Draft:** No published version exists. Save/preview allowed; public URL not yet active.
- **Published:** A live published snapshot exists at the sponsor's public URL.
- **Published + unpublished edits:** A live snapshot exists while the administrator changes a separate draft. Public visitors keep seeing the last published version until Republish.

### Required actions
- **Save Draft:** Persist the editing state without publishing.
- **Preview:** Render current draft in a viewing mode for the admin, even when incomplete; do not expose a public draft URL.
- **Publish / Republish:** Atomically update the public snapshot after validation.
- **Copy Public URL:** Available after successful publish.

### Safeguards
- Navigating away should not silently lose modifications; prefer autosave with a clear saving indicator and an explicit Save Draft button. Warn on pending unsaved changes.
- Publishing shows clear success/failure feedback.
- Published pages remain publicly accessible without login; internal draft and editor require authentication.
- There is no implicit unpublish action when editing. Manual unpublishing can be deferred unless essential.

## 9. Technical stack and architecture

**Agreed stack:**
- **Next.js (React + TypeScript):** App framework, internal dashboard/editor, server functions/routes, dynamic public report pages.
- **Vercel:** Deploy and host the Next.js application and public sponsor URLs. Each sponsor page is dynamically rendered from stored data; do **not** create or deploy a separate project for every sponsor.
- **Supabase Postgres:** Organizations, events, sponsor records, templates/structured page content, and publication/version metadata.
- **Supabase Auth:** Initial single administrator login and authenticated editing operations.
- **Supabase Storage:** Sponsor logos, event covers, and sponsor photographs.
- **CSS / design system:** Tailwind CSS is an implementation recommendation for rapid responsive UI, not a requirement of the user workflow.

**Hosting note:** Vercel is feasible for a small MVP. Before real deployment, check applicable Vercel plan/usage limits and commercial-use terms, Supabase free-tier limits, and public asset bandwidth. Avoid promising the application will remain free at any scale.

### Suggested routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/login` | Public | Administrator sign-in |
| `/dashboard` | Admin | Organization event cards |
| `/dashboard/events/new` | Admin | Create event |
| `/dashboard/events/[eventId]` | Admin | Sponsor card grid |
| `/dashboard/events/[eventId]/sponsors/[sponsorId]` | Admin | In-app sponsor viewer |
| `/dashboard/events/[eventId]/sponsors/[sponsorId]/edit` | Admin | Guided editor |
| `/[eventSlug]/[sponsorSlug]` | Public, published only | Sponsor-facing website |

The builder may consolidate admin routes if implementation is simpler, while retaining the described user-facing navigation.

### Suggested minimal data model

**organizations** — `id`, `name`, `admin_user_id`, `logo_path?`, `brand_colors`, timestamps.

**events** — `id`, `organization_id`, `title`, `slug`, `date?`, `description?`, `cover_image_path?`, `event_logo_path?`, `brand_colors`, `metrics_json`, `default_cta_json`, timestamps.

**sponsors** — `id`, `event_id`, `name`, `slug`, `logo_path?`, `template_key`, `draft_content_json`, `published_content_json?`, `published_at?`, `draft_updated_at`, `published_version?`, timestamps. A separate versions table is optional for this short MVP.

**media** (optional separate table) — `id`, `event_id`, `sponsor_id?`, `storage_path`, `alt_text?`, `crop_json?`, timestamps. Could instead store vetted paths and crop parameters within structured content JSON for speed.

**Template contract** — Each template declares its fixed section IDs, named photo slots/aspect ratios, editable text blocks, available metrics, allowed styles, and default values. Sponsor content should be **template-independent enough** that selecting a future template reuses sponsor data rather than erasing it.

### Security and operational requirements
- Enforce organization ownership with Supabase Row Level Security (RLS) or equivalent server-side authorization on **all admin reads/writes**; never rely on hidden frontend controls.
- Public endpoints expose **published report content only**, not drafts, admin notes, or raw organization records.
- Validate file type/size; support JPG, PNG, and WebP uploads. Use authenticated uploads and safe storage paths; read permissions for published media must allow public report rendering.
- Sanitize rich text; validate external CTA URLs as HTTPS URLs; avoid unsafe HTML injection.
- Handle loading, failures, empty states, duplicate slugs, and image upload failures gracefully.
- Do not collect attendee personal information or handle payments in the initial build.
- Use environment variables for Supabase/Vercel secrets; never place service-role keys in browser code.

## 10. Priorities and build phases

### P0 — First build (six-hour target)
- One admin can log in to an organization workspace.
- Event card dashboard with Add Event and event creation/editing of core fields.
- Event sponsor card dashboard with Add Sponsor, Draft/Published labels, edit pencil at top-left.
- One polished fixed report template and guided sidebar/live-preview creation flow.
- Sponsor name/logo, event/sponsor colors, photo upload + crop/zoom/reposition, editable text blocks with basic styling, optional metrics, and configurable renewal CTA.
- Save Draft, in-app draft preview, editable public slug, Publish/Republish, shareable public URL.
- Published snapshot remains live while an unpublished draft is edited.
- Basic responsiveness, data persistence, auth, authorization, upload validation.

### P1 — Next iteration (tomorrow or after MVP)
- Add 1–2 genuinely different templates using the same structured content contract.
- Improve interaction polish, animations, accessibility, empty-state UX, and richer inline text formatting if not fully achieved in P0.
- Improve palette extraction/cropping precision if basic tools prove cumbersome.
- Optional bulk publish or duplicate-sponsor-content efficiency features after testing.

### P2 — Only if justified by user feedback
- Multiple team member accounts and permission roles.
- Bulk sponsor imports and batch report management.
- Sponsor page views / CTA click counts (clearly distinguish clicks from renewal commitments).
- Email sending/integrations, native renewal forms, more advanced branding or custom domains.
- AI-assisted text drafting with verification/editing before publication.

## 11. Acceptance criteria and test scenarios

1. **Navigation:** Logged-in admin sees event cards, clicks one, sees sponsor cards, and can create a new event/sponsor using the expected top-right buttons.
2. **Card state:** Newly added sponsor is a Draft. After publication it is Published. A pencil at each card's top-left opens the editor.
3. **View vs. edit:** Clicking a card body opens a report view; clicking its pencil opens editing. Draft views are visibly labeled not public.
4. **Guided creation:** New sponsor editor opens with right-sidebar template selection and left live preview. Back/Next works; each step has clear guidance.
5. **Photo manipulation:** A student can upload, crop, zoom, reposition, replace, or remove a photo without changing its template slot location.
6. **Text manipulation:** A student can edit preset copy and apply available text styling without moving the text block or corrupting the page layout.
7. **Shared data:** One event metric can be reused on two sponsor drafts, but a sponsor-specific metric stays specific to that sponsor; no event metric is forced into the report.
8. **Color selection:** Event colors, extracted-logo palette, and manual colors can be selected and previewed.
9. **Draft persistence:** Save Draft, reload, and resume work without losing information.
10. **Publish:** A complete sponsor page receives a unique public URL with editable pre-publication slug and remains accessible without sign-in.
11. **Published edit safety:** Editing published content does **not** replace the public site until Republish. The same public URL then displays the revised snapshot.
12. **CTA:** The final section displays a valid organizer-configured renewal invitation and opens its external link.
13. **Multiple sponsors:** Two sponsors under the same event display shared event data and different logo/colors/photos/text at separate URLs.
14. **Security:** Unauthenticated visitors cannot read drafts or access internal admin routes; organization-specific records are protected server-side.
15. **Responsive:** Published website and editor are usable on typical desktop/mobile viewports; reduced-motion settings do not block content.

**Minimum end-to-end demo:** Admin login → create Berkeley Open event → add two sponsor drafts → customize template/branding/images/text → preview both → publish first sponsor and copy its URL → edit that published report while its old public version remains online → republish and observe the update.

## 12. Success metrics and validation plan

**MVP North Star / primary test metric:** **Median time to create and publish one personalized sponsor report**, measured after common event data has been entered. Supplement with **total time to generate five reports** to capture the batch-personalization advantage.

Secondary checks: number of reports successfully published, percentage of test users who complete the task unaided, and usability errors per workflow. A later business outcome would be renewal inquiries/commitments, but a six-hour prototype cannot establish causal improvement in sponsorship renewal rates.

To test differentiation, ask real student organization officers to produce equivalent reports using SponsorStory versus their preferred existing tool (e.g., a general-purpose website builder + AI), controlling for the same information and image assets. Measure actual time and mistakes, not assumed speedups. Observe at least two target users if feasible, document what they struggled with, and iterate at least once based on observation. Do not label imagined reports or simulated CTA clicks as real sponsor engagement.

## 13. Implementation guidance for the two builder agents

**Builder Agent A — Frontend and user experience**
- Organization/event/sponsor card dashboards and navigation.
- Guided wizard sidebar, live report preview, template renderer, color controls, text-block editing, image crop/zoom/reposition UI, mobile responsiveness.
- Draft/view/published UI states and polished public report page.

**Builder Agent B — Backend and publication architecture**
- Supabase schema, migrations, auth and RLS, storage configuration and safe uploads.
- Event/sponsor CRUD, structured content persistence, immutable published snapshots, route slug checking, public report data-loading, CTA URL validation.
- Integration tests for draft/public separation and slug uniqueness.

**Product owner (Franxio)**
- Approve the initial template and visual hierarchy; provide real or sample event data and permission-cleared photos.
- Test full user journey, prioritize cut lines, coordinate integration, record usability feedback, and prepare the capstone demo/story.

**Build strategy:** Agree first on shared schema, template block IDs, public route format, and save/publish API contracts. Both agents work against those same contracts. Favor a smaller working end-to-end flow over visually polished disconnected screens.

## 14. Open implementation decisions (builder defaults, not new user requirements)

These are technical defaults for expedience, not unresolved product strategy questions:
- Use email/password or magic-link login depending on the quickest reliable Supabase Auth setup.
- Start with three to five named photo slots and a small number of rich-text blocks; allow unused optional slots to disappear.
- Use browser-based crop/zoom/focal-point metadata rather than generating many derivative images, provided public rendering is reliable.
- Maintain explicit Save Draft plus clear save feedback; lightweight autosave is desirable but must not delay the end-to-end MVP.
- Build one excellent template before adding more template thumbnails/options.
- Use a reasonable responsive screen split on desktop and a preview/edit switch on mobile.
- Do not add feature creep (analytics, email, payment, CRM) merely because infrastructure makes it possible.

---

## Appendix A — Full original sample workflow (verbatim from product owner)

> I sign into my organizations page, and in the home page I see all our events as cards wit the event title and a small picture. Top right has an "Add event" button
>
> I click into one of the events and it takes me to a very similar home page, but instead of seeing the event cards I now see sponsor cards for all the different event sponsors, top right has an "Add sponsor" button. Completed sponsor cards are marked as published. Incomplete ones as drafts. at the top left of each card is a pencil button, clicking it allows me to edit the sponsor website. If I do so for a published website it warns me that editing will unpublish it.
>
> Clicking into a completed sponsor card takes me to their finished website and I see what a sponsor would see.
>
> Clicking into a draft takes me to an incomplete version of the same thing
>
> If I click "Add a sponsor" it creates a new card. Clicking it opens a similar viewing page as the two above, but with a side bar that prompts me to choose a template. I can click through the different templates and the viewing window on the left shows me what the templates look like as I cycle. After selecting a template the side bar prompts me to upload the sponsor logo, after that it prompts me to choose a color palette, with the option to do so manually, but also buttons to "select from sponsor logo" or "use event colors" or something like that. After that it prompts me to upload the pictures one by one, with the option to adjust the framing after uploading it. If I want to go back and fix one, all I have to do is click on it to edit the framing or x it out and upload a new one. All this is done in the right bar, with the left window just for viewing. After that we get to the text, which is very similar to the pictures. the template has some already populated text, but I have full control to edit the text copy and style for each block, but not to move where the text is placed. That does mean that we are going to need a very basic text editor with a few different fonts, the option to go bold, italic, etc. and select text color. Once I've uploaded my pictures and text, the website is almost done, and I just get to the bottom CTA which is populated with what we already discussed and all I do is add a link to whatever conversion method I'd like to use (Google Form, whatever).
>
> Once I'm done with everything, I click Next, which gives me the url, which if possible I would like to be able to edit and publish, which publishes the website and gives me the share link.

### Clarifications that supersede part of the original wording

- **Published-site editing:** The original wording suggested that editing immediately unpublishes a site. The later approved decision is **to keep the current published version live while editing an unpublished draft**, then republish to the same URL.
- **Templates:** The eventual workflow allows cycling through different designs, but **today's MVP includes one template**. Additional layouts are planned for a subsequent iteration.
- **Event-wide information:** An event may have metrics, branding, and shared information; no shared gallery is required, and attendance is **not automatically required or displayed**.
- **Creation guidance:** The right-hand wizard must feel strongly guided for students and remain the main design priority.
- **Image scope:** Crop, zoom, and reposition only in the MVP.
- **Accounts:** One organization administrator initially, rather than full multi-member access.
- **Draft controls:** Save Draft and Preview remain available throughout editing.
- **URL customization:** Users edit the sponsor path slug, not the base hosted domain.

## Appendix B — Scope guardrail for builder agents

If time becomes constrained, preserve the minimum core loop in this order: **signed-in event dashboard → sponsor creation → guided content entry with working live preview → durable draft save → public shareable publish link → existing published page remains live during edits**. Simplify photo controls, rich-text options, and visual effects before compromising that loop. A simulated login or fake publication flow does **not** meet the intended product requirement unless explicitly identified as a prototype limitation.
