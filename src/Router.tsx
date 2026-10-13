import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { gsap } from "gsap";
import Lenis from "lenis";
import App from "./App";
import FieldGuide from "./FieldGuide";
import { site } from "./data/site";

const readPath = () => location.pathname.replace(/\/$/, "") || "/";
function updateMetadata(path: string) {
  const missing = path !== "/" && path !== "/guide";
  const title = missing
    ? "Missing scroll | Naruto Ninja"
    : path === "/guide"
      ? "Field guide | Naruto Ninja"
      : "Naruto Ninja | Hand seal practice";
  const description = missing
    ? "This training scroll went missing. Return to Naruto Ninja to practice hand seals or read the field guide."
    : path === "/guide"
      ? "Learn how to practice Naruto hand seals, calibrate local camera tracking and interpret the experimental technique library."
      : site.description;
  document.title = title;
  document
    .querySelector('meta[property="og:title"]')
    ?.setAttribute("content", title);
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", description);
  document
    .querySelector('meta[property="og:description"]')
    ?.setAttribute("content", description);
  document.querySelector('link[rel="canonical"]')?.remove();
  document.querySelector('meta[name="robots"]')?.remove();
  if (site.url) {
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = site.url + (path === "/" ? "/" : path);
    document.head.append(canonical);
  }
  if (missing) {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.append(robots);
  }
}

export default function Router() {
  const [path, setPath] = useState(readPath);
  const curtain = useRef<HTMLDivElement>(null);
  useEffect(() => {
    updateMetadata(path);
    if (path === "/" || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const lenis = new Lenis({ autoRaf: false, anchors: true });
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [path]);
  useEffect(() => {
    let transition: gsap.core.Timeline | undefined;
    const swap = (next: string, focus: boolean) => {
      flushSync(() => setPath(next));
      window.scrollTo(0, 0);
      if (focus)
        document.getElementById("main")?.focus({ preventScroll: true });
    };
    gsap.set(curtain.current, { autoAlpha: 1, scaleY: 0 });
    const click = (event: MouseEvent) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (
        !link ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target ||
        link.hasAttribute("download")
      )
        return;
      const next = new URL(link.href);
      if (
        next.origin !== location.origin ||
        next.hash ||
        !["/", "/guide"].includes(next.pathname)
      )
        return;
      event.preventDefault();
      if (next.pathname === readPath()) return;
      transition?.kill();
      const commit = () => {
        history.pushState(null, "", next.pathname);
        swap(next.pathname, true);
      };
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        commit();
        return;
      }
      transition = gsap
        .timeline()
        .set(curtain.current, { transformOrigin: "bottom", scaleY: 0 })
        .to(curtain.current, {
          scaleY: 1,
          duration: 0.22,
          ease: "power3.inOut",
        })
        .call(commit)
        .set(curtain.current, { transformOrigin: "top" })
        .to(curtain.current, {
          scaleY: 0,
          duration: 0.24,
          ease: "power3.inOut",
        });
    };
    const pop = () => {
      transition?.kill();
      gsap.set(curtain.current, { scaleY: 0 });
      swap(readPath(), false);
    };
    document.addEventListener("click", click);
    window.addEventListener("popstate", pop);
    return () => {
      transition?.kill();
      document.removeEventListener("click", click);
      window.removeEventListener("popstate", pop);
    };
  }, []);
  return (
    <>
      {path === "/" ? <App /> : <FieldGuide missing={path !== "/guide"} />}
      <div
        ref={curtain}
        className="route-curtain"
        style={{ visibility: "hidden" }}
        aria-hidden="true"
      />
    </>
  );
}
