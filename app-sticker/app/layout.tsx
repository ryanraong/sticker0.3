import "./styles.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sticker Studio",
  description: "Personalized sticker batch creator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
