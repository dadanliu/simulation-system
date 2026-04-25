import { AppShell } from "@/src/components/app-shell";
import { getCurrentUser } from "@/src/features/auth/server";

export default async function PresentLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  return <AppShell currentUser={currentUser}>{children}</AppShell>;
}
