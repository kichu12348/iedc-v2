import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "eFootball Tournament | Gaming Arena '26 | IEDC BOOTCAMP CEC",
  description:
    "Live standings, group tables, fixtures, and knockout bracket for the eFootball Tournament at Gaming Arena '26. Follow the action in real time!",
};

export default function EFootballLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
