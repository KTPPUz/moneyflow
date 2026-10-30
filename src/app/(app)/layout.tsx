import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "@/components/providers";
import { currentUser } from "@/lib/auth";
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <Providers>
      <AppShell userName={user.name}>{children}</AppShell>
    </Providers>
  );
}
