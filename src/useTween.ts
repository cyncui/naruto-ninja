import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/** Eases a displayed number toward `target`; jumps when `instant`. */
export function useTween(target: number, instant: boolean) {
  const [value, setValue] = useState(target);
  const current = useRef({ value: target });
  useEffect(() => {
    if (instant) {
      current.current.value = target;
      setValue(target);
      return;
    }
    const tween = gsap.to(current.current, {
      value: target,
      duration: 0.6,
      ease: "power3.out",
      onUpdate: () => setValue(current.current.value),
    });
    return () => {
      tween.kill();
    };
  }, [target, instant]);
  return value;
}
