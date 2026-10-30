import { redirect } from "next/navigation";
import { LoginScreen } from "@/features/auth/login-screen";
import { currentUser } from "@/lib/auth";
export default async function Page() {
  if (await currentUser()) redirect("/dashboard");
  return <LoginScreen />;
}
