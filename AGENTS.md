<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Socias Digitales: mobile-first

Treat phones as the primary platform for every new or modified feature, including Flor's administration. Keep the approved editorial identity; do not introduce new fonts, glow, or synthetic people.

- Verify the actual CSS viewport at 320, 360, 390 and 430px, plus a desktop width. Browser zoom can change the effective viewport: measure it, do not assume it.
- Check filled/long-text, empty, loading and error states. Forms, dialogs, videos, date selectors and graphs must remain usable with a small viewport and the on-screen keyboard.
- Aim for 44px touch targets. Text/date/number fields must stay at least 16px on mobile without shrinking intentionally larger numeric typography. Never disable pinch zoom.
- Use safe-area insets and dynamic viewport units for fixed controls. Persistent navigation must not cover content, validation errors, save buttons, video controls or notifications.
- Do not hide page overflow to mask layout defects. Use responsive cards for operational lists; keep genuinely wide tables in an explicit scroll region.
- Preserve permissions, real data, branding, read/unread behavior and desktop functionality. Do not expose student navigation to administrators or unlock modules to achieve a screenshot.
- Run the mobile contract tests and the existing tests before publishing. Perform browser checks using the current build; state which views and widths were verified instead of claiming universal device coverage.
- Remove local-only QA routes and fictional data before release. Any future module must meet this contract before it is considered finished.
