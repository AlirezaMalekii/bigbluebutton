# Persian Product-to-Code Map

Use this map as a starting point, then verify current code.

- صفحه جلسه، چیدمان: `skyroom-layout/`, `layout/`, `layout.css`, `responsive.css`
- هدر، نوار بالا: `nav-bar/`, `skyroom-layout/header-logo/`, `navbar.css`
- نوار ابزار پایین، میکروفن، دوربین: `actions-bar/`, `actionsbar.css`
- کاربران، شرکت‌کنندگان: `user-list/`, `skyroom-layout/user-search/`, `sidebar.css`
- چت، پیام: `chat/chat-graphql/`, `skyroom-layout/chat-*`, `chat-panel.css`
- ارائه، اسلاید: `presentation/`, `layout.css`
- وایت‌برد، ابزار نقاشی: `whiteboard/`, `whiteboard-toolbar.css`
- وب‌کم، جای دوربین: `video-provider/`, `skyroom-layout/webcam-zone-*`
- اشتراک صفحه: `screenshare/`
- یادداشت مشترک: `pads/`, `bn-shared-notes/`, `skyroom-layout/shared-notes-*`
- نظرسنجی: `poll/`, `polling/`, `skyroom-layout/active-poll-summary/`
- اتاق گروهی: `breakout-room/`, `breakout-panel.css`
- وضعیت اتصال: `connection-status/`, `skyroom-layout/connection-status-modal/`
- لودینگ، خطا، پایان جلسه: `skyroom-layout/loading/`, `loading.css`, `error-screen.css`, `meeting-ended.css`

Intent clues:

- «قشنگ‌تر/حرفه‌ای‌تر» means infer hierarchy, spacing, states, motion, responsive behavior, and accessibility from the design system.
- «برای همه نمایش داده شود» may imply realtime synchronization; trace GraphQL before planning.
- «فقط مدیر/ارائه‌دهنده» implies permission and late-role-change checks.
- «در موبایل» requires the mobile split-zone model, not only a CSS media query.
- «سریع/روان» requires render, layout, subscription, and low-end-device analysis.
