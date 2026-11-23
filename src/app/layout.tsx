import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magnite Prototype · mock data",
  description: "Mock Salesforce-shaped tables backing the Mandala prototypes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
