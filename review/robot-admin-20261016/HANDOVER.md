# Robotic landing and administrator workspace — 16 October 2026

The actual application is running at http://localhost:5186/account. This is the
Next application, not Vite. No business records were created or changed for tests.
No migrations, new secrets, dependencies or provider activation are required.

## Changes
- Full-screen original WebGL2 industrial workcell, navy/teal studio lighting,
  subtle floor seams, shadowing and a vignette. The robot uses fixed link lengths,
  timed gripping and placement, a conveyor and a detailed board.
- Minimal introductory copy and Continue anchor; scroll reveals the translucent
  glass login/customer-registration form over the same scene.
- No brand header on landing/shared login, no pause buttons or technical labels.
  Language switch remains inside the form; recovery and legal links remain.
- Reduced-motion preference stops motion. Unsupported/lost WebGL uses optimized
  desktop/mobile images generated from the original scene. No third-party image
  or watermarked reference is included.
- Separate administration workspace: compact real metrics, selected navigation,
  responsive tables and an honest empty chart when no payments were collected.
- Admin logout revokes the session and opens the shared /account login.

## Verification
See VERIFICATION.json and the current logs in this directory. Browser fixtures
use only the isolated chapa_tronix_test database. Checks cover actual discount
editing and stock changes, customer/staff authorization, logout session revocation,
full-screen hero, scroll-to-glass, mobile layout, motion and WebGL fallback.
The previous access assertion expected a dedicated admin login after logout; it
was replaced with an explicit assertion for the user's requested shared login.
The test still verifies that the revoked admin session receives HTTP 401.

The first build failed with Windows EPERM while creating the generated API types
folder. The retry compiled and passed its TypeScript stage, then failed with EPERM while creating `_global-error.segments/_global-error`. Production build: **Haijathibitishwa**. Re-run in an environment permitting generated directory creation; both logs are retained separately.
A visual mobile check found an inherited flex order placing Continue above the
heading. The immersive section now resets child order, and the read-only browser
check verifies that Continue follows the introductory copy.

## Limits and operation
The latest Pinterest shortlink could not be retrieved. The original robotic scene
was designed using the visible earlier industrial robot/glass references, not a
claim to reproduce an unseen pin. Visual attractiveness remains a user judgement.
No Lighthouse score, full WCAG certification or production performance claim was
measured. Live email/SMS/payments remain disabled. This change does not grant launch
approval. Vite is only a static demonstration; use npm run local for the real app.

The source ZIP contains complete application source and review evidence, excluding
business data, private environment, uploads and generated build artifacts. Preserve
your .env, database and uploads when applying it. No database rollback is needed;
UI rollback consists of restoring the earlier source version.
