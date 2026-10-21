const segments: Record<string, string> = {
  a: "1.8,1.2 2.8,0.2 9.2,0.2 10.2,1.2 9.2,2.2 2.8,2.2",
  b: "10.8,1.8 11.8,2.8 11.8,9.4 10.8,10.4 9.8,9.4 9.8,2.8",
  c: "10.8,11.6 11.8,12.6 11.8,19.2 10.8,20.2 9.8,19.2 9.8,12.6",
  d: "1.8,20.8 2.8,19.8 9.2,19.8 10.2,20.8 9.2,21.8 2.8,21.8",
  e: "1.2,11.6 2.2,12.6 2.2,19.2 1.2,20.2 0.2,19.2 0.2,12.6",
  f: "1.2,1.8 2.2,2.8 2.2,9.4 1.2,10.4 0.2,9.4 0.2,2.8",
  g: "1.8,11 2.8,10 9.2,10 10.2,11 9.2,12 2.8,12",
};
const lit: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgedc",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
  "-": "g",
  " ": "",
};

export default function SevenSegment({
  value,
  label,
  className = "",
}: {
  value: string;
  label: string;
  className?: string;
}) {
  let x = 0;
  const glyphs = [...value].map((char, index) => {
    if (char === "." || char === ":") {
      const glyph = (
        <g key={index} transform={`translate(${x} 0)`} className="seg-on">
          {char === ":" && <rect x="0.6" y="6" width="2" height="2" />}
          <rect x="0.6" y={char === ":" ? 14 : 19.8} width="2" height="2" />
        </g>
      );
      x += 4;
      return glyph;
    }
    const on = lit[char] ?? "";
    const glyph = (
      <g key={index} transform={`translate(${x} 0)`}>
        {Object.entries(segments).map(([name, points]) => (
          <polygon
            key={name}
            points={points}
            className={on.includes(name) ? "seg-on" : "seg-off"}
          />
        ))}
      </g>
    );
    x += 15;
    return glyph;
  });
  return (
    <svg
      className={`seven-segment ${className}`}
      viewBox={`-1 -0.5 ${x + 1} 23`}
      role="img"
      aria-label={label}
    >
      <g transform="skewX(-7) translate(2.6 0)">{glyphs}</g>
    </svg>
  );
}
