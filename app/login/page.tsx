import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { LoginForm } from "./login-form";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/app");

  return <LoginForm />;
}
