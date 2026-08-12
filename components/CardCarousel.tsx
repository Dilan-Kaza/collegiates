"use client";

import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";

export interface CarouselCard {
  // Stable slug a deep link can name (see `initialId`). Optional so callers
  // that only ever open on the first card don't have to invent one.
  id?: string;
  title: string;
  content: ReactNode;
}

// `initialId` opens the carousel on the card with that `id`, so pages can link straight to one
// rule. An id matching nothing (a stale or hand-typed link) falls back to the first card.
export default function CardCarousel({ cards, initialId }: { cards: CarouselCard[]; initialId?: string }) {
  const linkedIndex = initialId ? cards.findIndex((c) => c.id === initialId) : -1;

  const [current, setCurrent] = useState(linkedIndex >= 0 ? linkedIndex : 0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // A link to a different section while this page is already open changes the
  // prop, not the mounted component, so the initial state above never re-runs.
  useEffect(() => {
    if (linkedIndex >= 0) setCurrent(linkedIndex);
  }, [linkedIndex]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [current]);

  const prev = () => setCurrent((i) => Math.max(i - 1, 0));
  const next = () => setCurrent((i) => Math.min(i + 1, cards.length - 1));

  const card = cards[current];

  return (
    // Fills whatever height the page hands it, so the card itself is the page.
    <div className="flex flex-1 min-h-0 w-full flex-col">
      {/* The white surface is its own layer so the edge fade masks the background
          only — the text on top stays fully opaque. */}
      <div className="relative flex-1 min-h-0 mx-2 sm:mx-6">
        <div aria-hidden className="cg-fade-edges pointer-events-none absolute inset-0 bg-white/85" />
        {/* Horizontal padding clears the arrows so no line of text ever runs
            underneath them; vertical padding still matches the scroll fade. */}
        <div ref={scrollRef} className="cg-fade-scroll relative h-full overflow-auto px-11 sm:px-20 py-2 sm:py-8">
          <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-6">{card.title}</h2>
          {card.content}
        </div>

        <button
          onClick={prev}
          aria-label="Previous section"
          className={`btn btn-circle btn-ghost btn-sm sm:btn-md bg-tertiary/25 hover:bg-tertiary/40 text-primary absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 ${current === 0 ? "invisible" : ""}`}
        >
          <i className="bi bi-chevron-left" />
        </button>

        <button
          onClick={next}
          aria-label="Next section"
          className={`btn btn-circle btn-ghost btn-sm sm:btn-md bg-tertiary/25 hover:bg-tertiary/40 text-primary absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 ${current === cards.length - 1 ? "invisible" : ""}`}
        >
          <i className="bi bi-chevron-right" />
        </button>

        {/* Dots and counter both float over the card's bottom edge rather than
            below it, so they cost the card no height. The dot strip spans the
            full width to stay centred, so it is click-through everywhere except
            the dots themselves — otherwise it would swallow scroll gestures. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 sm:bottom-8 flex flex-wrap justify-center gap-1.5 sm:gap-2 opacity-60">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              title={cards[i].title}
              className={`pointer-events-auto w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition ${
                i === current ? "bg-primary" : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>

        <p className="hidden sm:block pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-sm text-gray-400 opacity-60">
          {current + 1} / {cards.length}
        </p>
      </div>
    </div>
  );
}
