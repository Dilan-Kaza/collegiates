import Link from "next/link";
import { ButtonInverse } from "./button";
import Image from "next/image";

const tabs = ["News", "Multimedia", "Tournament", "Rules", "About"];

function NavBar() {
  return (
    <div className="flex fixed w-[80%] top-4 left-[10%] p-4 bg-primary text-off-white rounded-lg px-12 z-100">
      <div className="justify-between flex w-full">
        <div className="flex gap-10 items-center">
          
          <Link href="/"><Image
                    src="/wushu_logo.png"
                    alt="logo"
                    width={100}
                    height={100}
                    className="object-cover rounded-[2rem]"
                  /></Link>
          {tabs.map((tab) => (
            <Link href={`/${tab.toLowerCase().replace(/\s/g, "")}`} key={tab}>
              {tab}
            </Link>
          ))}
        </div>
        <ButtonInverse className="bg-white" isLink={true}>Sign In</ButtonInverse>
      </div>
    </div>
  );
}

export { NavBar };
