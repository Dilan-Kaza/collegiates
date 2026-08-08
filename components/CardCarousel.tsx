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
    <div className="max-w-3xl mx-auto px-1 pt-2 pb-2 sm:px-6 sm:py-10">
      <div ref={scrollRef} className="bg-white rounded-lg shadow p-2 sm:p-8 overflow-auto h-[70vh] sm:h-[75vh]">
        <h2 className="text-sm sm:text-2xl font-bold mb-1 sm:mb-6">{card.title}</h2>
        {card.content}
      </div>

      <div className="grid grid-cols-3 items-center mt-4 sm:mt-6">
        <button
          onClick={prev}
          className={`btn btn-sm sm:btn-md bg-white text-primary justify-self-start ${current === 0 ? "invisible" : ""}`}
        >
          Previous
        </button>

        <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-center">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              title={cards[i].title}
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition ${
                i === current ? "bg-primary" : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className={`btn btn-sm sm:btn-md btn-primary justify-self-end ${current === cards.length - 1 ? "invisible" : ""}`}
        >
          Next
        </button>
      </div>

      <p className="hidden sm:block text-center text-sm text-gray-400 mt-3">
        {current + 1} / {cards.length}
      </p>
    </div>
  );
}
