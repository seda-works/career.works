import localFont from "next/font/local";

// Career.works typography, shared with seda.works: Geist for body/UI, Bricolage
// Grotesque for display headings, Geist Mono for eyebrows and data. Latin and
// latin-ext variable subsets are vendored (latin-ext carries Turkish ı ş ğ İ),
// so an offline production build never contacts a font CDN.
export const geist = localFont({
  src: [
    { path: "../assets/fonts/geist/Geist-latin-wght.woff2", weight: "100 900", style: "normal" },
    { path: "../assets/fonts/geist/Geist-latin-ext-wght.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-geist",
  display: "swap",
});

export const bricolage = localFont({
  src: [
    { path: "../assets/fonts/bricolage/Bricolage-latin-wght.woff2", weight: "200 800", style: "normal" },
    { path: "../assets/fonts/bricolage/Bricolage-latin-ext-wght.woff2", weight: "200 800", style: "normal" },
  ],
  variable: "--font-bricolage",
  display: "swap",
});

export const geistMono = localFont({
  src: [
    { path: "../assets/fonts/geist-mono/GeistMono-latin-wght.woff2", weight: "100 900", style: "normal" },
    { path: "../assets/fonts/geist-mono/GeistMono-latin-ext-wght.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});
