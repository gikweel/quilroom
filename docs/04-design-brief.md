# Quilroom — Design Brief

**Version:** 0.1  
**Date:** 2026-10-17  

---

## 1. Design Goals

- Feel calm, focused, and trustworthy (like a good note-taking app)
- Extremely low friction — no visual clutter
- Work equally well on phone and desktop
- Make collaboration *visible* without being noisy
- Feel “local” and private rather than corporate SaaS

---

## 2. Brand & Personality

| Attribute | Direction |
|-----------|-----------|
| Tone | Quiet, practical, slightly warm |
| Inspiration | iA Writer + Google Docs (stripped) + Linear’s restraint |
| Not | Playful SaaS, neon, heavy shadows, dashboard overload |

**Working name:** Quilroom  
**Possible future names:** LocalDocs, Homedocs, Quillroom, NetDocs

---

## 3. Visual Language

### Color
- Primary background: near-white (`#FAFAFA` or pure white)
- Surface / cards: white with subtle border or very light shadow
- Text: near-black (`#111` / `#1A1A1A`)
- Secondary text: medium gray
- Accent: single restrained blue or teal for primary actions and presence highlights
- Presence colors: a small, accessible palette of 6–8 distinct colors for users

### Typography
- System font stack or Inter / Geist for UI
- Editor: comfortable reading size (16–18 px), good line-height
- Clear hierarchy: page title → section headings → body

### Spacing & Layout
- Generous whitespace
- Max content width for the editor (~700–720 px) so lines don’t get too long
- Document list: clean cards or compact rows
- Mobile: full-width, bottom-friendly actions

### Iconography
- Simple, outlined icons (Lucide or similar)
- Minimal — only what is necessary

---

## 4. Key Screens — Design Notes

### 4.1 Document List (Home)
- Top bar: app name + “New Document” button
- List of documents:
  - Title (prominent)
  - Last edited (relative time)
  - Small presence dots if anyone is currently in it
- Empty state: short sentence + large primary button
- Each item has subtle rename / delete affordances (or overflow menu)

### 4.2 Editor
- Top bar:
  - Back to list
  - Editable title
  - Presence avatars / names
  - Share button
- Quill toolbar: compact, sticky or always visible, touch-friendly hit targets
- Editor canvas: clean, focused, good margins
- Connection status: small subtle indicator (green dot / “Live”)

### 4.3 Share Panel
- Sheet or modal
- Large QR code
- Full URL with one-click copy
- Optional password section

### 4.4 Name Prompt
- Simple centered modal or full-screen soft gate
- “What should we call you?”
- Text field + Continue
- Optional color picker (or auto-assign)

### 4.5 Password Gate
- Clean form: “This document is protected”
- Password field + Unlock

---

## 5. Presence Design

- Each user gets a consistent color
- Small colored circle + name in the top bar
- Remote cursors: thin colored caret + name label on hover / briefly
- Avoid flashing or aggressive animations

---

## 6. Mobile Considerations

- Toolbar should not eat half the screen (consider collapsible or bottom sheet on very small screens)
- Large enough tap targets (min 44 px)
- Share sheet works well with native share if available, but QR is primary
- Virtual keyboard should not permanently hide the toolbar if possible

---

## 7. Motion & Feedback

- Minimal motion
- Soft fade for presence join/leave
- Instant feedback on copy, rename, delete
- Loading states only when necessary (initial load, reconnecting)

---

## 8. Accessibility

- Sufficient contrast
- Keyboard navigable for desktop
- Labels on icon buttons
- Focus rings visible
- Screen-reader friendly document structure where practical

---

## 9. Design Deliverables for Implementation

For v1 we will implement directly in code (no separate Figma required), following this brief:

- Tailwind design tokens (colors, spacing, fonts)
- Consistent button, input, modal components
- Responsive breakpoints
- Presence color palette defined in one place

---

## 10. Mood References (textual)

- Clean writing apps (iA Writer, Typora light mode)
- Modern collaborative tools that stay out of the way (Notion’s lighter moments, Dropbox Paper)
- Avoid: heavy Material elevation, bright primary colors everywhere, dense admin UIs

---

*Design decisions that affect product feel should be checked against this brief.*
