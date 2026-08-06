"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./UserGallery.module.css";

export default function UserGallery({ items }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const closeRef = useRef(null);
  const active = activeIndex === null ? null : items[activeIndex];
  const move = useCallback((step) => setActiveIndex((index) => (index + step + items.length) % items.length), [items.length]);
  useEffect(() => {
    if (!active) return undefined;
    const previous = document.activeElement;
    closeRef.current?.focus();
    function keydown(event) { if (event.key === "Escape") setActiveIndex(null); if (event.key === "ArrowRight") move(1); if (event.key === "ArrowLeft") move(-1); }
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus?.(); };
  }, [active, move]);
  return <><div className={styles.grid}>{items.map((item, index) => <button type="button" key={item.id || item.url} onClick={() => setActiveIndex(index)} aria-label={`Open ${item.caption || `work photo ${index + 1}`}`}><img src={item.url} alt={item.alt || item.caption || `Work sample ${index + 1}`} loading="lazy" /><span>{item.caption || "Work sample"}</span></button>)}</div>{active ? <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={active.caption || "Work photo"}><button ref={closeRef} className={styles.close} type="button" onClick={() => setActiveIndex(null)} aria-label="Close gallery"><X /></button><button type="button" onClick={() => move(-1)} aria-label="Previous photo"><ChevronLeft /></button><figure><img src={active.url} alt={active.alt || active.caption || "Work sample"} /><figcaption>{active.caption || "Work sample"}</figcaption></figure><button type="button" onClick={() => move(1)} aria-label="Next photo"><ChevronRight /></button></div> : null}</>;
}
