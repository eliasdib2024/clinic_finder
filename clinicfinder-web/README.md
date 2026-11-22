# ClinicFinder

Find doctors and clinics in Lebanon, book appointments and manage digital prescriptions.

This is the complete React frontend for the three ClinicFinder roles: **patient**, **doctor** and **administrator**. It runs end to end on a mock backend stored in `localStorage`. All business rules from the project documentation (slot engine, appointment lifecycle, double-booking prevention) are enforced in the service layer. To connect a real REST API later, you replace service function bodies; the pages don't change.

> **Demo build.** Sign-in, password hashing and reset codes are simulated in the browser and are **not** production security. Every doctor, clinic, patient and phone number in the demo data is fictional.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Requires Node 18+ (tested on Node 22).

### Demo accounts

These are also one-click buttons on the sign-in screen.

| Role    | Email                      | Password      |
|---------|----------------------------|---------------|
| Patient | patient@clinicfinder.lb    | `Patient@123` |
| Doctor  | doctor@clinicfinder.lb     | `Doctor@123`  |
| Admin   | admin@clinicfinder.lb      | `Admin@123`   |

Every seeded doctor can also sign in with `Doctor@123` (e.g. `lina.khoury@clinicfinder.lb`), and every seeded patient with `Patient@123`.

**Reset the demo data:** go to *Settings → Account → Reset demo data*, or delete the `clinicfinder_db_v1` key from localStorage. Bookings in the seed are generated relative to today, so the demo always has a "today", an upcoming week and a history.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 5173 |
| `npm run build` | Production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Unit, service and translation tests (Vitest, 45 tests) |
| `npm run test:e2e` | End-to-end tests (Playwright, 30 tests) |

### Environment variables

Copy `.env.example` to `.env`:

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the REST API (e.g. `http://localhost:8080/api`). Used by `services/http.js`. |
| `VITE_ROUTER` | Set to `hash` for hash-based routing on static hosts (GitHub Pages, S3…) |
| `VITE_BASE` | Public base path of the build (default `/`; use `./` for relative hosting) |
| `VITE_MOCK_LATENCY` | Simulated network latency of the mock backend in ms (default `280`) |

### Production build

```bash
npm run build                                   # standard SPA (needs history fallback to index.html)
VITE_ROUTER=hash npm run build                  # static hosts without rewrites
VITE_ROUTER=hash VITE_BASE=./ npm run build     # hosted under an unknown sub-path
```

Each role's area is code-split. The 3D library (~240 kB gzipped) loads only when the hero scene actually renders, and charts load only on pages that use them.

---

## Testing

```bash
npm test
```

* `tests/unit/schedule.test.js`: the slot engine (slot length, breaks, blocked dates, disabled days, occupied slots, the 15-minute lead time, the 21-day "next available" search, weekly capacity, schedule validation).
* `tests/unit/validators.test.js`: Lebanese phone numbers, password policy and strength, license numbers, lifecycle transitions, allergy conflicts, RX code format.
* `tests/unit/services.test.js`: business workflows against the mock backend: login and signup, doctor pending verification, forgot password, search filters, booking, double-booking prevention, auto-confirm, reschedule, cancel, confirm and decline, completing a future visit (blocked), prescriptions, availability changes, verification, suspension, role permissions, catalog and clinic rules.
* `tests/unit/i18n.test.js`: translation lookups and English fallback, placeholders, translated variables, dates stored in notifications rendered in the reader's language, time/currency formats per language, and that the French and Arabic dictionaries contain the same keys with matching placeholders.

```bash
npx playwright install chromium   # once
npm run test:e2e
```

To use an installed Chrome instead of downloading Chromium: `CHROME_PATH=/usr/bin/google-chrome npm run test:e2e`.

The e2e suite (`tests/e2e`) covers: route protection and redirect-back, role isolation, fast navigation never leaving a page invisible, choosing French before signing in and switching to Arabic (RTL), patient and doctor registration, the forgot-password code flow, logout, URL-persisted search filters, the full booking flow (including the booked slot disappearing), reschedule then cancel, prescription printing and public verification, a doctor accepting and declining (with a required reason), issuing a prescription past an allergy warning, availability changes with the unsaved-changes guard, admin approve and reject, suspension blocking sign-in, catalog changes reaching filters, and clinic creation with validation.

---

## Features

### Public site
* Landing page with a procedural 3D hero (a beating heart inside a DNA helix, with mouse-follow), hero search, live stats, a specialty grid with doctor counts, a four-step "how it works", top-rated doctors, patient and doctor benefits.
* `/find`: public doctor search; `/doctors/:id`: public profile (booking asks guests to sign in and returns them to the profile afterwards).
* `/verify/:code`: public prescription verification by RX code. It shows only non-sensitive details.
* Language switcher: English, Français, العربية. The whole interface is translated, and Arabic switches to a right-to-left layout.

### Authentication
Sign in with "keep me signed in", patient and doctor sign-up (doctors add specialty, Order of Physicians license number, governorate and city in a second step), forgot password (email → 6-digit code with paste and keyboard support → new password), password strength meter, enforced password policy, Lebanese phone validation, role-based guards and redirect-back.

### Patient
Overview (greeting, next appointment, quick actions, upcoming visits, recent prescriptions, visit-history chart, health summary, recommendations matched to the patient's insurance) · **Find a doctor**: specialty, governorate → city, fee range, languages, insurers, *only my insurance*, available today / within 7 days, video visits, minimum rating and experience, six sort orders, pagination, filters stored in the URL, and a mobile filter drawer · **Doctor profile**: verification, qualifications, clinic, opening hours, insurance check, 14-day date strip, morning and afternoon slots · **Booking flow**: date and time → in-person or video plus reason → review → animated confirmation with an `.ics` calendar download · **Appointments**: upcoming / past / cancelled tabs, reschedule with live slots, cancel with a late-cancellation warning, details with status history, book again, linked prescription · **Prescriptions**: search and filter, printable document, save as PDF via the print dialog · **Settings**: profile, health and insurance (blood type, allergies, insurer and policy number, emergency contact), password, notifications, language, sign out, account deactivation.

### Doctor
Overview (today's timeline with a "now" line, booking requests to accept or decline, 7-day load calendar, KPIs, profile status) · **Appointments**: status tabs, date stepper, search, accept, decline with a message, complete, no-show, cancel · **Patients**: searchable table and a record drawer (allergies, blood type, insurance, visits, prescriptions) · **New prescription**: patient and linked appointment pre-fill, medication autocomplete, multiple rows, allergy-conflict warnings that need acknowledging, preview, sign and issue (linking a confirmed past or current visit marks it completed) · **Availability**: weekly hours, breaks, copy a day to weekdays, slot length, auto-confirm, days off, blocked dates, live weekly slot count, unsaved-changes bar and navigation guard · **Practice profile**: photo upload (cropped in the browser), bio, fee, experience, languages, insurers, video visits, listed clinic or own practice, education, verification status, and re-submission after a rejection.

### Administrator
Overview (KPIs, a stacked appointments-per-day chart with a table view, demand by specialty, doctors by governorate, status breakdown, activity feed) · **Verifications**: pending / rejected / approved, review drawer, approve, reject with a reason, re-submissions flagged · **Users**: role tabs, search, status filter, suspend (cancels future bookings and ends sessions) and reactivate · **Clinics**: create, edit, delete with validation (deletion is blocked while doctors practise there) · **Catalog**: specialties (with icons), insurers and languages. Changes immediately reach every filter and form.

---

## Business rules (enforced in `src/services` + `src/lib`)

**Appointment lifecycle** (`lib/lifecycle.js`)

| From | Allowed next |
|---|---|
| Pending | Confirmed, Declined, Cancelled |
| Confirmed | Completed, Cancelled, No-show |
| Completed / Cancelled / Declined / No-show | final |

* A booking starts as Pending, or as Confirmed when the doctor enabled auto-confirm.
* An appointment can't be marked Completed or No-show before its date.
* Rescheduling returns it to Pending (or Confirmed with auto-confirm).
* A patient can't hold two overlapping active bookings, and the doctor's slot is re-checked at booking time.

**Slot engine** (`lib/schedule.js`): slots come from the weekday's hours, stepping by the doctor's slot length. They skip breaks, blocked dates and disabled days, and remove time taken by Pending or Confirmed bookings. For today, a slot must start more than 15 minutes from now. "Next available" searches up to 21 days ahead and drives the "soonest" sort and the availability filters. Bookings open 14 days ahead.

---

## Architecture

```
src/
  main.jsx               Router (browser or hash) + providers: Toast → I18n → Auth → Catalog
  App.jsx                Route tree; every page is lazy-loaded
  routes/guards.jsx      RequireAuth(roles), GuestOnly, RoleRedirect
  context/               AuthContext, CatalogContext, ToastContext, I18nContext
  services/              The only code that touches data
    db.js                localStorage store (clinicfinder_db_v1), latency, ApiError, rollback, sessions
    seed.js              Deterministic Lebanese demo data, relative to today
    serializers.js       API-shaped responses
    http.js              fetch wrapper for the real backend (Bearer token)
    authService, doctorService, appointmentService, prescriptionService,
    userService, adminService, catalogService
  lib/                   constants (Lebanon reference data), dates, schedule, lifecycle,
                         validators, allergies, format, i18n, hash
  hooks/                 useAsync, useDebounce, useFocusTrap, useUnsavedGuard, useDismiss…
  components/
    ui/                  Button, Field/Input/Select/Switch, Modal/Drawer/ConfirmDialog, Tabs,
                         Segmented, ChipSelect, CodeInput, PasswordStrength, Badges, Skeletons, PulseLine…
    layout/              PublicLayout, AuthLayout, DashboardLayout, Brand, navConfig, menus
    shared/              DoctorCard, SlotPicker, BookingFlow, PrescriptionDocument, AppointmentBits,
                         MedicationCombo, ErrorBoundary…
    3d/                  HeroScene (React Three Fiber), HeroVisual (lazy + static fallback)
  pages/{public,auth,patient,doctor,admin,common}/
  styles/globals.css     Design tokens, components, print stylesheet, reduced motion
```

### Connecting the real backend

Every page calls only `src/services/*`. Each service function is async and returns API-shaped data, with failures thrown as `ApiError(message, status, fields)`, so loading, error and inline-validation states already work. To switch a function to the real API, keep its signature and replace the body:

```js
// services/authService.js
import { http } from './http';
export const login = (body) => http.post('/auth/login', body);   // → { token, user }
```

The suggested endpoints and server-side requirements are in the project documentation (§6). The server must re-check slot availability, role permissions, status transitions and the password policy, and must email the 6-digit reset code (the demo shows it in a toast).

---

## Design notes

* **Identity:** Instrument Serif display headings, Inter Tight body text, Noto Sans Arabic for RTL (all self-hosted through `@fontsource`, with no third-party font requests). Teal, emerald and soft blue on cool near-white.
* **Signature motif:** an animated ECG trace. It's the brand mark and the booking progress bar, and it runs under the hero heart.
* **3D:** fully procedural (no external models or HDR files). It pauses when off screen, caps the device pixel ratio, and falls back to a static SVG when reduced motion is on or WebGL is missing.
* **Charts:** a categorical palette checked for colour-vision-deficiency separation, with legends, hover tooltips and a table view.

## Localization (English, French, Arabic)

Every visible string goes through `tx()` in `src/lib/i18n.js`, which uses the **English text as the key**:

```jsx
<Button>{tx('Save changes')}</Button>
tx('{0} doctors found', { 0: total })
```

* Dictionaries: `src/lib/locales/fr.js` and `src/lib/locales/ar.js` (about 1,350 entries each). A missing entry falls back to English, so nothing breaks while a translation is pending.
* Placeholders (`{0}`, `{n}`) are checked by a unit test, which also checks that both dictionaries contain the same keys.
* Dates, times and prices follow the language: French uses 24-hour times (`14:30`) and `80 $`, Arabic uses Arabic month names, `2:30 م` and Latin digits (the usual practice in Lebanon). Arabic also flips the whole layout to right-to-left.
* Specialties, governorates, cities, statuses, weekdays, insurers, notifications and the admin activity log are translated when displayed. Notifications are stored in English with their variables, so the person who reads one sees it in their own language.
* The language chosen on a device is kept when you sign in and saved to your account; a new device uses the account's saved language.

* **Mixed-direction text in Arabic.** Latin values interpolated by `tx()` (doctor and patient names, clinics) are wrapped in Unicode isolates (U+2068…U+2069), so punctuation stays on the correct side: «مساء الخير، Nadine.» instead of «.Nadine». Free-text data rendered outside `tx()` (clinic names, addresses) is wrapped in `<bdi>`.
* **Charts in Arabic.** Recharts draws SVG text that breaks under `dir="rtl"`, so each chart sits in a `dir="ltr"` box and is mirrored instead: reversed X axis, category labels on the right, and value labels past the outer end of each bar.

**Adding a string:** write it in English inside `tx()`, then add the same key with its translation to both `fr.js` and `ar.js`.

**Checking coverage:**

```bash
# Pseudo-localization: lists any visible text that doesn't go through tx()
node scripts/i18n-audit.mjs pseudo
# Lists text that is identical in English and French (or Arabic), i.e. probably untranslated
node scripts/i18n-audit.mjs fr
node scripts/i18n-audit.mjs ar
```

The audit expects the dev server on port 5173 and Chrome at `/usr/bin/google-chrome` (or `CHROME_PATH`). You can also turn on pseudo mode by hand with `localStorage.clinicfinder_pseudo = '1'`, which wraps every translated string in ⟦…⟧.

## Accessibility

Labelled fields with inline errors (`aria-invalid`, `role="alert"`), focus-trapped modals and drawers that close with Esc and restore focus, a skip link, keyboard-navigable tabs and code input, visible focus rings, confirmation before destructive actions, skeleton loaders, empty states that suggest a next step, an error boundary per page, reduced-motion support, layouts down to 360 px, and a print stylesheet for prescriptions.

## Changes in this release

**Patient sign-up is now two steps.** After creating an account, a patient is taken to `/welcome` to complete a health profile:
date of birth, governorate → city, blood type ("I don't know" allowed), insurance with policy number, and allergies.
For allergies, the patient either lists them or ticks "I have no known allergies", so an empty list is never mistaken for "none".
Until the profile is saved, every patient page redirects to `/welcome` (guard: `RequireAuth` + `needsOnboarding`), including after a refresh.
The page offers "Sign out" instead of "Back". Existing and seeded patients are not affected. All the fields, now including governorate and city,
can be edited later in Settings → Health. Service: `userService.completeOnboarding()`, which validates server-side.

**Doctor practice profile.** The photo upload is removed, and the name is no longer editable there. It is shown read-only beside the initials,
with a link to Settings. `updateMyDoctorProfile` ignores `name` and `photo`, and any picture stored by an older version is no longer shown,
so every doctor now appears with initials.

**Live name preview (Settings → Profile).** While you type your name, the name beside the avatar is rebuilt on every keystroke and the initials
update immediately. Latin names animate letter by letter. Arabic animates word by word, because splitting Arabic per letter would break the letter joining.
A "Preview" badge shows until you save. For doctors, the preview applies the same "Dr." rule as the server. Reduced-motion settings turn the animation off.

**Prescriptions: diagnosis and follow-up.**
* *Primary diagnosis* is required (3–200 characters).
* *Follow-up* is optional: switch it on, pick a date (tomorrow to one year ahead, with quick picks for 1 week, 2 weeks, 1 month and 3 months) and add an optional note.
* Both are validated in the form and in `createPrescription`, stored on the prescription, and shown in the preview, the prescription page and the printed / PDF version.
  The follow-up box prints with its tint (`print-color-adjust: exact`).
* The prescription lists show the diagnosis (doctor: new column; patient: under the medications) and the follow-up date. Search also matches diagnoses.
* The patient's "New prescription" notification mentions the follow-up date, formatted in the reader's language (`@@date:` token).
* The public `/verify` page still shows only validity, the doctor and the date. **The diagnosis is never exposed there.**
* The demo database version is bumped to 3, so seeded prescriptions include diagnoses (and one follow-up), and seeded patients include a location.

**Also fixed:** the allergies text box (in onboarding and in Settings → Health) had no accessible label, because the label pointed at its wrapper.
In Arabic, directional arrows and chevrons are now mirrored. The linked-appointment dropdown now translates the status.

## Final UI review (fixes)

Applied on top of the animation and language release, with no change to business rules:

* **Arabic:** admin charts (demand by specialty, doctors by governorate, appointments per day) and the patient visit-history chart are mirrored, and their labels are no longer clipped. Greetings and clinic/address lines with Latin names keep their punctuation on the correct side.
* **Translations:** added the missing `to` (Availability page) and the chart tooltip units (`bookings`, `doctors`) in French and Arabic.
* **Mobile:** single-column grid breakpoints now use `minmax(0, 1fr)`. Wide scrolling children (date strip, tabs) previously stretched the doctor profile page to 1030 px on a 390 px phone.
* **Phones, frozen screen after using the menu:** inside the slide-out menu, the active-item highlight used a framer-motion shared `layoutId`. Tapping a link to another page moved that highlight while the drawer was closing, so `AnimatePresence` never finished removing the drawer's invisible full-screen overlay. It kept catching every tap (and kept page scrolling locked). The drawer now uses a plain highlight; the sliding one stays on the desktop sidebar. As a safety net, every overlay (drawer and modal) stops receiving taps as soon as it starts closing. Covered by `tests/e2e/mobile-nav.spec.js` (touch emulation, every menu link, all three roles).
* **Tests:** `tests/e2e/layout.spec.js` checks that key pages fit a phone screen in English and Arabic, and that Arabic chart labels stay inside their panel. The i18n unit test covers bidi isolation.

## Known limitations

* Authentication and data are demo-only (browser storage). Data is per browser and per device.
* Text people type themselves (a doctor's edited bio, a rejection reason, a blocked-date note) stays in the language it was written in. The seeded demo content (bios, visit reasons, prescription instructions) is translated.
* Video consultations can be booked and are flagged, but no video provider is integrated.
* Ratings and review counts are seed data; writing reviews isn't part of this scope.
* Email and SMS notifications are simulated. In-app notifications (the bell) are live.

## Changes from the documentation

* `/` shows a public landing page to guests; the documentation redirects guests to `/login`. Signed-in users are still redirected to their role's home.
* Added public routes: `/find`, `/doctors/:id`, `/verify/:code`. Added `/patient/prescriptions/:id`, `/doctor/prescriptions/:id` and `/admin/settings`.
