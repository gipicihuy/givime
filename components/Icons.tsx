import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...p }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...p,
  };
}

export function IconSearch(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconPlay(p: P) {
  return (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" />
    </svg>
  );
}

export function IconStar(p: P) {
  return (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <path d="m12 2.5 2.95 6.1 6.7.9-4.9 4.6 1.25 6.6L12 17.5 6 20.7l1.25-6.6-4.9-4.6 6.7-.9L12 2.5z" />
    </svg>
  );
}

export function IconEye(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconClock(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function IconChevronLeft(p: P) {
  return (
    <svg {...base(p)}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function IconChevronRight(p: P) {
  return (
    <svg {...base(p)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function IconChevronUp(p: P) {
  return (
    <svg {...base(p)}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

export function IconChevronDown(p: P) {
  return (
    <svg {...base(p)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconFlame(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 2c1 3.5 5 5.5 5 10a7 7 0 1 1-14 0c0-4.5 3.5-6.5 4.5-9.5 2 2.5 4.5 2 4.5-.5z" />
      <path d="M12 18a3 3 0 0 0 3-3c0-1.8-1.2-2.8-2-3.8-.4.8-1.2 1.2-1.6.8-.8-.8 0-2.4.8-3.6-2.8 1.2-4 4-2.8 6.4.5 1.2 1.4 2.2 2.6 2.2z" />
    </svg>
  );
}

export function IconHome(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  );
}

export function IconFilm(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}

export function IconLayers(p: P) {
  return (
    <svg {...base(p)}>
      <path d="m12 3 9 5-9 5-9-5 9-5z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  );
}

export function IconGrid(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function IconTag(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12.6 3H21v8.4L11.3 21.1a2 2 0 0 1-2.8 0L3 15.6a2 2 0 0 1 0-2.8L12.6 3z" />
      <circle cx="16.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconExternal(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M14 4h6v6" />
      <path d="M10 14 20 4" />
      <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function IconEmpty(p: P) {
  return (
    <svg {...base({ ...p, size: p.size ?? 32 })}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 16 5-4 3 2 4-5 6 7" />
      <circle cx="8.5" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCompass(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.2 5-5 2.2 2.2-5 5-2.2z" />
    </svg>
  );
}

export function IconHistory(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function IconSchedule(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

export function IconPause(p: P) {
  return (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}

export function IconLock(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function IconUnlock(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.5-2" />
    </svg>
  );
}

export function IconBrightness(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function IconVolume(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M18.07 5.93a9 9 0 0 1 0 12.14" />
    </svg>
  );
}

export function IconVolumeMute(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
      <path d="m16 9 5 6M21 9l-5 6" />
    </svg>
  );
}

export function IconReplay(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M3 12a9 9 0 1 0 2.64-6.36" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

export function IconForward(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

export function IconPrevTrack(p: P) {
  return (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <rect x="5" y="6" width="2.6" height="12" rx="1" />
      <path d="M19 6.9v10.2a1 1 0 0 1-1.55.83l-7.95-5.1a1 1 0 0 1 0-1.66l7.95-5.1A1 1 0 0 1 19 6.9z" />
    </svg>
  );
}

export function IconNextTrack(p: P) {
  return (
    <svg {...base(p)} fill="currentColor" stroke="none">
      <path d="M5 6.9v10.2a1 1 0 0 0 1.55.83l7.95-5.1a1 1 0 0 0 0-1.66l-7.95-5.1A1 1 0 0 0 5 6.9z" />
      <rect x="16.4" y="6" width="2.6" height="12" rx="1" />
    </svg>
  );
}

export function IconFullscreen(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function IconCast(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
      <path d="M2 12.05A9 9 0 0 1 9.95 20" />
      <path d="M2 16.1A5 5 0 0 1 5.9 20" />
      <line x1="2" y1="20" x2="2.01" y2="20" />
    </svg>
  );
}

export function IconFullscreenExit(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M8 21v-3a2 2 0 0 0-2-2H3M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}
