import { AppShell } from "@/src/components/app-shell";

export default function PresentLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
