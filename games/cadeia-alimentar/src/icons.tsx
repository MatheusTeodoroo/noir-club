import type { ReactNode } from 'react';
import type { Animal, Area } from './shared.ts';

// Gold silhouettes for the 13 animals and the 4 areas, drawn on a 64×64 grid in currentColor so
// the CSS decides the tone (gold on the board, crimson for the dead, dim for the unknown).

const ANIMAL_ART: Record<Animal, ReactNode> = {
  lion: (
    <>
      <path d="M32 4l5 7 8-4 1 9 9 0-3 8 8 5-7 6 5 8-9 2 1 9-9-2-3 9-6-6-6 6-3-9-9 2 1-9-9-2 5-8-7-6 8-5-3-8 9 0 1-9 8 4z" />
      <circle cx="32" cy="33" r="13" fill="var(--cag-ink, #0b0a0d)" />
      <path d="M22 30q10-9 20 0v6q-2 9-10 10-8-1-10-10z" />
      <circle cx="27" cy="32" r="1.8" fill="var(--cag-ink, #0b0a0d)" />
      <circle cx="37" cy="32" r="1.8" fill="var(--cag-ink, #0b0a0d)" />
      <path d="M29 38h6l-3 3z" fill="var(--cag-ink, #0b0a0d)" />
    </>
  ),
  crocodile: (
    <>
      <path d="M2 38q4-8 14-9l10-1 8-5 6 4 8-1 6 3 8 1q2 3 0 6l-10 3H34l-6 4-10 1-8-1-6-2z" />
      <path d="M44 40l2 6h4l-1-6zM24 41l1 6h4l1-6z" />
      <path d="M26 24l3-4 3 4zM34 24l3-4 3 4zM42 25l3-4 2 4z" />
      <circle cx="12" cy="33" r="1.6" fill="var(--cag-ink, #0b0a0d)" />
      <path d="M4 38h14" stroke="var(--cag-ink, #0b0a0d)" strokeWidth="1.4" fill="none" />
    </>
  ),
  eagle: (
    <>
      <path d="M32 18c-3 0-5 3-5 6l-4 2C16 20 9 16 2 15c4 6 8 9 13 12-4 0-7 1-10 3 6 1 11 1 15 0l4 5-3 10 6-4 4 8 4-8 6 4-3-10 4-5c4 1 9 1 15 0-3-2-6-3-10-3 5-3 9-6 13-12-7 1-14 5-21 11l-4-2c0-3-2-6-5-6z" />
      <path d="M31 21l3 2-3 1z" fill="var(--cag-ink, #0b0a0d)" />
    </>
  ),
  hyena: (
    <>
      <path d="M14 14l8 8h20l8-8 2 14-4 6-2 10-6 8H24l-6-8-2-10-4-6z" />
      <circle cx="25" cy="32" r="2" fill="var(--cag-ink, #0b0a0d)" />
      <circle cx="39" cy="32" r="2" fill="var(--cag-ink, #0b0a0d)" />
      <path d="M28 44h8l-4 4z" fill="var(--cag-ink, #0b0a0d)" />
      <circle cx="21" cy="40" r="1.4" fill="var(--cag-ink, #0b0a0d)" />
      <circle cx="43" cy="40" r="1.4" fill="var(--cag-ink, #0b0a0d)" />
      <circle cx="32" cy="25" r="1.4" fill="var(--cag-ink, #0b0a0d)" />
    </>
  ),
  snake: (
    <>
      <path
        d="M50 12c-6-4-14-2-16 4s4 10 2 15-12 3-18 6-8 12 0 15 16 0 22-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <ellipse cx="51" cy="12" rx="7" ry="5" />
      <circle cx="53" cy="10.5" r="1.3" fill="var(--cag-ink, #0b0a0d)" />
      <path d="M57 13l5 1-4 1 4 2-5-1z" />
    </>
  ),
  chameleon: (
    <>
      <path d="M10 30q4-12 18-12h12q10 0 14 8l6 2-6 3q-2 8-12 9H24q-6 0-8 4-2 6 3 8 4 1 5-3-1-3-4-2" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M14 30q2-14 16-14h10q12 0 16 10l-8 6H22z" />
      <circle cx="46" cy="24" r="4" fill="var(--cag-ink, #0b0a0d)" />
      <circle cx="46" cy="24" r="2" />
      <path d="M26 38l-2 8M38 38l2 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  crow: (
    <>
      <path d="M44 14c-6 0-10 4-11 9-8 2-16 8-20 16l-9 6 12-1 4 4 6-4h8l6-6c4-4 5-10 4-14l8-2-6-3c0-2-1-5-2-5z" />
      <circle cx="46" cy="18" r="1.6" fill="var(--cag-ink, #0b0a0d)" />
      <path d="M30 46l-2 8M36 44l1 10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  plover: (
    <>
      <ellipse cx="30" cy="28" rx="14" ry="9" />
      <circle cx="42" cy="20" r="6" />
      <path d="M47 19l10 2-10 2z" />
      <path d="M16 26l-10 4 10 2z" />
      <circle cx="43" cy="19" r="1.4" fill="var(--cag-ink, #0b0a0d)" />
      <path d="M26 36l-3 20M33 36l3 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  rat: (
    <>
      <path d="M12 40q0-14 18-16 12 0 18 8l8 4-8 2q-4 6-16 6H16z" />
      <circle cx="40" cy="26" r="6" />
      <circle cx="40" cy="26" r="3" fill="var(--cag-ink, #0b0a0d)" />
      <circle cx="49" cy="34" r="1.4" fill="var(--cag-ink, #0b0a0d)" />
      <path d="M14 40q-10 2-10 10t10 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  deer: (
    <>
      <path d="M24 26c-5-4-8-10-8-18M16 14l-6-4M18 20l-8 0M40 26c5-4 8-10 8-18M48 14l6-4M46 20l8 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 28l6-2h16l6 2-4 4-2 12-4 8h-8l-4-8-2-12z" />
      <circle cx="27" cy="34" r="1.8" fill="var(--cag-ink, #0b0a0d)" />
      <circle cx="37" cy="34" r="1.8" fill="var(--cag-ink, #0b0a0d)" />
      <ellipse cx="32" cy="50" rx="3" ry="2" fill="var(--cag-ink, #0b0a0d)" />
    </>
  ),
  mallard: (
    <>
      <path d="M8 38q4 12 22 12h12q12 0 14-12l-12 2q-8-2-16-1z" />
      <circle cx="40" cy="22" r="8" />
      <path d="M46 22l12 3-12 3z" />
      <path d="M34 28q-2 6 0 11" fill="none" stroke="currentColor" strokeWidth="6" />
      <path d="M33 30h10" stroke="var(--cag-ink, #0b0a0d)" strokeWidth="1.6" />
      <circle cx="42" cy="20" r="1.5" fill="var(--cag-ink, #0b0a0d)" />
    </>
  ),
  otter: (
    <>
      <path d="M6 44q6-8 18-10l12-2q10-8 18-4 6 4 4 10-4 6-14 6l-8 4q-10 4-22 2z" />
      <circle cx="50" cy="30" r="8" />
      <circle cx="52" cy="28" r="1.5" fill="var(--cag-ink, #0b0a0d)" />
      <path d="M58 33l5-1M58 35l5 1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 54q10-4 20 0t20 0 20 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  rabbit: (
    <>
      <path d="M22 30q-6-18-2-26 6 4 8 22zM42 30q6-18 2-26-6 4-8 22z" />
      <ellipse cx="32" cy="40" rx="14" ry="13" />
      <circle cx="26" cy="38" r="2" fill="var(--cag-ink, #0b0a0d)" />
      <circle cx="38" cy="38" r="2" fill="var(--cag-ink, #0b0a0d)" />
      <path d="M29 45h6l-3 3z" fill="var(--cag-ink, #0b0a0d)" />
    </>
  ),
};

const AREA_ART: Record<Area, ReactNode> = {
  river: (
    <path
      d="M4 22q7-8 14 0t14 0 14 0 14 0M4 36q7-8 14 0t14 0 14 0 14 0M4 50q7-8 14 0t14 0 14 0 14 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
  ),
  sky: <path d="M16 46a10 10 0 010-20 14 14 0 0127-4 10 10 0 015 24z" />,
  field: (
    <path
      d="M6 54h52M12 54q0-14 4-24M20 54q0-18-2-30M28 54q2-20 8-32M36 54q0-14 6-22M44 54q2-12 8-18M52 54q0-10-4-16"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  ),
  forest: (
    <>
      <path d="M20 6l12 18h-6l10 14h-7l9 12H6l9-12H8l10-14h-6z" />
      <path d="M44 16l9 14h-5l8 12h-6l7 10H34l7-10h-6l8-12h-5z" />
      <rect x="18" y="50" width="4" height="8" />
      <rect x="42" y="52" width="4" height="6" />
    </>
  ),
};

export function AnimalIcon({ animal, size = '1em', title }: { animal: Animal; size?: string | number; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: 'inline-block', verticalAlign: 'middle', flex: 'none' }}
    >
      {ANIMAL_ART[animal]}
    </svg>
  );
}

export function AreaIcon({ area, size = '1em' }: { area: Area; size?: string | number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
      style={{ display: 'inline-block', verticalAlign: 'middle', flex: 'none' }}
    >
      {AREA_ART[area]}
    </svg>
  );
}
