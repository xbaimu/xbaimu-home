import type { Metadata } from "next";
import { cookies } from "next/headers";
import Settings from "@/components/settings";
import {
  authConfigured,
  sessionCookie,
  verifySession,
} from "@/lib/server/auth";
import { getDatabase, readAdminContent } from "@/lib/server/database";
import "./settings.css";

export const metadata: Metadata = {
  title: "设置 · xbaimu",
  robots: { index: false, follow: false },
};
export const runtime = "nodejs";

export default async function SettingsPage() {
  const authenticated = await verifySession(
    (await cookies()).get(sessionCookie)?.value,
  );
  const content = authenticated ? readAdminContent(getDatabase()) : null;
  return <Settings initialContent={content} configured={authConfigured()} />;
}
