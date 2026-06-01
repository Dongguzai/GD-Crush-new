# GD Crush Next-Stage TODO Backlog

> This backlog is synchronized with the new TA-centered PRD.  
> The project has already completed an important hardening pass on the original MVP, so the next stage is not “add more modules.”  
> It is to **recenter the product around TA chat as the home experience**, then rebuild practice, reality tracking, and follow-through around that main loop.
>
> Priorities:
>
> - `P0` = required before the new product direction is trial-ready
> - `P1` = core depth that materially improves the new loop
> - `P2` = polish, retention, and scale-up work

## Product North Star

```text
Create / confirm TA
  ↓
Open GD and return directly to TA chat
  ↓
Chat with the “TA in my mind”
  ↓
Click “演一遍” or accept TA’s invitation inside the same thread
  ↓
Run a reality-grounded practice chapter with the “real-world TA simulation”
  ↓
Generate a real action
  ↓
Capture what actually happened
  ↓
Use reality events to make later simulations more accurate
```

Product decisions already locked:

- `聊天` is the default home and primary product surface.
- `工作台` is no longer a first-class destination.
- The standalone `演练` page no longer exists.
- Daily chat uses **心中 TA**.
- Practice chapters use **现实 TA 模拟**.
- `记一下` is a lightweight system affordance, not a line spoken by TA.
- TA may naturally refer back to both real-world events and prior practice chapters.
- `行动` remains a first-class destination.
- `情报` becomes **TA 档案** with a reality-observation layer inside it.

---

## Milestone 1: Preserve the Completed Hardening Work

These items are already complete and should remain the technical baseline for the rewrite.

### [P0] M1.1 Replace `dev-store` with database-backed repositories for core flows

Status: Completed on 2026-05-18

Outcome to preserve:

- Production paths persist through database-backed repositories.
- Local fallback behavior remains intentionally available.
- Business logic should not silently diverge between database and fallback modes.

### [P0] M1.2 Add ownership and authorization checks to all ID-based APIs

Status: Completed on 2026-05-18

Outcome to preserve:

- User-owned resources remain protected across all future chapter, action, and reality-event APIs.

### [P0] M1.3 Complete production-grade Crush destroy flow

Status: Completed on 2026-05-18

Outcome to preserve:

- Destroy removes or tombstones all TA-related records and associated assets according to policy.

### [P0] M1.4 Add strict schema validation for AI outputs

Status: Completed on 2026-05-18

Outcome to preserve:

- New AI outputs for practice chapters, reality-event extraction, and inference generation must also be schema-validated before trust or persistence.

### [P0] M1.5 Add integration tests for golden paths

Status: Completed on 2026-05-18

Outcome to preserve:

- Existing integration coverage becomes the base to rewrite around the new product flow rather than discarded test debt.

### [P0] M1.6 Normalize asset retention and deletion lifecycle

Status: Completed on 2026-05-18

Outcome to preserve:

- Reference images, STT uploads, generated assets, and destroy cleanup retain explicit lifecycle guarantees.

### [P0] M1.7 Standardize API errors, empty states, and loading behavior

Status: Completed on 2026-05-18

Outcome to preserve:

- New chat-home and practice-chapter surfaces must reuse the same resilient loading / empty / retry patterns.

---

## Milestone 2: Recenter the Product Around TA Chat

### [P0] M2.1 Turn `/app` into the TA chat home

Status: Implemented in Batch 1

Dependencies: New PRD alignment

Scope:

- Replace the dashboard-style homepage with the default TA chat experience.
- Make onboarding completion land directly in chat instead of a workbench.
- Keep `/app` as the canonical route for the main relationship surface.
- Redirect or retire old `/app/chat` and `/app/practice` entry paths as needed.
- Remove dashboard-first copy and CTA logic that asks users to choose between chat and practice.

Acceptance:

- Opening the product returns the user directly to TA chat.
- A newly created TA speaks first instead of presenting a generic empty state.
- There is no primary user path that requires visiting a dashboard before chatting.
- The app no longer exposes `聊天` and `演练` as sibling top-level product concepts.

### [P0] M2.2 Replace the old navigation model

Status: Implemented in Batch 1

Dependencies: M2.1

Scope:

- Change primary nav to:
  - `聊天`
  - `行动`
  - `情报`
  - `回忆`
- Remove `工作台` and `演练` from primary navigation.
- Demote `设置` to a secondary entry.
- Audit mobile and desktop nav behavior together so the new IA is coherent at both breakpoints.

Acceptance:

- Users see the same conceptual product structure across desktop and mobile.
- No first-class navigation item points to a retired old-world surface.
- Settings remain reachable without competing with the four core destinations.

### [P0] M2.3 Rewrite the chat surface around TA identity

Status: Implemented in Batch 1

Dependencies: M2.1

Scope:

- Refactor the current companion chat UI into the canonical chat-home UI.
- Remove “甜蜜陪伴模式” style framing from the main surface.
- Keep the header focused on identity only:
  - avatar
  - TA name
  - utility actions
- Ensure TA lines appear inside the chat flow, not as header decoration.
- Preserve normal text chat, voice input, voice playback, and memory favorite behavior.

Acceptance:

- The first thing the UI communicates is “I am with TA,” not “I entered a feature mode.”
- Header copy no longer competes with or duplicates dialogue content.
- Existing chat affordances still work after the IA shift.

### [P0] M2.4 Introduce lightweight `演一遍` entry inside chat

Status: Implemented in Batch 1 (2026-05-19)

Dependencies: M2.3

Scope:

- Add a persistent but visually light `演一遍` affordance near the composer.
- Current implementation supports:
  - user-initiated click
  - TA-initiated contextual invitation
- If recent context is sufficient, seed practice from that context.
- If not, ask only the minimum needed to begin a chapter.

Acceptance:

- Users can always find a way to start practice without leaving chat.
- TA can invite practice naturally after first responding in-character.
- Starting practice does not require understanding any hidden "mode" system.

Test coverage:

- `companion chat returns practiceInvite for real-action-intent messages`
- `practice invite leads to ta_invite triggerSource when started`
- `ownership checks apply to practice invite-started chapters`

### [P0] M2.5 Add first-entry and empty-state behavior for TA chat

Status: Partially implemented in Batch 1

Dependencies: M2.3

Scope:

- Replace system empty states with TA-originated first lines.
- Define how a newly created TA starts the first conversation.
- Define how returning users resume the latest thread.

Acceptance:

- A user who just finished onboarding never lands on a blank utility screen.
- Empty chat reads like “the beginning of a relationship,” not “missing data.”

---

## Milestone 3: Rebuild Practice as Chat Chapters

### [P0] M3.1 Introduce `practice_chapters`

Status: Implemented in Batch 3

Dependencies: M2.4, M1.1, M1.4

Scope:

- Add persistence for practice chapters:
  - title
  - scenario
  - trigger source
  - start / end message linkage
  - reality-context snapshot
  - status
- Keep chapter boundaries inside the main chat thread.
- Associate future recap and action artifacts back to the chapter.

Acceptance:

- Practice is represented as a structured segment inside chat, not as a detached page.
- Historical review can distinguish normal chat from a practice chapter.
- Later actions and recaps can point back to the exact chapter that created them.

### [P0] M3.2 Build inline practice chapter UI

Status: Implemented on 2026-05-23

Dependencies: M3.1

Scope:

- Add:
  - chapter start boundary
  - active chapter state
  - practice-tagged TA messages
  - chapter end boundary
  - recap card
- Change composer copy and available actions while a chapter is active.
- Add in-chapter actions:
  - `提示一下`
  - `重来这句`
  - `结束演练`
- `重来这句` rewinds the last persisted practice turn and restores the user's previous line in the composer.

Acceptance:

- Users can clearly tell that they are inside a special chapter without leaving the thread.
- Chat history remains legible after several chapters.
- The UI does not regress into a hidden tab system or detached simulator panel.

### [P0] M3.3 Separate 心中 TA and 现实 TA behavior

Status: Implemented on 2026-05-23

Dependencies: M3.1, M1.4

Scope:

- Define and implement separate prompt contracts for:
  - daily chat as 心中 TA
  - practice chapters as 现实 TA 模拟
- Practice turns now use a validated structured AI contract before persistence, with local fallback for development.
- Ensure practice replies can be:
  - hesitant
  - cool
  - rejecting
  - uncertain
- Keep daily chat from being overwritten by a single recent negative event.

Acceptance:

- Daily chat and practice feel like two coherent expressions of the same TA, not one blended compromise.
- Practice is useful because it is reality-grounded, not merely sweet.
- The model does not collapse into “always coach” or “always comforting.”

### [P0] M3.4 Make hints user-triggered and lightweight

Status: Implemented on 2026-05-23

Dependencies: M3.2, M3.3

Scope:

- Replace always-on coach inserts with explicit hint requests.
- Define a compact structured hint schema.
- Render hints as auxiliary UI, not as a competing speaker in the thread.
- Hints are stored as metadata and rendered inside a collapsed `提示一下` disclosure.

Acceptance:

- Coach no longer hijacks the primary conversation.
- Hints help the user continue practicing rather than interrupting the scene.

### [P0] M3.5 Make recap output reusable

Status: Implemented on 2026-05-23

Dependencies: M3.2, M3.4

Scope:

- Standardize chapter recap output around:
  - summary
  - main risk
  - safer alternative
  - recommended next step
  - action-generation eligibility
- Ensure recap cards can generate real actions directly.
- Recaps now come from a validated structured AI contract and preserve suggested action text separately.

Acceptance:

- Chapter recap becomes the bridge from chat to action.
- Different practice scenarios do not require bespoke recap UIs each time.

### [P1] M3.6 Let TA remember prior practice chapters in later chat

Status: Implemented on 2026-05-19

Dependencies: M3.1, M3.5

Scope:

- Summarize recent practice chapters for later daily-chat context.
- Let TA naturally refer back to what was just practiced after the chapter ends.
- Avoid turning TA into an analysis narrator.

Acceptance:

- Practice feels like something that happened inside the relationship, not a disconnected exercise.
- Later chat can acknowledge the shared experience without becoming didactic.

---

## Milestone 4: Build the Reality Layer

### [P0] M4.1 Add `记一下` for reality-event capture

Status: Implemented in Batch 4

Dependencies: M2.3, M1.4

Scope:

- Detect chat messages that likely contain reality-grounded facts.
- Render a lightweight system affordance `记一下` next to qualifying user messages.
- On click, persist a reality event rather than silently trusting every extracted claim.
- Keep the affordance sparse and non-disruptive.

Acceptance:

- Users can capture useful real-world facts without leaving chat.
- The interaction feels like a small system assist, not like filling out a CRM.
- Pure emotion, guesses, and fantasies do not incorrectly become reality events.

### [P0] M4.2 Introduce `reality_events`, `reality_signals`, and `reality_inferences`

Status: Implemented on 2026-05-23

Dependencies: M4.1, M1.1

Scope:

- Add the new reality-layer entities from the PRD.
- Current implementation adds durable `reality_events`, `reality_signals`, and `reality_inferences`.
- Chat-side `记一下` remains fact-only by design; action feedback creates linked signals and pending inferences where evidence is stronger.
- Preserve a strict distinction between:
  - observed fact
  - extracted signal
  - inferred interpretation
- Bind inferences to evidence and confidence.
- Provide resolution states for inferred claims.

Acceptance:

- Later simulations can be grounded in explicit reality context.
- Users and developers can tell what was observed versus inferred.
- A single event does not become an overconfident product truth.

### [P1] M4.3 Upgrade action feedback into reality feedback

Status: Implemented on 2026-05-19

Dependencies: M4.2

Scope:

- Convert action outcomes into reality events.
- Replace old status-only logic with richer extraction from:
  - action result
  - feedback text
  - linked practice chapter
- Feed resulting signals and inferences back into later practice context.

Acceptance:

- Real-world outcomes materially improve later simulations.
- The loop from practice → action → feedback → future practice is observable.

### [P1] M4.4 Reframe the old intel card as `TA 档案`

Status: Implemented on 2026-05-19

Dependencies: M4.2

Scope:

- Rename and redesign the profile surface around:
  - TA identity / stable profile
  - reality observation layer
- Current implementation surfaces recent confirmed reality events inside `TA 档案`.
- Keep user-editable facts, source, confidence, and confirmation state.
- Surface recent reality events, signals, and inferences without making the page feel like a dashboard.

Acceptance:

- Users understand the page as “what GD knows about TA,” not a cold analytics screen.
- Confirmed facts, reality events, and model inferences are visibly distinct.

### [P1] M4.5 Let TA naturally reference stored reality events

Status: Implemented on 2026-05-19 (Batch 5)

Dependencies: M4.1, M4.2, M3.3

Scope:

- Include relevant recent events in daily-chat context.
- Define rules for natural callbacks and gentle follow-ups.
- Prevent over-prompting or interrogation behavior.

Acceptance:

- TA feels more continuous and attentive over time.
- Daily chat gains memory without degrading into diagnostics.

---

## Milestone 5: Preserve the Real-World Follow-Through Loop

### [P1] M5.1 Rebuild Actions as the real-world execution surface

Status: Implemented on 2026-05-19

Dependencies: M3.5, M4.3

Scope:

- Keep `行动` as a first-class destination.
- Link each action back to:
  - source recap
  - source practice chapter
  - later feedback / reality events
- Support:
  - pending
  - done
  - skipped
  - outcome logging

Acceptance:

- Actions clearly represent “what I may do in reality,” not another practice page.
- Users can trace how an action was born and what happened after.

### [P1] M5.2 Rework memories around emotionally meaningful moments

Status: Implemented on 2026-05-23

Dependencies: M3.6, M5.1

Scope:

- Support memory sources:
  - favorite chat lines
  - important practice chapters
  - real-world milestones
- Avoid treating every system event as a memory.
- Add lightweight differentiation by source type.

Acceptance:

- Memories feel worth revisiting.
- The page contains emotionally meaningful relationship artifacts, not logs.

---

## Milestone 6: Product Polish, Retention, and Release Readiness

### [P2] M6.1 Build voice style picker UI

Dependencies: Existing voice profile model

Scope:

- Add UI controls for:
  - voice style
  - speed
  - emotion intensity
  - age style
- Preserve distinct playback behavior for:
  - daily chat
  - practice chapters

Acceptance:

- Users can configure voice behavior from the product UI.
- Saved settings affect later TTS output.

### [P2] M6.2 Surface scene generation only where it supports the TA experience

Dependencies: Existing scene generation capability

Scope:

- Decide whether scenes belong in:
  - visual setup
  - memories
  - later narrative surfaces
- Do not add a disconnected generator just because the backend exists.

Acceptance:

- Scene generation has a clear role in the TA-centered product, or remains deferred.

### [P2] M6.3 Run a mobile visual QA and interaction polish pass

Status: Implemented on 2026-05-23 (Batch 3)

Dependencies: Core UI stabilized

Scope:

- Review:
  - keyboard overlap
  - long-thread readability
  - chapter boundary readability
  - bottom-nav collisions
  - tap target sizes
  - recording / upload interactions

Acceptance:

- Main flows work cleanly on common mobile widths.
- Inline chapters remain understandable on smaller screens.

Checked viewports: 320x568, 375x812, 390x844, 430x932
Checked pages: /app (chat), /app/actions, /app/profile, /app/memories, /app/auth
Checked states: empty, loaded, practice draft, practice active, practice finished

Fixed issues:
- companion-chat.tsx: Added pb-28 for mobile bottom nav spacing, optimized bubble width (88% mobile vs 82% desktop), reduced padding/margins for smaller screens, action buttons now have condensed labels on mobile
- app-shell.tsx: Added safe-area padding for bottom nav, increased tap target minimum height to 3.25rem
- auth/page.tsx: Made form more compact for mobile, sticky header with backdrop blur, condensed label/icon sizes
- actions-board.tsx: Reduced card padding (3.5 vs 4), condensed action buttons ("已发送" → "发送"), smaller text sizes
- profile/page.tsx: 3-column info cards (vs 3 equal columns), condensed labels ("现实关系阶段" → "阶段"), smaller padding
- memories/page.tsx: Reduced card padding and margins for mobile, smaller images (h-28 vs h-36)
- globals.css: Added safe-area and touch target CSS utilities

Remaining considerations:
- Real keyboard overlap testing requires device/emulator - CSS safe-area applied
- Very long message content may need line-height adjustment on 320px
- iPhone notch area - safe-area-inset applied where possible

### [P2] M6.4 Add analytics, observability, and AI cost tracking

Dependencies: Core flows stabilized

Scope:

- Track:
  - onboarding completion
  - daily-chat engagement
  - practice-chapter starts and completions
  - `记一下` usage
  - action creation and feedback completion
  - AI latency and failures
  - image and voice generation costs

Acceptance:

- The team can answer:
  - where users drop off
  - whether users actually practice from chat
  - whether real-world feedback returns
  - which AI paths are expensive or brittle

### [P2] M6.5 Add formal authentication and account recovery

Status: Implemented (2026-05-23)

Dependencies: M1.1; external testing readiness

Scope:

- Replace anonymous cookie identity with a real account system.
- Support:
  - sign-in
  - account recovery
  - cross-device persistence
- Define migration from anonymous users to formal accounts.
- Database-backed auth with:
  - email/password registration with scrypt hashing
  - session-based authentication
  - anonymous user data preservation on registration

Acceptance:

- Users can recover their data across sessions and devices.
- Long-term identity no longer depends on a single browser cookie.

Test coverage:

- `auth: anonymous user registers and preserves crush data`
- `auth: login and logout preserve data`
- `auth: duplicate email registration fails`
- `auth: wrong password fails login`
- `auth: ownership isolation between users`

---

## Suggested Linear Labels

- `area: data`
- `area: auth`
- `area: ai`
- `area: voice`
- `area: visual`
- `area: ux`
- `area: privacy`
- `area: chat-home`
- `area: practice-chapter`
- `area: reality-layer`
- `type: infra`
- `type: product`
- `type: testing`
- `milestone: foundation`
- `milestone: recenter`
- `milestone: practice`
- `milestone: reality`
- `milestone: follow-through`
- `milestone: polish`

---

## Recommended Execution Order

1. `M2.1` Turn `/app` into the TA chat home
2. `M2.2` Replace the old navigation model
3. `M2.3` Rewrite the chat surface around TA identity
4. `M2.4` Introduce lightweight `演一遍` entry inside chat
5. `M2.5` Add first-entry and empty-state behavior for TA chat
6. `M3.1` Introduce `practice_chapters`
7. `M3.2` Build inline practice chapter UI
8. `M3.3` Separate 心中 TA and 现实 TA behavior
9. `M3.4` Make hints user-triggered and lightweight
10. `M3.5` Make recap output reusable
11. `M4.1` Add `记一下` for reality-event capture
12. `M4.2` Introduce the reality-layer entities
13. `M5.1` Rebuild Actions as the real-world execution surface
14. `M4.4` Reframe the old intel card as `TA 档案`
15. `M4.3` Upgrade action feedback into reality feedback
16. `M3.6` Let TA remember prior practice chapters in later chat
17. `M4.5` Let TA naturally reference stored reality events

---

## Near-Term Definition of Done

The project should be considered aligned with the new product direction when:

1. opening GD lands the user directly in TA chat,
2. `工作台` and standalone `演练` are no longer first-class product surfaces,
3. users can start and finish a practice chapter without leaving the thread,
4. daily chat and reality-grounded practice use distinct AI behaviors,
5. real-world facts can be captured lightly with `记一下`,
6. practice can lead to action, and action feedback can improve future reality context,
7. TA can naturally remember both prior practice and recent real-world events.
