import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Control studio · Hospital Planning",
};

export default function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
