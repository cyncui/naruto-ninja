import { useEffect, useRef, useState } from "react";

const noise = "ABCDEFGHIJKLNOPQRSTUVXYZ0123456789#%/<>=+";
const duration = 420;
const frame = 32;

// Decodes the label left to right when its link or button is hovered or
// focused. The real text stays in the accessibility tree and holds the width.
export default function Scramble({ text }: { text: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    setDisplay(text);
    const trigger = root.current?.closest("a, button");
    if (!trigger) return;
    let timer: number | undefined;
    const run = () => {
      if (
        matchMedia("(prefers-reduced-motion: reduce)").matches ||
        trigger.closest('[data-reduced-motion="true"]')
      )
        return;
      clearInterval(timer);
      const start = performance.now();
      timer = window.setInterval(() => {
        const progress = (performance.now() - start) / duration;
        if (progress >= 1) {
          clearInterval(timer);
          setDisplay(text);
          return;
        }
        setDisplay(
          [...text]
            .map((char, i) =>
              char === " " || i / text.length < progress
                ? char
                : noise[Math.floor(Math.random() * noise.length)],
            )
            .join(""),
        );
      }, frame);
    };
    trigger.addEventListener("pointerenter", run);
    trigger.addEventListener("focus", run);
    return () => {
      clearInterval(timer);
      trigger.removeEventListener("pointerenter", run);
      trigger.removeEventListener("focus", run);
    };
  }, [text]);
  return (
    <>
      <span className="scramble" ref={root} aria-hidden="true">
        <span className="scramble-sizer">{text}</span>
        <span>{display}</span>
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}
