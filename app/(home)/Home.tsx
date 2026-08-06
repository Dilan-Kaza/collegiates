"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Carousel, Timeline, Heading, CWCReps, BlogPosts } from "@components";
import { Link } from "@/routerCompat";
import type { SettingsDTO, BlogDTO } from "@/lib/api";
// home landing content

// To add/remove a carousel image, drop the file in `public/carousel/` and list
// its name here. Built once at module load rather than on every render.
const CAROUSEL_IMAGES = [
  "2025NQ.jpg",
  "2025QS.jpg",
  "2025GS.jpg",
  "2026QS.jpg",
  "2026DS.jpg",
  "2026JS.jpg",
  "2026JS2.jpg",
  "2026ND.jpg",
  "2026OW.jpg",
].map((file) => `carousel/${file}`);

function shuffled(imgs: readonly string[]) {
  const out = [...imgs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function Home({ settings = {}, posts = [] }: { settings?: Partial<SettingsDTO>; posts?: BlogDTO[] }) {
  // The first client render has to match the server HTML, so the order is
  // scrambled right after hydration instead of during render. Same nine files
  // either way, so the reorder costs no extra image requests.
  const [carouselImages, setCarouselImages] = useState<string[]>(CAROUSEL_IMAGES);
  useEffect(() => {
    setCarouselImages(shuffled(CAROUSEL_IMAGES));
  }, []);

  return (
    <>
      <div className="relative overflow-hidden">
        {/* The above-the-fold hero: `priority` preloads it instead of letting it
            load lazily, and next/image serves a right-sized, modern-format file
            in place of the 1.4MB PNG. */}
        <Image
          className="w-full object-center object-fit -z-10"
          src="/test_img_4.png"
          alt=""
          width={1198}
          height={657}
          priority
        />
        <div className="absolute inset-10 flex flex-col items-center justify-center">
          <Heading className="text-xl md:text-8xl animate-fadeIn text-secondary align-middle z-10">
            Welcome to Collegiate Wushu
          </Heading>
        </div>
      </div>


      <div className="py-1 sm:py-6 bg-primary">
        <Carousel imgs={carouselImages} />
      </div>

      <div className="py-8 bg-off-white px-[10%]">
        <div className="flex gap-6 mb-4 justify-center">
          <Link to="/news" className="text-2xl font-semibold text-primary hover:underline">News</Link>
          <span className="text-2xl text-primary">/</span>
          <Link to="/multimedia" className="text-2xl font-semibold text-primary hover:underline">Multimedia</Link>
        </div>
        <BlogPosts posts={posts} />
      </div>

      <div className="py-8 md:py-24 bg-primary text-secondary">
        <Timeline settings={settings} />
      </div>

      <div className="py-8 md:py-[6rem] bg-off-white">
        <CWCReps />
      </div>
    </>
  );
}
