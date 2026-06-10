import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StoreProvider from "./storeProvider";

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
          {children}
        </body>
      </html>
    </StoreProvider>
  );
}
