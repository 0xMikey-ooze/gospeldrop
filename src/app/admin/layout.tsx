"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Overview", icon: "Dashboard" },
  { href: "/admin/shipments", label: "Shipments", icon: "Package" },
  { href: "/admin/donors", label: "Donors", icon: "Heart" },
  { href: "/admin/queue", label: "Queue", icon: "List" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <Link href="/" className="font-[800] text-xl text-primary tracking-tight flex items-center gap-2">
            <div className="w-3 h-3 bg-accent-orange rounded-full" />
            GospelDrop
          </Link>
          <p className="text-xs text-text-sub mt-1 font-semibold">Admin Dashboard</p>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                      isActive
                        ? "bg-accent-lavender text-primary"
                        : "text-text-sub hover:bg-gray-50 hover:text-text-main"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <Link href="/" className="text-xs text-text-sub hover:text-text-main font-semibold">
            Back to Site
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
