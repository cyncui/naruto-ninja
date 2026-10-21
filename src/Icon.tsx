// NERV-style glyphs on a 16-unit grid: square caps, mitred joins, chamfered
// corners in place of curves.
const paths = {
  arrow: <path d="M4 12 12 4M6 4h6v6" />,
  reset: <path d="M3 8V5.5L5.5 3h5L13 5.5v5L10.5 13H6M3 4v4h4" />,
  record: <path d="M5.5 3h5L13 5.5v5L10.5 13h-5L3 10.5v-5Z" className="fill" />,
  stop: <path d="M4 4h8v8H4Z" className="fill" />,
  library: (
    <path d="M2.5 3.5h11M2.5 8h11M2.5 12.5h11M2.5 2v3M2.5 6.5v3M2.5 11v3" />
  ),
  calibrate: (
    <path d="M2 5.5V2h3.5M10.5 2H14v3.5M14 10.5V14h-3.5M5.5 14H2v-3.5M8 5v6M5 8h6" />
  ),
  check: <path d="M2.5 8.5 6 12l7.5-8" />,
  close: <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />,
  plus: <path d="M8 3v10M3 8h10" />,
  scroll: <path d="M1.5 8h13M4.5 5 1.5 8l3 3M11.5 5l3 3-3 3" />,
  selected: <path d="M4 4h8v8H4Z" className="fill" />,
} as const;

export type IconName = keyof typeof paths;

export default function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`icon icon-${name} ${className}`}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
