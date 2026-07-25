// Lightweight stroke icon set (Feather-style) so the UI doesn't rely on emoji.

function Svg({ size = 20, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p) => (
  <Svg {...p}><path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></Svg>
);

export const IconLeaf = (p) => (
  <Svg {...p}><path d="M11 20A7 7 0 0 1 4 13c0-4 3-8 9-9 5-1 7 1 7 1s1 3-1 7c-2.5 5-6 8-8 8Z" /><path d="M5 19c3-5 7-9 11-11" /></Svg>
);

export const IconMap = (p) => (
  <Svg {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14" /><path d="M15 6v14" /></Svg>
);

export const IconUsers = (p) => (
  <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.7-3.5 3.4-5 6.5-5s5.8 1.5 6.5 5" /><path d="M16 5a3.5 3.5 0 0 1 0 7" /><path d="M17.5 15c2.3.5 3.6 1.9 4 5" /></Svg>
);

export const IconGear = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" /></Svg>
);

export const IconPin = (p) => (
  <Svg {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></Svg>
);

export const IconPlay = (p) => (
  <Svg {...p}><path d="M6 4.5v15l13-7.5-13-7.5Z" fill="currentColor" stroke="none" /></Svg>
);

export const IconStop = (p) => (
  <Svg {...p}><rect x="5.5" y="5.5" width="13" height="13" rx="2" fill="currentColor" stroke="none" /></Svg>
);

export const IconPlus = (p) => (
  <Svg {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>
);

export const IconCheck = (p) => (
  <Svg {...p}><path d="M4 12.5 9.5 18 20 6.5" /></Svg>
);

export const IconChevronLeft = (p) => (
  <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>
);

export const IconChevronRight = (p) => (
  <Svg {...p}><path d="M9 5l7 7-7 7" /></Svg>
);

export const IconClock = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></Svg>
);

export const IconDollar = (p) => (
  <Svg {...p}><path d="M12 2v20" /><path d="M17 6.5c-.8-1.5-2.5-2-5-2-3 0-4.5 1.5-4.5 3.5 0 4.5 9.5 2.5 9.5 7 0 2-1.5 3.5-5 3.5-2.7 0-4.4-.8-5.2-2.5" /></Svg>
);

export const IconRoute = (p) => (
  <Svg {...p}><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5" /></Svg>
);

export const IconTruck = (p) => (
  <Svg {...p}><path d="M1.5 5.5h13v11h-13z" /><path d="M14.5 9.5h4l3 3.5v3.5h-7" /><circle cx="6" cy="18.5" r="2" /><circle cx="17.5" cy="18.5" r="2" /></Svg>
);

export const IconTrash = (p) => (
  <Svg {...p}><path d="M4 7h16" /><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v5" /><path d="M14 11v5" /></Svg>
);

export const IconEdit = (p) => (
  <Svg {...p}><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M14 6.5 17.5 10" /></Svg>
);

export const IconTarget = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /></Svg>
);

export const IconZap = (p) => (
  <Svg {...p}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></Svg>
);

export const IconDownload = (p) => (
  <Svg {...p}><path d="M12 3v12" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></Svg>
);

export const IconUpload = (p) => (
  <Svg {...p}><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M4 20h16" /></Svg>
);

export const IconTrophy = (p) => (
  <Svg {...p}><path d="M7 4h10v6a5 5 0 0 1-10 0V4Z" /><path d="M7 5H4v2a3.5 3.5 0 0 0 3 3.5" /><path d="M17 5h3v2a3.5 3.5 0 0 1-3 3.5" /><path d="M12 15v3" /><path d="M8.5 21h7" /><path d="M12 18a2.5 2.5 0 0 0-2.5 3h5a2.5 2.5 0 0 0-2.5-3Z" /></Svg>
);

export const IconCalendar = (p) => (
  <Svg {...p}><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M3.5 10.5h17" /></Svg>
);

export const IconExternal = (p) => (
  <Svg {...p}><path d="M14 4h6v6" /><path d="M20 4 10.5 13.5" /><path d="M19 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19V6.5A1.5 1.5 0 0 1 5.5 5H11" /></Svg>
);

export const IconAlert = (p) => (
  <Svg {...p}><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4.5" /><circle cx="12" cy="17.2" r="0.4" fill="currentColor" /></Svg>
);
