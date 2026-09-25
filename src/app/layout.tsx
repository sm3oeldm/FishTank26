import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/clock";
import { prisma } from "@/lib/db";
import { IdentitySwitcher } from "@/components/IdentitySwitcher";

export const metadata: Metadata = {
  title: "Caregiver Handoff",
  description: "Source-linked post-discharge coordination for families",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const demo = isDemoMode();
  const users = demo
    ? await prisma.user.findMany({
        orderBy: { displayName: "asc" },
        select: { id: true, displayName: true, role: true },
      })
    : [];
  const unread = user
    ? await prisma.notification.count({ where: { recipientId: user.id, readAt: null } })
    : 0;

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">
                CH
              </span>
              <span>
                <span className="block text-base font-semibold leading-tight">Caregiver Handoff</span>
                <span className="block text-xs text-slate-500">discharge instructions → shared, source-linked plan</span>
              </span>
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link href="/" className="text-slate-700 hover:text-teal-700">
                Episodes
              </Link>
              <Link href="/notifications" className="relative text-slate-700 hover:text-teal-700">
                Notifications
                {unread > 0 ? (
                  <span className="ml-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>
              {demo ? (
                <IdentitySwitcher
                  current={user ? { id: user.id, displayName: user.displayName, role: user.role } : null}
                  users={users}
                />
              ) : null}
            </nav>
          </div>
        </header>
        {demo ? (
          <div className="border-b border-amber-200 bg-amber-50 text-center text-xs text-amber-900">
            Demo mode — fictional patient and documents only. Identity switching and the demo clock are disabled outside
            demo mode.
          </div>
        ) : null}
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
