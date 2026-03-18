"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";

function DonateContent() {
  const searchParams = useSearchParams();
  const initialAmount = searchParams.get("amount") || "25";
  const [bibleCount, setBibleCount] = useState(
    Math.max(1, Math.floor(parseInt(initialAmount) / 25) || 1)
  );
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!donorName.trim() || !donorEmail.trim()) {
      setError("Please fill in your name and email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donorName, donorEmail, bibleCount }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6">
      <Navbar />
      <div className="max-w-lg mx-auto py-20 text-center">
        <h1 className="text-4xl font-[800] mb-4">Send Bibles</h1>
        <p className="text-text-sub mb-10 text-lg font-semibold">
          Each $25 covers one Bible + shipping to a random US household.
        </p>

        <form
          onSubmit={handleCheckout}
          className="bg-white rounded-card p-8 shadow-soft text-left"
        >
          <label className="block font-bold mb-2" htmlFor="donorName">
            Your Name
          </label>
          <input
            id="donorName"
            type="text"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            placeholder="John Doe"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            required
          />

          <label className="block font-bold mb-2" htmlFor="donorEmail">
            Your Email
          </label>
          <input
            id="donorEmail"
            type="email"
            value={donorEmail}
            onChange={(e) => setDonorEmail(e.target.value)}
            placeholder="john@example.com"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            required
          />

          <label className="block font-bold mb-2">How many Bibles?</label>
          <div className="flex items-center gap-4 mb-6 justify-center">
            <button
              type="button"
              onClick={() => setBibleCount(Math.max(1, bibleCount - 1))}
              className="w-12 h-12 rounded-full bg-accent-lavender text-primary font-bold text-xl hover:bg-primary hover:text-white transition-colors"
            >
              −
            </button>
            <span className="text-3xl font-[800] text-text-main w-16 text-center">
              {bibleCount}
            </span>
            <button
              type="button"
              onClick={() => setBibleCount(bibleCount + 1)}
              className="w-12 h-12 rounded-full bg-accent-lavender text-primary font-bold text-xl hover:bg-primary hover:text-white transition-colors"
            >
              +
            </button>
          </div>

          <p className="text-2xl font-[800] text-primary mb-6 text-center">
            ${bibleCount * 25}.00
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-full font-bold text-lg shadow-primary hover:bg-primary-hover hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {loading ? "Processing..." : "Proceed to Checkout"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DonatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Loading...
        </div>
      }
    >
      <DonateContent />
    </Suspense>
  );
}
