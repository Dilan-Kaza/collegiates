import { ImgHeader } from "@/app/layouts/headers";
import { NavBar } from "@/app/components/navbar";
import { UserLayout } from "@/app/layouts/user";

export default function Multimedia() {
  return (
    <UserLayout navBar={<NavBar/>} header={<ImgHeader/>}>
      <div>Multimedia</div>
    </UserLayout>
  );
}
