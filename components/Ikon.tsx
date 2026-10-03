type P = { size?: number; className?: string };

const garis = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IkonWhatsApp({ size = 20, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true" className={className} {...garis}>
      <path d="M4 20l1.4-4.2A8 8 0 1 1 8.6 19z" />
      <path d="M9.5 9.5c.3 1.6 1.4 3 3 3.8l.9-.9 1.6.6-.3 1.4c-2.9 0-5.6-2.6-5.7-5.6l1.4-.3.6 1.6z" />
    </svg>
  );
}

export function IkonHadiah({ size = 18 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.2" aria-hidden="true" {...garis}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v9H5v-9" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

export function IkonPanah({ size = 16, strokeWidth = 2.4 }: P & { strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={strokeWidth} aria-hidden="true" {...garis}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function IkonPanahBesar({ size = 44 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="3" aria-hidden="true" {...garis}>
      <path d="M4 12h15" />
      <path d="M13 5l7 7-7 7" />
    </svg>
  );
}

export function IkonCentang({ size = 22 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.4" aria-hidden="true" className="shrink-0" {...garis}>
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

export function IkonOrang({ size = 56 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="1.6" aria-hidden="true" {...garis}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

/** Tanda jembatan Migimo (oranye + merah) */
export function TandaMigimo({ width = 44, height = 24 }: { width?: number | string; height?: number | string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 40 22" aria-hidden="true">
      <path d="M2 22A18 18 0 0 1 20 4V12A10 10 0 0 0 10 22Z" fill="#F39F1E" />
      <path d="M20 4A18 18 0 0 1 38 22H30A10 10 0 0 0 20 12Z" fill="#E30B20" />
    </svg>
  );
}

export function IkonInstagram() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" />
    </svg>
  );
}

export function IkonFacebook() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" />
    </svg>
  );
}

export function IkonThreads() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true" {...garis}>
      <path d="M16.5 11.2c-.4-2.6-2.1-3.9-4.4-3.9-2.4 0-4 1.6-4.2 3.6" />
      <path d="M16.6 11.4c-2.9-.9-7.1-.6-7.1 2.2 0 1.6 1.5 2.4 3 2.3 2.6-.1 4-1.9 4-5.2" />
      <path d="M19 6.5C17.5 4.3 15.2 3 12 3 6.8 3 4 6.6 4 12s2.8 9 8 9c3.6 0 6.6-1.8 7.3-4.7.6-2.6-.6-4.6-2.8-5.6" />
    </svg>
  );
}

export function IkonX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true" {...garis}>
      <path d="M4 4l16 16" />
      <path d="M20 4l-6.6 7.2" />
      <path d="M10.6 12.8L4 20" />
    </svg>
  );
}

export function IkonYouTube() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true" {...garis}>
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <path d="M10 9.2v5.6l4.8-2.8z" />
    </svg>
  );
}
