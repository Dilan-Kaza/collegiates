import Link from "next/link";
import Image from "next/image";
import { useCurrentUser } from "@/hooks/userApiHooks";
import { useRouter } from "next/navigation";

const tabs = ["Tournament", "Rules", "About"];

function NavBar() {

  const username = useCurrentUser().first_name;
  const router = useRouter();

  return (
    <div className="fixed w-[70%] top-4 left-[15%] p-4 bg-primary text-off-white rounded-lg px-12 z-100">
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
        {username ? 
          <button className="btn btn-off-white btn-outline" onClick={()=>router.push('/dashboard')}>{username}</button> :
          <button className="btn btn-off-white btn-outline" onClick={()=>router.push('/signin')}>Sign In</button>
        }
      </div>
    </div>
  );
}

export { NavBar };
