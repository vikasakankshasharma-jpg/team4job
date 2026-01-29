# ♿ Platform-Wide Accessibility & UX Checklist for Launch

Use this checklist before merging any feature or deploying to production. This ensures *Team4Job* remains accessible, mobile-friendly, and professional.

---

## 🎨 Phase 1: Design & Requirement Check
*Must be confirmed before coding starts.*

- [ ] **Color Contrast**: Text has at least 4.5:1 contrast against its background.
- [ ] **No Color Dependency**: System does not rely *only* on color to convey meaning (e.g., error states, status).
- [ ] **Tap Targets**: All interactive elements are at least **44x44px** on mobile.
- [ ] **Mobile Layout**: Can this feature be used comfortably with **one hand** on a phone?
- [ ] **Logical Flow**: Heading hierarchy (`h1` -> `h2` -> `h3`) matches the improved visual hierarchy.

---

## 🛠️ Phase 2: Component Implementation (Dev)

### Global Layout
- [ ] **Navigation**: "Skip to Content" link works and takes focus to `<main>`.
- [ ] **Semantics**: Page uses `<main>`, `<header>`, `<footer>`, `<nav>` correctly. No `div` soup.

### Forms & Inputs (CRITICAL)
- [ ] **Labels**: Every `<input>`, `<textarea>`, and `<select>` has a programmatically associated `<label>` (via `htmlFor` + `id`).
- [ ] **Placeholders**: Placeholders are NOT used as replacements for labels.
- [ ] **Error Handling**: 
    - [ ] Errors are visible and explicit (not just red borders).
    - [ ] Screen readers announce errors (`aria-invalid="true"`, `aria-errormessage`).
- [ ] **Focus Management**: Focus Ring is clearly visible on all inputs.

### Interactive Elements
- [ ] **Semantics**: 
    - [ ] Actions = `<button>` or `<Link>` (Next.js).
    - [ ] Navigation = `<Link>`.
    - [ ] **NEVER** use `<div onClick>` or `<span onClick>` without `role="button"` and `tabIndex`.
- [ ] **Icon Buttons**: All icon-only buttons (Trash, Edit, Menu) have `aria-label="Description"`.
- [ ] **Modals/Dialogs**:
    - [ ] Focus is trapped inside the modal while open.
    - [ ] `Escape` key closes the modal.
    - [ ] Focus returns to the triggering element on close.

### State Feedback
- [ ] **Loading**: Buttons show a loading spinner & `disabled` state during async actions.
- [ ] **Empty States**: If a list/table is empty, show a helpful message (not just whitespace).

---

## 🧪 Phase 3: Testing & Verification (QA)

### Manual "Smoke Test"
1.  **Tab Test**: Navigate the entire feature using ONLY the `Tab`, `Space`, `Enter`, and Arrow keys. Can you reach and activate everything?
2.  **Zoom Test**: Zoom browser to 200%. Does the layout break? Is text readable?
3.  **Mobile Visual**: Open Chrome DevTools > Mobile View. Are buttons large enough? Is there horizontal scrolling (bad)?

### Automated Checks
- [ ] **Lighthouse**: Run a Lighthouse audit in Chrome DevTools. Target score: **90+ Accessibility**.
- [ ] **Console**: Check specifically for accessibility warnings (e.g., "Duplicate ID", "Missing Alt").

---

## 🚨 Final "Red Flag" Blockers
*Do not deploy if any of these are true.*

- ❌ User gets stuck in a "keyboard trap" (cannot tab out of a component).
- ❌ Form submission fails silently (no visual error).
- ❌ Modals open but cannot be closed via keyboard.
- ❌ Primary text is unreadable due to low contrast.
