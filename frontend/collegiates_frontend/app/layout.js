import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "./components/navbar";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Collegiate Wushu",
  description: "Collegiate Wushu",
};

export default function RootLayout({ children }) {
  return (
    
    <html lang="en">
      <div
        id="bg-component"
        className="bg-primary fixed h-screen w-full absolute -top-[0svh] left-0 -z-20"
      ></div>
      <div
        id="bg-image"
        className="left-0 -top-[0svh] absolute content-center -z-10 mx-24"
      >
        <img src="/test_img_4.png"
              alt="group pic"
              className="w-10000 object-fill flex-col"
            />
      </div>
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/org5cfx.css" />
        <link rel="stylesheet" href="https://use.typekit.net/zao2vdq.css" />
      </head>
      <body
        className={`antialiased bg-off-white text-dark font-grotesk mx-24 my-2`}
      >
        <NavBar />
        <div className="mt-24">{children}</div>
      </body>
    </html>
  );
}
