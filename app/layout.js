import "./globals.css";

export const metadata = {
  title: "UP Network — Affiliate Panel",
  description:
    "Modern CPA affiliate network and performance tracking platform",
  icons: {
    icon: "/file_0000000013688207a03d42a2550c1954.png",
    shortcut: "/file_0000000013688207a03d42a2550c1954.png",
    apple: "/file_0000000013688207a03d42a2550c1954.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}