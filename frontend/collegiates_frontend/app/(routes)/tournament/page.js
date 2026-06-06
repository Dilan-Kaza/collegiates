import { UserLayout } from "@/app/layouts/user";
import { NavBar } from "@/app/components/navbar";
import { ImgHeader } from "@/app/layouts/headers";

export default function Tournament() {
  return (
    <UserLayout navBar={<NavBar/>} header={<ImgHeader/>}>
      <div>Tournament</div>
    </UserLayout>
  );
}
