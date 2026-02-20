"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";

function DonateContent() {
  const searchParams = useSearchParams();
  const initialAmount = searchParams.get("amount") || "15";
  const [quantity, setQuantity] = useState(Math.max(1, Math.floor(parseInt(initialAmount) / 15) || 1));
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const handleCheckout = async () => {
    if (!session) {
      router.push("/auth/signin?callbackUrl=/donate");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch {
      alert("Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6">
      <Navbar />
      <div className="max-w-lg mx-auto py-20 text-center">
        <h1 className="text-4xl font-[800] mb-4">Send Bibles</h1>
        <p className="text-text-sub mb-10 text-lg font-semibold">Each $15 covers one Bible + shipping to a random US household.</p>

        <div className="bg-white rounded-card p-8 shadow-soft">
          <label className="block text-left font-bold mb-2">How many Bibles?</label>
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-12 h-12 rounded-full bg-accent-lavender text-primary font-bold text-xl hover:bg-primary hover:text-white transition-colors"
            >−</button>
            <span className="text-3xl font-[800] text-text-main w-16 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-12 h-12 rounded-full bg-accent-lavender text-primary font-bold text-xl hover:bg-primary hover:text-white transition-colors"
            >+</button>
          </div>
          <p className="text-2xl font-[800] text-primary mb-6">${quantity * 15}.00</p>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-full font-bold text-lg shadow-primary hover:bg-primary-hover hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {loading ? "Processing..." : session ? "Proceed to Checkout" : "Sign in to Donate"}
          </button>
        </div>

        {!session && (
          <p className="mt-6 text-text-sub">
            <Link href="/auth/signin" className="text-primary font-bold hover:underline">Sign in</Link> or{" "}
            <Link href="/auth/register" className="text-primary font-bold hover:underline">create an account</Link> to donate.
          </p>
        )}
      </div>
    </div>
  );
}

export default function DonatePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <DonateContent />
    </Suspense>
  );
}
