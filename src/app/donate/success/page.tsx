"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="max-w-[1200px] mx-auto px-6">
      <Navbar />
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-24 h-24 bg-[#E6FFF2] rounded-full flex items-center justify-center mx-auto mb-8">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00C48C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1 className="text-4xl font-[800] mb-4">Thank you! 🙏</h1>
        <p className="text-text-sub text-lg font-semibold mb-8">
          Your donation is being processed. Bibles will be sent to random households across the US.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/track" className="bg-primary text-white py-3.5 px-8 rounded-full font-bold shadow-primary hover:bg-primary-hover transition-all">
            Track Your Drops
          </Link>
          <Link href="/" className="bg-accent-lavender text-primary py-3.5 px-8 rounded-full font-bold hover:bg-primary hover:text-white transition-all">
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
