// Minimal line-icon set for primary navigation — replaces emoji so the tab bar and
// quick-nav read as one consistent system instead of mixed OS emoji glyphs.
// Shared spec: 24x24 viewBox, stroke = currentColor (inherits button text color),
// 1.8px stroke, round caps/joins, no fill (except the tiny gauge needle dot).

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Svg({ size, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} style={{ display: "block" }}>
      {children}
    </svg>
  );
}

export function IconHome({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9h5v-5h2v5h5v-9" />
    </Svg>
  );
}

export function IconCalendar({ size = 18 }) {
  return (
    <Svg size={size}>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M4 9.5h16" />
      <path d="M8 3v4M16 3v4" />
      <path d="M9 13.5h2M13 13.5h2M9 16.5h2M13 16.5h2" />
    </Svg>
  );
}

export function IconEating({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M7 3v5a2 2 0 0 0 4 0V3" />
      <path d="M9 8v13" />
      <path d="M16 3c2.2 1 3.2 3 3.2 6s-1 5-3.2 6" />
      <path d="M16 3v18" />
    </Svg>
  );
}

export function IconGrocery({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M6 8h12l-1 12.5H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Svg>
  );
}

export function IconFlag({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M6 3v18" />
      <path d="M6 4.5h12l-3 3.75 3 3.75H6" />
    </Svg>
  );
}

export function IconShirt({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M8 4 12 6l4-2 3 3-3 3v10H8V10L5 7l3-3Z" />
    </Svg>
  );
}

export function IconGauge({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M4.5 15a7.5 7.5 0 0 1 15 0" />
      <path d="M12 15l3.6-3.6" />
      <circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconDroplet({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M12 3.5c3 3.8 6 7.2 6 10.8a6 6 0 0 1-12 0c0-3.6 3-7 6-10.8Z" />
    </Svg>
  );
}

export function IconLog({ size = 18 }) {
  return (
    <Svg size={size}>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2.5" />
      <path d="M9 3.5v3h6v-3" />
      <path d="m8.5 12 2 2 4-4.5" />
      <path d="M8 16.5h8" />
    </Svg>
  );
}

export function IconDumbbell({ size = 18 }) {
  return (
    <Svg size={size}>
      <path d="M4 10v4M2.5 9.5v5M6.5 8v8" />
      <path d="M20 10v4M21.5 9.5v5M17.5 8v8" />
      <path d="M6.5 12h11" />
    </Svg>
  );
}
