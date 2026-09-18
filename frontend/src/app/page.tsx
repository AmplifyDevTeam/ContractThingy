import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getSessionFromCookie();
  redirect(session ? "/dashboard" : "/login");
}
