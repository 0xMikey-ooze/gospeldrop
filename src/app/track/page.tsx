"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";

export default function TrackPage() {
  const { data: session } = useSession();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetch("/api/donations")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setDonations(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    shipped: "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700",
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 min-h-screen">
      <Navbar />
      <div className="py-16">
        <h1 className="text-4xl font-[800] mb-2">Track Your Drops</h1>
        <p className="text-text-sub font-semibold mb-10">See the status of every Bible you&apos;ve sent.</p>

        {!session ? (
          <div className="bg-white rounded-card p-12 shadow-soft text-center">
            <p className="text-text-sub text-lg mb-6">Sign in to track your Bible drops.</p>
            <Link href="/auth/signin" className="bg-primary text-white py-3.5 px-8 rounded-full font-bold shadow-primary hover:bg-primary-hover transition-all">
              Sign In
            </Link>
          </div>
        ) : loading ? (
          <p className="text-text-sub">Loading...</p>
        ) : donations.length === 0 ? (
          <div className="bg-white rounded-card p-12 shadow-soft text-center">
            <p className="text-text-sub text-lg mb-6">You haven&apos;t sent any Bibles yet.</p>
            <Link href="/donate" className="bg-primary text-white py-3.5 px-8 rounded-full font-bold shadow-primary hover:bg-primary-hover transition-all">
              Send Your First Bible
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {donations.map((d: any) => (
              <div key={d.id} className="bg-white rounded-card p-8 shadow-soft">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-[800] text-lg">{d.quantity} Bible(s) — ${d.amount / 100}</p>
                    <p className="text-text-sub text-sm">{new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColor[d.status] || "bg-gray-100 text-gray-700"}`}>
                    {d.status}
                  </span>
                </div>
                {d.bibleDrops?.map((drop: any) => (
                  <div key={drop.id} className="border-t pt-3 mt-3 flex justify-between items-center text-sm">
                    <span className="text-text-sub">{drop.address?.city}, {drop.address?.state}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColor[drop.status] || ""}`}>{drop.status}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
