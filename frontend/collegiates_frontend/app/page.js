"use client";
import { Carousel } from "./components/carousel";
import { Timeline } from "./components/timeline";
import { Heading } from "./components/heading";
import { CWCReps } from "./components/cwcReps";
import { UserLayout } from "./layouts/layouts";

export default function Home() {
  // TODO: make more flexible to add/remove/change images
  const carouselImages = ["test_img_1.png", "test_img_2.png", "test_img_3.png", "test_img_4.png"];

  return (
    <UserLayout header={null}>
      <div className="relative overflow-hidden">
        <img className="w-full object-center object-fit -z-10" src="/test_img_4.png" />
        <div className="absolute inset-10 flex flex-col items-center justify-center">
          <Heading className="text-8xl animate-fadeIn text-secondary align-middle z-10">
            Welcome to Collegiate Wushu
          </Heading>
        </div>
      </div>
      

      <div className="py-6 bg-off-white">
        <Carousel imgs={carouselImages} />
      </div>

      <div className="py-[12rem] bg-primary text-secondary">
        <Timeline />
      </div>

      <div className="py-[6rem] bg-off-white">
        <CWCReps />
      </div>
    </UserLayout>
  );
}
