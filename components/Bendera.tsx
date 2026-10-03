import { useId } from "react";
import type { KodeNegara } from "@/lib/negara";

type Kode = KodeNegara | "ID";

function Isi({ kode }: { kode: Kode }) {
  switch (kode) {
    case "JP":
      return (
        <>
          <rect width="24" height="24" fill="#FFFFFF" />
          <circle cx="12" cy="12" r="5" fill="#BC002D" />
        </>
      );
    case "MY":
      return (
        <>
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} y={i * 1.72} width="24" height="1.72" fill={i % 2 === 0 ? "#CC0001" : "#FFFFFF"} />
          ))}
          <rect width="12" height="12" fill="#010066" />
          <circle cx="5.5" cy="6" r="3" fill="#FFCC00" />
          <circle cx="6.5" cy="6" r="2.6" fill="#010066" />
          <circle cx="9.2" cy="6" r="1.3" fill="#FFCC00" />
        </>
      );
    case "SG":
      return (
        <>
          <rect width="24" height="12" fill="#EF3340" />
          <rect y="12" width="24" height="12" fill="#FFFFFF" />
          <circle cx="7.5" cy="6.5" r="3" fill="#FFFFFF" />
          <circle cx="8.6" cy="6.3" r="2.7" fill="#EF3340" />
        </>
      );
    case "TH":
      return (
        <>
          <rect width="24" height="24" fill="#A51931" />
          <rect y="4" width="24" height="16" fill="#F4F5F8" />
          <rect y="8" width="24" height="8" fill="#2D2A4A" />
        </>
      );
    case "KR":
      return (
        <>
          <rect width="24" height="24" fill="#FFFFFF" />
          <path d="M7 12a5 5 0 0 1 10 0z" fill="#CD2E3A" />
          <path d="M7 12a5 5 0 0 0 10 0z" fill="#0047A0" />
          <rect x="3" y="4.5" width="3" height="1" fill="#000000" transform="rotate(-35 4.5 5)" />
          <rect x="18" y="4.5" width="3" height="1" fill="#000000" transform="rotate(35 19.5 5)" />
          <rect x="3" y="18.5" width="3" height="1" fill="#000000" transform="rotate(35 4.5 19)" />
          <rect x="18" y="18.5" width="3" height="1" fill="#000000" transform="rotate(-35 19.5 19)" />
        </>
      );
    case "CN":
      return (
        <>
          <rect width="24" height="24" fill="#EE1C25" />
          <path d="M8 4.5l1.2 3.6h3.8l-3.1 2.2 1.2 3.6L8 11.7l-3.1 2.2 1.2-3.6-3.1-2.2h3.8z" fill="#FFFF00" />
        </>
      );
    case "ID":
      return (
        <>
          <rect width="24" height="12" fill="#E30B20" />
          <rect y="12" width="24" height="12" fill="#FFFFFF" />
        </>
      );
  }
}

export function Bendera({ kode, size = 26 }: { kode: Kode; size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <defs>
        <clipPath id={id}>
          <circle cx="12" cy="12" r="11" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <Isi kode={kode} />
      </g>
      <circle cx="12" cy="12" r="11" fill="none" stroke="#00000022" strokeWidth="1" />
    </svg>
  );
}
