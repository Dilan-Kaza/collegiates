import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StoreProvider from "./storeProvider";
import { NavBar } from "./components/navbar";
import { SuccessNotif, ErrorNotif } from "./components/notif";

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
    <StoreProvider>
      <html lang="en">
        
        <head>
          <link rel="stylesheet" href="https://use.typekit.net/org5cfx.css" />
          <link rel="stylesheet" href="https://use.typekit.net/zao2vdq.css" />
        </head>
        <body>
          <div
                id="bg-component"
                className="bg-tertiary fixed h-screen w-full absolute -top-[0svh] left-0 -z-20"
            />

            <div className="">
                <NavBar/>
            </div>
            <div
                className="antialiased text-dark font-grotesk lg:w-[80%] lg:translate-x-[12.5%] my-2"
            >
              {children}
            </div>


          <SuccessNotif/>
          <ErrorNotif/>
        </body>
      </html>
    </StoreProvider>
  );
}
