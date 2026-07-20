"use client";

import { Carousel, Timeline, Heading, CWCReps, BlogPosts } from "@components";
import { Link } from "@/routerCompat";
import type { SettingsDTO, BlogDTO } from "@/lib/api";
// home landing content

export default function Home({ settings = {}, posts = [] }: { settings?: Partial<SettingsDTO>; posts?: BlogDTO[] }) {
  // TODO: make more flexible to add/remove/change images
  const carouselImages = ["carousel/2025NQ.jpg", "carousel/2025QS.jpg", "carousel/2025GS.jpg", "carousel/2026QS.JPG"];

  return (
    <>
      <div className="relative overflow-hidden">
        <img className="w-full object-center object-fit -z-10" src="/test_img_4.png" />
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

      <div className="py-8 md:py-[12rem] bg-primary text-secondary">
        <Timeline settings={settings} />
      </div>

      <div className="py-8 md:py-[6rem] bg-off-white">
        <CWCReps />
      </div>
    </>
  );
}
