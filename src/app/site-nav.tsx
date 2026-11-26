"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

const links = [
  { id: "tentang", label: "Tentang" },
  { id: "minat", label: "Minat" },
  { id: "tugas", label: "Tugas" },
  { id: "arah", label: "Arah" },
];

/**
 * Floating pill navigation. A coral marker with two little cat ears slides to the
 * section currently in view; the pill tightens up once the page is scrolled.
 * When the visitor rests inside a section, the menu melts into the "mozza." wordmark,
 * which grows a pair of cat ears; scrolling, hovering, focusing or tapping it opens it again.
 * On small screens the same pill becomes a dock at the bottom of the screen.
 */
const COLLAPSE_DELAY = 1400;

export default function SiteNav() {
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);
  const activeRef = useRef<string | null>(null);
  const holdRef = useRef(false);
  const tapWasCollapsed = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setCollapsedState = useCallback((value: boolean) => {
    collapsedRef.current = value;
    setCollapsed(value);
  }, []);
  const scheduleCollapse = useCallback(
    (delay = COLLAPSE_DELAY) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (activeRef.current && !holdRef.current) setCollapsedState(true);
      }, delay);
    },
    [setCollapsedState],
  );
  const expand = useCallback(() => {
    clearTimeout(timerRef.current);
    setCollapsedState(false);
  }, [setCollapsedState]);

  // Scroll spy; any scroll opens the menu, resting closes it again.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
      const line = window.innerHeight * 0.38;
      let current: string | null = null;
      for (const { id } of links) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= line)
          current = id;
      }
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom && window.scrollY > 0) current = links[links.length - 1].id;
      activeRef.current = current;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
      if (collapsedRef.current) setCollapsedState(false);
      scheduleCollapse();
    };
    update();
    scheduleCollapse();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(timerRef.current);
    };
  }, [scheduleCollapse, setCollapsedState]);

  const onPointerEnter = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    holdRef.current = true;
    expand();
  };
  const onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    holdRef.current = false;
    scheduleCollapse();
  };
  const onFocus = (e: FocusEvent) => {
    if (!(e.target as HTMLElement).matches(":focus-visible")) return;
    holdRef.current = true;
    expand();
  };
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    holdRef.current = false;
    scheduleCollapse();
  };
  // On touch, the first tap on the collapsed wordmark opens the menu instead of jumping to the top.
  const onBrandClick = (e: MouseEvent) => {
    if (!tapWasCollapsed.current) return;
    tapWasCollapsed.current = false;
    e.preventDefault();
    expand();
    scheduleCollapse(4000);
  };

  const placeMarker = useCallback(() => {
    const list = listRef.current;
    const marker = markerRef.current;
    if (!list || !marker) return;
    const current = list.querySelector<HTMLElement>(
      '[aria-current="location"]',
    );
    if (!current) {
      marker.dataset.visible = "false";
      return;
    }
    marker.style.setProperty("--x", `${current.offsetLeft}px`);
    marker.style.setProperty("--w", `${current.offsetWidth}px`);
    marker.dataset.visible = "true";
  }, []);

  // Slide the marker and let the ears perk up whenever the section changes.
  useEffect(() => {
    placeMarker();
    const marker = markerRef.current;
    if (!marker || !active) return;
    marker.classList.remove("perk");
    void marker.offsetWidth;
    marker.classList.add("perk");
  }, [active, placeMarker]);

  // Links stretch with the dock on phones (and while it unfolds), so re-measure on every size change.
  useEffect(() => {
    const list = listRef.current;
    const observer = new ResizeObserver(placeMarker);
    if (list) {
      observer.observe(list);
      list.querySelectorAll(".nav-link").forEach((link) => observer.observe(link));
    }
    document.fonts?.ready.then(placeMarker);
    return () => observer.disconnect();
  }, [placeMarker]);

  return (
    <nav
      className="site-nav"
      data-scrolled={scrolled}
      data-collapsed={collapsed}
      aria-label="Navigasi utama"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <div className="nav-pill">
        <a
          className="nav-brand"
          href="#beranda"
          aria-label={
            collapsed ? "Mozza, tampilkan menu" : "Mozza, kembali ke beranda"
          }
          onPointerDown={() => {
            tapWasCollapsed.current = collapsedRef.current;
          }}
          onClick={onBrandClick}
        >
          <span className="nav-brand-text">
            mozza<span>.</span>
          </span>
          <svg
            className="brand-cat"
            viewBox="0 0 32 30"
            fill="none"
            aria-hidden="true"
          >
            <path
              className="brand-ear brand-ear-l"
              d="M5.2 16.5 4.6 4.4l8.6 5.4Z"
              fill="currentColor"
            />
            <path
              className="brand-ear brand-ear-r"
              d="M26.8 16.5l.6-12.1-8.6 5.4Z"
              fill="currentColor"
            />
            <path
              d="M16 8.2c7.2 0 11.6 4.5 11.6 10.1S22.9 28 16 28 4.4 23.9 4.4 18.3 8.8 8.2 16 8.2Z"
              fill="currentColor"
            />
            <ellipse
              className="brand-eye"
              cx="11.4"
              cy="17.6"
              rx="1.5"
              ry="1.9"
              fill="#fff8ed"
            />
            <ellipse
              className="brand-eye"
              cx="20.6"
              cy="17.6"
              rx="1.5"
              ry="1.9"
              fill="#fff8ed"
            />
            <path
              d="M14 21.6q1 1.1 2 0 1 1.1 2 0"
              stroke="#fff8ed"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        </a>
        <div className="nav-extra">
          <div className="nav-extra-inner">
            <span className="nav-divider" aria-hidden="true" />
            <div className="nav-list" ref={listRef}>
              <span
                className="nav-marker"
                ref={markerRef}
                data-visible="false"
                aria-hidden="true"
              />
              {links.map((link) => (
                <a
                  className="nav-link"
                  href={`#${link.id}`}
                  key={link.id}
                  aria-current={active === link.id ? "location" : undefined}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
