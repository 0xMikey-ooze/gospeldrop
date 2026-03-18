"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/shipments", label: "Shipments", icon: "📦" },
  { href: "/admin/donors", label: "Donors", icon: "💜" },
  { href: "/admin/queue", label: "Queue", icon: "📋" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && !(session?.user as any)?.isAdmin) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !(session?.user as any)?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-soft">
        <div className="p-6 border-b border-gray-100">
          <Link href="/" className="font-[800] text-xl text-primary tracking-tight flex items-center gap-2">
            <div className="w-3 h-3 bg-accent-orange rounded-full" />
            GospelDrop
          </Link>
          <p className="text-text-sub text-sm font-semibold mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${
                  isActive
                    ? "bg-accent-lavender text-primary"
                    : "text-text-sub hover:bg-gray-50 hover:text-text-main"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="px-4 py-3">
            <p className="text-sm font-bold text-text-main truncate">{session.user?.name || session.user?.email}</p>
            <p className="text-xs text-text-sub truncate">{session.user?.email}</p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-text-sub hover:text-primary transition-colors"
          >
            ← Back to App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
