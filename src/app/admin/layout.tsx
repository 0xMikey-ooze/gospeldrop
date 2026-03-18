"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const navItems = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/shipments", label: "Shipments", icon: "📦" },
  { href: "/admin/donors", label: "Donors", icon: "🤝" },
  { href: "/admin/queue", label: "Queue", icon: "📋" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-text-sub font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-soft min-h-screen">
        <div className="p-6 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">✝️</span>
            <span className="text-lg font-[800] text-primary">GospelDrop</span>
          </Link>
          <p className="text-xs text-text-sub mt-1 font-semibold">Admin Dashboard</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all text-sm ${
                      isActive
                        ? "bg-accent-lavender text-primary"
                        : "text-text-sub hover:bg-gray-50 hover:text-text-main"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-text-sub font-semibold truncate">
            {session?.user?.email}
          </p>
          <Link
            href="/"
            className="text-xs text-primary font-bold hover:underline mt-1 block"
          >
            Back to site
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
