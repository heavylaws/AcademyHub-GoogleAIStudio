# AcademyHub Responsive Design System & Layout Rules

## 1. Mobile-First Layout Rules
- All layout structures must be written Mobile-First using standard Vanilla CSS custom properties (`app/globals.css`) and media queries (`@media (min-width: 768px)`, `@media (min-width: 1024px)`).
- Absolutely NO hardcoded fixed pixel container widths (`width: 1200px`). Use fluid sizing (`width: 100%`, `max-width: 1280px`, `min-height: 100vh`).
- For grids (such as athlete metrics dashboards, schedules, or coaching rosters), scale column structures dynamically:
  - Mobile: Single column (`grid-template-columns: 1fr`)
  - Tablet: Two columns (`grid-template-columns: repeat(2, 1fr)`)
  - Desktop: Three or four columns (`grid-template-columns: repeat(3, 1fr)` or `repeat(4, 1fr)`)

## 2. Touch-Safe Targets & Spacing
- Interactive targets (buttons, menu items, dashboard cards) must have a minimum touch target area of 44x44px to prevent tap frustration on mobile viewports.
- Inputs, dropdown selectors, and forms must have large, thumb-friendly touch targets with a minimum vertical height of 44px (`min-height: 44px`).
- Use a minimum of `1rem` (16px) for general mobile margins and paddings, upgrading to `1.5rem` or `2rem` on larger viewports.

## 3. Navigation & Tables
- Reorganize complex sidebars or horizontal nav headers into collapsible mobile navigation or responsive header components.
- Large data tables (class schedules, player attendance sheets, workout logs) must be wrapped in a scrollable horizontal container (`overflow-x: auto; width: 100%`) to prevent horizontal page breakages.
