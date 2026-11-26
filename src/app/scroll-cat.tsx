"use client";

import { useEffect, useRef } from "react";
import { createCat, drawCat, updateCat } from "./cat-engine";

/** Logical canvas size in cat units; the cat is drawn around its centre. */
const VIEW = 210;

export default function ScrollCat() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let scale = 1;
    let cssSize = VIEW;
    let dpr = 1;
    let cx = 0;
    let frame = 0;
    let last = 0;

    const layout = () => {
      const w = window.innerWidth;
      scale = w < 720 ? 0.6 : w < 1100 ? 0.85 : 1.05;
      cssSize = VIEW * scale;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssSize * dpr);
      canvas.height = Math.round(cssSize * dpr);
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;
      const shell = Math.min(1180, w - (w < 720 ? 32 : 64));
      const margin = (w - shell) / 2;
      cx = w - Math.max(margin / 2, w < 720 ? 14 : 30 * scale);
    };

    const targetY = () => {
      const h = window.innerHeight;
      if (reducedMotion.matches) return h - cssSize * 0.4;
      const maxScroll = document.documentElement.scrollHeight - h;
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
      return h * (0.2 + progress * 0.6);
    };

    layout();
    const cat = createCat(targetY());

    const render = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const k = dpr * scale;
      ctx.setTransform(k, 0, 0, k, canvas.width / 2, canvas.height / 2);
      ctx.rotate(cat.heading);
      drawCat(ctx, cat, { x: 2.4 * k, y: 4 * k, blur: 5 * k });
      canvas.style.transform = `translate3d(${cx - cssSize / 2}px, ${cat.y - cssSize / 2}px, 0)`;
    };

    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      updateCat(cat, dt, targetY());
      render();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (reducedMotion.matches) {
        // A calm, seated cat with no motion.
        cat.y = targetY();
        cat.sit = 1;
        render();
      } else {
        frame = requestAnimationFrame(tick);
      }
    };

    const onResize = () => {
      layout();
      if (reducedMotion.matches) start();
    };

    start();
    window.addEventListener("resize", onResize);
    reducedMotion.addEventListener("change", start);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      reducedMotion.removeEventListener("change", start);
    };
  }, []);

  return <canvas className="scroll-cat" aria-hidden="true" ref={canvasRef} />;
}
