"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalBiblesSent: number;
  pendingOrders: number;
  fulfilledThisMonth: number;
  totalDonationsAmount: number;
  recentShipments: Array<{
    id: string;
    status: string;
    createdAt: string;
    trackingNumber?: string;
    address: { name: string; city: string; state: string };
    donation: { user: { name?: string; email: string } };
  }>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    shipped: "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-red-600 font-bold">{error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-[800] text-text-main mb-2">Admin Dashboard</h1>
      <p className="text-text-sub font-semibold mb-8">Overview of GospelDrop operations.</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white rounded-card p-6 shadow-soft">
          <p className="text-text-sub font-bold text-sm mb-2">Total Bibles Sent</p>
          <p className="text-4xl font-[800] text-primary">{stats?.totalBiblesSent ?? 0}</p>
        </div>
        <div className="bg-white rounded-card p-6 shadow-soft">
          <p className="text-text-sub font-bold text-sm mb-2">Pending Orders</p>
          <p className="text-4xl font-[800] text-yellow-500">{stats?.pendingOrders ?? 0}</p>
        </div>
        <div className="bg-white rounded-card p-6 shadow-soft">
          <p className="text-text-sub font-bold text-sm mb-2">Fulfilled This Month</p>
          <p className="text-4xl font-[800] text-green-500">{stats?.fulfilledThisMonth ?? 0}</p>
        </div>
        <div className="bg-white rounded-card p-6 shadow-soft">
          <p className="text-text-sub font-bold text-sm mb-2">Total Donations</p>
          <p className="text-4xl font-[800] text-text-main">
            ${((stats?.totalDonationsAmount ?? 0) / 100).toFixed(0)}
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Link href="/admin/shipments" className="bg-accent-lavender text-primary rounded-2xl p-5 font-bold flex items-center gap-3 hover:bg-primary hover:text-white transition-all">
          <span className="text-2xl">📦</span>
          <div>
            <p className="font-[800]">Shipments</p>
            <p className="text-sm font-semibold opacity-80">Track all Bible deliveries</p>
          </div>
        </Link>
        <Link href="/admin/donors" className="bg-[#FFF4E0] text-[#FF9F1C] rounded-2xl p-5 font-bold flex items-center gap-3 hover:bg-[#FF9F1C] hover:text-white transition-all">
          <span className="text-2xl">💜</span>
          <div>
            <p className="font-[800]">Donors</p>
            <p className="text-sm font-semibold opacity-80">Manage donor records</p>
          </div>
        </Link>
        <Link href="/admin/queue" className="bg-[#E6FFF2] text-[#00C48C] rounded-2xl p-5 font-bold flex items-center gap-3 hover:bg-[#00C48C] hover:text-white transition-all">
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-[800]">Queue</p>
            <p className="text-sm font-semibold opacity-80">Process pending requests</p>
          </div>
        </Link>
      </div>

      {/* Recent Shipments */}
      <div className="bg-white rounded-card p-6 shadow-soft">
        <h2 className="text-xl font-[800] mb-4">Recent Shipments</h2>
        {!stats?.recentShipments?.length ? (
          <p className="text-text-sub font-semibold">No shipments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-text-sub font-bold">Recipient</th>
                  <th className="text-left py-3 px-4 text-text-sub font-bold">Donor</th>
                  <th className="text-left py-3 px-4 text-text-sub font-bold">Status</th>
                  <th className="text-left py-3 px-4 text-text-sub font-bold">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentShipments.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-semibold">
                      {s.address.name}
                      <span className="text-text-sub font-normal ml-1">({s.address.city}, {s.address.state})</span>
                    </td>
                    <td className="py-3 px-4 text-text-sub">{s.donation.user.name || s.donation.user.email}</td>
                    <td className="py-3 px-4"><StatusBadge status={s.status} /></td>
                    <td className="py-3 px-4 text-text-sub">{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
