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
      
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/org5cfx.css" />
        <link rel="stylesheet" href="https://use.typekit.net/zao2vdq.css" />
      </head>
      <body>
        <div
          id="bg-component"
          className="bg-tertiary fixed h-screen w-full absolute -top-[0svh] left-0 -z-20"
        ></div>
        <NavBar />
        <div
          className="antialiased text-dark font-grotesk w-[80%] translate-x-[12.5%] my-2"
        >
          <div className="mt-24">{children}</div>
        </div>
      </body>
    </html>
  );
}
