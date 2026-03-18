"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AdminStats {
  totalBiblesSent: number;
  pendingOrders: number;
  fulfilledThisMonth: number;
  totalDonors: number;
  totalDonated: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? "Admin access required" : "Failed to load");
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-text-sub font-semibold">Loading stats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 font-semibold">
          {error}
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: "Total Bibles Sent",
      value: stats?.totalBiblesSent ?? 0,
      bg: "bg-accent-lavender",
      color: "text-primary",
      icon: "📖",
      href: "/admin/shipments",
    },
    {
      label: "Pending Orders",
      value: stats?.pendingOrders ?? 0,
      bg: "bg-[#FFF4E0]",
      color: "text-[#FF9F1C]",
      icon: "⏳",
      href: "/admin/queue",
    },
    {
      label: "Fulfilled This Month",
      value: stats?.fulfilledThisMonth ?? 0,
      bg: "bg-[#E6FFF2]",
      color: "text-[#00C48C]",
      icon: "✅",
      href: "/admin/shipments?status=delivered",
    },
    {
      label: "Total Donors",
      value: stats?.totalDonors ?? 0,
      bg: "bg-[#FFF0F5]",
      color: "text-[#E91E8C]",
      icon: "🤝",
      href: "/admin/donors",
    },
    {
      label: "Total Donated",
      value: `$${((stats?.totalDonated ?? 0) / 100).toFixed(2)}`,
      bg: "bg-[#F0F9FF]",
      color: "text-[#0284C7]",
      icon: "💰",
      href: "/admin/donors",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-[800] text-text-main">Dashboard Overview</h1>
        <p className="text-text-sub font-semibold mt-1">All GospelDrop stats at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`${card.bg} rounded-2xl p-6 flex items-center gap-4 hover:shadow-soft transition-all group`}
          >
            <span className="text-3xl">{card.icon}</span>
            <div>
              <p className={`text-3xl font-[800] ${card.color}`}>{card.value}</p>
              <p className="text-text-sub font-bold text-sm mt-1">{card.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/queue" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-soft transition-all">
          <h3 className="font-[800] text-lg mb-1">Bible Queue</h3>
          <p className="text-text-sub text-sm">Manage pending Bible requests and fulfill orders</p>
          <span className="text-primary font-bold text-sm mt-3 block">Go to Queue →</span>
        </Link>
        <Link href="/admin/shipments" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-soft transition-all">
          <h3 className="font-[800] text-lg mb-1">Shipment Tracking</h3>
          <p className="text-text-sub text-sm">Track all Bible drops with status and tracking numbers</p>
          <span className="text-primary font-bold text-sm mt-3 block">View Shipments →</span>
        </Link>
        <Link href="/admin/donors" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-soft transition-all">
          <h3 className="font-[800] text-lg mb-1">Donor Management</h3>
          <p className="text-text-sub text-sm">View donor history, total given, and Bibles sponsored</p>
          <span className="text-primary font-bold text-sm mt-3 block">View Donors →</span>
        </Link>
      </div>
    </div>
  );
}
