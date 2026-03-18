"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Stats {
  totalBibles: number;
  pendingOrders: number;
  fulfilledThisMonth: number;
  totalDonationsAmount: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/admin/stats")
        .then((r) => r.json())
        .then((data) => {
          if (data.error) setError(data.error);
          else setStats(data);
        })
        .catch(() => setError("Failed to load stats"));
    }
  }, [status, router]);

  if (status === "loading" || !stats) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600">
          {error}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Bibles Sent", value: stats.totalBibles, color: "bg-accent-lavender", textColor: "text-primary", icon: "Book" },
    { label: "Pending Orders", value: stats.pendingOrders, color: "bg-[#FFF4E0]", textColor: "text-[#FF9F1C]", icon: "Clock" },
    { label: "Fulfilled This Month", value: stats.fulfilledThisMonth, color: "bg-[#E6FFF2]", textColor: "text-[#00C48C]", icon: "Check" },
    { label: "Total Donated", value: `$${(stats.totalDonationsAmount / 100).toLocaleString()}`, color: "bg-[#FFE8F0]", textColor: "text-[#FF5D8F]", icon: "Dollar" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-[800] mb-2 text-text-main">Dashboard Overview</h1>
      <p className="text-text-sub font-semibold mb-8">Real-time stats for GospelDrop</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((card) => (
          <div key={card.label} className={`${card.color} rounded-card p-6`}>
            <div className="text-3xl mb-3">{card.icon}</div>
            <p className={`text-3xl font-[800] ${card.textColor}`}>{card.value}</p>
            <p className="text-text-sub font-bold mt-2 text-sm">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-card p-6 shadow-soft">
        <h2 className="text-xl font-[800] mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <a href="/admin/queue" className="bg-primary text-white py-3 px-6 rounded-full font-bold text-sm hover:bg-primary-hover transition-all">
            Process Queue
          </a>
          <a href="/admin/shipments" className="bg-accent-lavender text-primary py-3 px-6 rounded-full font-bold text-sm hover:bg-primary hover:text-white transition-all">
            View Shipments
          </a>
        </div>
      </div>
    </div>
  );
}
