# Course builder override

Inherits `../MASTER.md`.

- Density: 8/10 — this is the densest product surface.
- Motion: 2/10; drag feedback may animate subtly but editing must feel stable.
- Variance: 3/10.
- Keep hierarchy visible: Course → Module → Lesson → Block. Use indentation, borders and spacing before introducing additional colors.
- Sticky toolbar contains save state, validation/review status and key actions; avoid turning it into a second full navigation bar.
- Autosave state must always be explicit: `Đang lưu`, `Đã lưu`, `Lỗi lưu`.
- Drag handles are visually distinct and use `cursor: grab`; where practical offer move up/down controls as a keyboard fallback.
- Rich editor toolbar groups formatting controls and keeps touch/click spacing adequate.
- Generated/locked block state uses label + icon/text, never only color.
- Confirmation required for deleting module/lesson/block and publication/archive actions.
- On small screens, metadata grids collapse to one column and action groups wrap rather than overflow.
