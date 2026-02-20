"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({ totalDonated: 0, biblesSent: 0, delivered: 0 });

  useEffect(() => {
    if (session) {
      fetch("/api/donations")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const totalDonated = data.reduce((s: number, d: any) => s + d.amount, 0);
            const biblesSent = data.reduce((s: number, d: any) => s + d.quantity, 0);
            const delivered = data.reduce((s: number, d: any) => s + (d.bibleDrops?.filter((b: any) => b.status === "delivered").length || 0), 0);
            setStats({ totalDonated, biblesSent, delivered });
          }
        });
    }
  }, [session]);

  if (!session) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 min-h-screen">
        <Navbar />
        <div className="py-20 text-center">
          <p className="text-text-sub text-lg mb-6">Please sign in to view your dashboard.</p>
          <Link href="/auth/signin" className="bg-primary text-white py-3.5 px-8 rounded-full font-bold shadow-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 min-h-screen">
      <Navbar />
      <div className="py-16">
        <h1 className="text-4xl font-[800] mb-2">Welcome, {session.user?.name || "Friend"} 👋</h1>
        <p className="text-text-sub font-semibold mb-10">Your impact at a glance.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-accent-lavender rounded-card p-8 text-center">
            <p className="text-4xl font-[800] text-primary">${stats.totalDonated / 100}</p>
            <p className="text-text-sub font-bold mt-2">Total Donated</p>
          </div>
          <div className="bg-[#FFF4E0] rounded-card p-8 text-center">
            <p className="text-4xl font-[800] text-[#FF9F1C]">{stats.biblesSent}</p>
            <p className="text-text-sub font-bold mt-2">Bibles Sent</p>
          </div>
          <div className="bg-[#E6FFF2] rounded-card p-8 text-center">
            <p className="text-4xl font-[800] text-[#00C48C]">{stats.delivered}</p>
            <p className="text-text-sub font-bold mt-2">Delivered</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Link href="/donate" className="bg-primary text-white py-3.5 px-8 rounded-full font-bold shadow-primary hover:bg-primary-hover transition-all">
            Send More Bibles
          </Link>
          <Link href="/track" className="bg-accent-lavender text-primary py-3.5 px-8 rounded-full font-bold hover:bg-primary hover:text-white transition-all">
            Track Drops
          </Link>
        </div>
      </div>
    </div>
  );
}
