# AcademyHub Responsive Design System & Layout Rules

## 1. Mobile-First Layout Rules
- All layout structures must be written Mobile-First. Use default Tailwind utility classes for mobile viewports, and only upgrade layout constraints using screen-size modifiers (e.g., `md:flex-row`, `lg:grid-cols-3`).
- Absolutely NO hardcoded pixel widths (`w-[400px]`, `w-[1200px]`) or heights for container elements. Use fluid sizing (`w-full`, `max-w-screen-xl`, `min-h-screen`).
- For grids (such as athlete metrics dashboards, schedules, or coaching rosters), scale column structures dynamically:
  - Mobile: Single column (`grid-cols-1`)
  - Tablet: Two columns (`md:grid-cols-2`)
  - Desktop: Three or more columns (`lg:grid-cols-3 xl:grid-cols-4`)

## 2. Touch-Safe Targets & Spacing
- Interactive targets (buttons, menu items, dashboard cards) must have a minimum clickable area of 44x44px to prevent tap frustration on mobile viewports.
- Inputs, dropdown selectors, and forms must have large, thumb-friendly touch targets with a minimum vertical height of `h-11` or `h-12`.
- Use a minimum of `p-4` (1rem / 16px) for general mobile margins and paddings, upgrading to `p-6` or `p-8` on larger viewports.

## 3. Navigation & Tables
- Reorganize complex sidebars or horizontal nav headers into a collapsible mobile drawer (hamburger menu) or a persistent bottom-bar navigation on mobile breakpoints.
- Large data tables (like class schedules, player attendance sheets, or workout logs) must be wrapped in a scrollable horizontal container (`overflow-x-auto w-full`) to prevent horizontal page breakages.
