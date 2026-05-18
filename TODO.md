# GD Crush Next-Stage TODO Backlog

> This backlog replaces the original phase-by-phase build list.  
> The project has already reached a functional MVP shape, so the next stage should prioritize:
>
> 1. hardening the existing system,
> 2. deepening the core product loop,
> 3. then adding polish, retention, and release-readiness work.
>
> Priorities:
>
> - `P0` = required before external trial use
> - `P1` = core value / product depth
> - `P2` = polish, retention, and scale-up work

## Milestone 1: From Demo MVP to Trustworthy MVP

### [P0] M1.1 Replace `dev-store` with database-backed repositories for core flows

Status: Completed on 2026-05-18

Dependencies: Existing Drizzle schema and migrations

Scope:

- Add real database-backed persistence for:
  - `crush_profiles`
  - `onboarding_materials`
  - `ai_profile_drafts`
  - `visual_assets`
  - `voice_profiles`
  - `chat_sessions`
  - `messages`
  - `practice_runs`
  - `real_actions`
  - `profile_update_suggestions`
  - `memories`
- Refactor `lib/repositories.ts` so that configured database environments use database-backed implementations for the full core flow.
- Keep `dev-store` only as a local fallback path where intentionally needed.
- Align dev-store and database behavior so business logic does not silently diverge.

Acceptance:

- With `DATABASE_URL` configured, the full happy path no longer depends on `.data/dev-store.json`.
- Crush creation, onboarding, chat, practice, actions, feedback, and memories all persist in the database.
- The core flow still works in local fallback mode.
- Database mode and fallback mode produce equivalent observable behavior.

### [P0] M1.2 Add ownership and authorization checks to all ID-based APIs

Status: Completed on 2026-05-18

Dependencies: M1.1

Scope:

- Add current-user ownership checks for:
  - `draftId`
  - `sessionId`
  - `actionId`
  - `suggestionId`
  - `practiceRunId`
  - memory-related `sourceId`
- Audit all route handlers that accept user-controlled IDs.
- Extract shared ownership helpers instead of duplicating ad hoc route logic.
- Define a consistent response policy for unauthorized or non-owned resources.

Acceptance:

- A user cannot read, mutate, confirm, or delete another user's resources.
- Draft, action, suggestion, and simulation-session access are covered by authorization tests.
- Unauthorized access behavior is consistent across routes.

### [P0] M1.3 Complete production-grade Crush destroy flow

Status: Completed on 2026-05-18

Dependencies: M1.1, M1.2

Scope:

- Upgrade the current destroy flow from the dev-store implementation to the real database path.
- Delete or intentionally tombstone all Crush-related data:
  - profile
  - traits
  - metrics
  - materials
  - drafts
  - visual assets
  - sessions and messages
  - practice runs
  - actions
  - suggestions
  - memories
- Delete associated stored assets:
  - generated visual assets
  - retained reference files if any remain
  - generated speech assets
- Preserve only the minimal non-sensitive audit trail required by product policy.

Acceptance:

- After destroy, the user returns to the unconfigured state in the UI.
- All intended database records are removed or tombstoned according to design.
- Associated storage assets are removed.
- Partial failure modes are handled so database and storage do not silently drift apart.

### [P0] M1.4 Add strict schema validation for AI outputs

Status: Completed on 2026-05-18

Dependencies: None

Scope:

- Add `zod` schemas for:
  - profile analysis
  - quick-line analysis
  - coach analysis
  - reality-feedback extraction
  - visual-tag extraction
- Validate provider outputs before returning them to the UI or writing them into storage.
- Add safe fallback, retry, or explicit failure paths for malformed provider responses.

Acceptance:

- Invalid AI JSON never gets persisted as trusted product data.
- Missing keys, invalid enums, and wrong field types are rejected safely.
- Key AI flows include regression coverage for malformed provider responses.

### [P0] M1.5 Add integration tests for golden paths

Status: Completed on 2026-05-18

Dependencies: M1.1, M1.2, M1.3, M1.4

Scope:

- Add integration coverage for:
  1. age confirmation
  2. Crush creation
  3. onboarding material submission
  4. AI draft generation
  5. draft confirmation
  6. visual generation
  7. companion chat
  8. quick-line practice
  9. action creation
  10. action feedback and suggestion creation
  11. suggestion resolution
  12. Crush destroy
- Add critical failure-path coverage for:
  - unauthorized access
  - invalid AI output
  - invalid uploads
  - destroy failures

Acceptance:

- The main user journey can be verified with one repeatable automated suite.
- At least one full happy path and five meaningful failure paths are covered.
- The suite is stable enough to run in CI.

### [P0] M1.6 Normalize asset retention and deletion lifecycle

Status: Completed on 2026-05-18

Dependencies: M1.1, M1.3

Scope:

- Define lifecycle rules for:
  - reference images
  - temporary speech inputs
  - generated visual assets
  - generated TTS outputs
- Clarify for each asset type:
  - when it is written
  - when it is deleted
  - whether it is public or temporary
  - which audit events are required
- Ensure local storage and R2 storage follow equivalent rules.
- Add retry or compensating cleanup where failure can leave residue behind.

Acceptance:

- Reference images can be verified as deleted after generation completes.
- STT temporary audio can be verified as deleted after transcription completes.
- Destroy removes all related persisted public assets.
- Product copy about retention matches actual behavior.

### [P0] M1.7 Standardize API errors, empty states, and loading behavior

Status: Completed on 2026-05-18

Dependencies: None

Scope:

- Standardize API error response shape.
- Add explicit loading, empty, error, and retry states to:
  - onboarding
  - chat
  - practice
  - actions
  - profile
  - memories
- Remove frontend assumptions that API requests always succeed.

Acceptance:

- Main pages remain understandable in loading, empty, and failure states.
- Users get actionable messages rather than silent failure or broken UI.
- API error handling is consistent enough for frontend reuse.

## Milestone 2: Deepen the Core Product Loop

### [P1] M2.1 Make full simulation truly AI-driven and multi-turn

Dependencies: M1.4

Scope:

- Replace the current rule-based simulation path with real AI-driven multi-turn simulation.
- Preserve separate Crush and Coach roles.
- Inject relevant context:
  - Crush profile
  - current relationship stage
  - interaction temperature
  - practice goal
  - recent conversation history
- Produce structured recap output at the end of the run.

Acceptance:

- Full simulation no longer primarily depends on hardcoded mock replies.
- Multi-turn sessions preserve context across turns.
- The final recap can directly feed a recommended real-world action.

### [P1] M2.2 Unify coach-analysis contract across practice modes

Dependencies: M2.1

Scope:

- Standardize quick-line and full-simulation outputs around:
  - risk level
  - possible feeling
  - main risk
  - suggested line
  - recommended timing
  - should send / next move
- Refactor the frontend to consume a shared contract where possible.

Acceptance:

- Both practice modes expose a consistent mental model to the user.
- Recap UI can be reused across practice flows.
- New scenarios do not require inventing a new analysis schema each time.

### [P1] M2.3 Upgrade reality-feedback extraction

Dependencies: M1.4, M2.2

Scope:

- Replace status-only feedback heuristics with structured AI extraction.
- Extract:
  - confirmed facts
  - relationship signals
  - likely stage change
  - next-step recommendation
  - confidence
- Expand action feedback states:
  - not sent
  - sent
  - positive response
  - neutral response
  - cold response
  - do not advance
- Keep free-text feedback as a first-class input.

Acceptance:

- User feedback can produce meaningful update suggestions grounded in observed reality.
- Facts and inferences remain clearly separated.
- Feedback materially influences later profile understanding and recommendations.

### [P1] M2.4 Make the intel card editable by the user

Dependencies: M1.1

Scope:

- Allow users to:
  - add facts
  - edit facts
  - remove incorrect items
  - update relationship stage manually
- Surface the distinction between:
  - user-entered facts
  - AI inferences
  - reality-feedback-derived updates

Acceptance:

- Users can correct inaccurate Crush information without starting over.
- Profile changes persist and influence later AI context.
- The intel card becomes an active source of truth instead of a read-only report.

### [P1] M2.5 Add provenance and confidence to profile traits

Dependencies: M2.3, M2.4

Scope:

- Display and persist:
  - source
  - confidence
  - confirmation status
  - last updated time
- Add trait merge / dedupe behavior so the same fact is not endlessly duplicated.
- Define how AI suggestions update existing traits versus creating new ones.

Acceptance:

- Users can understand where a given profile item came from.
- AI-generated inferences and confirmed facts are visibly distinct.
- Duplicate traits are minimized.

### [P1] M2.6 Add granular editing to AI draft review

Dependencies: M1.4, M2.5

Scope:

- Let users:
  - accept individual rows
  - reject individual rows
  - edit text inline
  - revise recommended stage
  - revise interaction temperature
- Ensure rejected or unconfirmed items are not written to the formal profile.

Acceptance:

- Draft review is no longer all-or-nothing.
- The implementation matches the PRD intent that AI suggestions require user confirmation.
- Users retain clear control over what enters the profile.

### [P1] M2.7 Rework growth metric update rules

Dependencies: M2.3, M2.5

Scope:

- Define explicit update rules for:
  - virtual intimacy
  - communication confidence
  - relationship understanding
  - emotional stability
- Separate virtual interaction gains from reality-grounded gains.
- Add user-facing explanations for meaningful metric changes.

Acceptance:

- Metric changes are explainable and product-legible.
- Metrics do not simply increase because the user clicked around.
- Reality-driven updates have visibly different weight from virtual interaction updates.

### [P1] M2.8 Turn Actions into a full feedback workbench

Dependencies: M2.3, M2.7

Scope:

- Expand the Actions experience with:
  - richer state machine
  - editable feedback text
  - feedback timestamp
  - linked practice run
  - linked update suggestion
- Let users move naturally from practice → action → feedback → profile update.

Acceptance:

- Actions becomes the primary place to manage real-world follow-through.
- Users can review how a recommendation originated and what happened afterward.
- The full behavioral loop is visible in one product area.

## Milestone 3: Product Polish, Retention, and Release Readiness

### [P2] M3.1 Build voice style picker UI

Dependencies: Existing voice profile model

Scope:

- Add UI controls for:
  - voice style
  - speed
  - emotion intensity
  - age style
- Wire these settings into TTS generation.
- Preserve distinct playback behavior for companion mode and practice mode.

Acceptance:

- Users can configure voice behavior from the product UI.
- Later TTS requests reflect saved preferences.
- Settings are persisted and rendered correctly after refresh.

### [P2] M3.2 Surface scene generation in the product UI

Dependencies: Existing scene generation API

Scope:

- Add a visible product entry point for scene generation.
- Define where scenes are used:
  - visual theme setup
  - memories
  - future narrative surfaces
- Let users actually view generated scenes inside the product.

Acceptance:

- Scene generation is no longer only an unused backend capability.
- A user can generate and see a scene asset from within the app.

### [P2] M3.3 Expand memories beyond chat favorites

Dependencies: M2.8

Scope:

- Support multiple memory sources:
  - chat favorites
  - completed actions
  - scenario moments
  - milestone changes
- Add lightweight categorization and timeline behavior.

Acceptance:

- Memories reflect more than saved chat quotes.
- Different memory sources are visually or semantically distinguishable.

### [P2] M3.4 Improve dashboard into a next-best-action homepage

Dependencies: M2.7, M2.8

Scope:

- Add dynamic modules for:
  - next recommendation
  - pending action
  - pending profile suggestion
  - recent growth explanation
- Reduce the current static dashboard feel.

Acceptance:

- Users can open the dashboard and immediately understand what to do next.
- The dashboard reflects product learning, not only stored values.

### [P2] M3.5 Run a mobile visual QA and interaction polish pass

Dependencies: Core UI stabilized

Scope:

- Review:
  - mobile layout breakpoints
  - keyboard overlap
  - long-text wrapping
  - bottom nav collisions
  - tap target sizes
  - modal / recording / upload interactions
- Fix the highest-impact friction across the primary flows.

Acceptance:

- Main flows work cleanly on common mobile widths.
- No critical page is blocked by keyboard, overflow, or control overlap.

### [P2] M3.6 Add analytics, observability, and AI cost tracking

Dependencies: Core flows stabilized

Scope:

- Track:
  - onboarding completion
  - chat engagement
  - practice usage
  - action conversion
  - feedback completion
  - AI latency and failures
  - image and voice generation costs
- Add a minimally usable way to inspect these metrics.

Acceptance:

- The team can answer:
  - where users drop off
  - which AI calls are expensive
  - which routes fail most often

### [P2] M3.7 Add formal authentication and account recovery

Dependencies: M1.1; external testing readiness

Scope:

- Replace anonymous cookie identity with a real account system.
- Support:
  - sign-in
  - account recovery
  - cross-device persistence
- Define migration from anonymous users to formal accounts.

Acceptance:

- Users can recover their data across sessions and devices.
- Long-term identity no longer depends on a single browser cookie.

## Suggested Linear Labels

- `area: data`
- `area: auth`
- `area: ai`
- `area: voice`
- `area: visual`
- `area: ux`
- `area: privacy`
- `type: infra`
- `type: product`
- `type: testing`
- `milestone: hardening`
- `milestone: core-loop`
- `milestone: polish`

## Recommended Execution Order

1. `M1.1` Database-backed repositories
2. `M1.2` Ownership checks
3. `M1.3` Production destroy flow
4. `M1.4` AI schema validation
5. `M1.5` Golden-path integration tests
6. `M2.1` AI-driven full simulation
7. `M2.3` Reality-feedback extraction
8. `M2.4` Editable intel card
9. `M2.7` Growth metric redesign
10. `M2.8` Actions feedback workbench

## Near-Term Definition of Done

The project should be considered ready for external trial use when:

1. all critical user data persists correctly outside dev-store,
2. ownership checks protect every ID-based mutation path,
3. AI-generated structure is validated before use,
4. the main loop can be covered by stable integration tests,
5. user feedback changes later profile understanding in a transparent way.
