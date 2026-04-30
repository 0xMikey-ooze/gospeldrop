"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";

export default function TrackPage() {
  const { data: session, status } = useSession();
  const loading = useMemo(() => status === "loading", [status]);

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
        ) : (
          <div className="bg-white rounded-card p-12 shadow-soft text-center">
            <p className="text-text-sub text-lg mb-6">
              Donation tracking data is available from your dashboard.
            </p>
            <Link href="/donate" className="bg-primary text-white py-3.5 px-8 rounded-full font-bold shadow-primary hover:bg-primary-hover transition-all">
              Send a Bible
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
