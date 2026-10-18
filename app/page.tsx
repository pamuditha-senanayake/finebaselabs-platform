import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, decodeSession } from "@/lib/session";

export default async function Home() {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  redirect(session ? "/dashboard/store" : "/login");
}
