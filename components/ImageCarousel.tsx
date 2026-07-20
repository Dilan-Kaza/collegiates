"use client";

function Carousel({ imgs }: { imgs: string[] }) {
  return (
    <>
      <div className="overflow-hidden w-full relative">
        <div className="absolute top-0 left-0 w-[8rem] sm:w-[25rem] h-full bg-gradient-to-r from-primary to-transparent z-10" />
        <div className="absolute top-0 right-0 w-[8rem] sm:w-[25rem] h-full bg-gradient-to-l from-primary to-transparent z-10" />
        <div className="flex sm:gap-2 w-max animate-scroll transform-gpu">
          {[...imgs, ...imgs].map((carouselImg, index) => (
            <CarouselSquare key={index} src={carouselImg} />
          ))}
        </div>
      </div>
    </>
  );
}

function CarouselSquare({ src }: { src: string }) {
  return (
    <>
      <div className="bg-gray-400 h-[2rem] w-[2rem] sm:h-[18rem] sm:w-[18rem] sm:rounded-[2rem] relative">
        <img
          src={`/${src}`}
          alt="Carousel image"
          className="h-full w-full object-cover sm:rounded-[2rem]"
        />
      </div>
    </>
  );
}

export { Carousel, CarouselSquare };
