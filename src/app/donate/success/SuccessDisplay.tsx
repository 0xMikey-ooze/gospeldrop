"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";

type SuccessDisplayProps = {
  donorName: string;
  bibleCount: string;
  sessionId: string;
};

export default function SuccessDisplay({
  donorName,
  bibleCount,
  sessionId,
}: SuccessDisplayProps) {
  const orderRef = sessionId.slice(-8);
  const tweetText = encodeURIComponent(
    `I just sent ${bibleCount} free Bible(s) to a US household via @gospeldrop 📖`
  );
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  return (
    <div className="max-w-[1200px] mx-auto px-6">
      <Navbar />
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-24 h-24 bg-[#E6FFF2] rounded-full flex items-center justify-center mx-auto mb-8 animate-[scale-in_0.4s_ease-out]">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00C48C"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h1 className="text-4xl font-[800] mb-4">
          Thank you, {donorName}!
        </h1>

        <p className="text-text-sub text-lg font-semibold mb-2">
          {bibleCount} Bible(s) on their way to a US household
        </p>

        <p className="text-text-sub text-sm mb-6">
          Estimated delivery: <span className="font-bold">4-6 weeks</span>
        </p>

        <div className="bg-accent-lavender/50 rounded-card px-6 py-4 mb-10 inline-block">
          <p className="text-sm text-text-sub">
            Order reference:{" "}
            <span className="font-[800] text-text-main tracking-wide">
              {orderRef}
            </span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/donate"
            className="bg-primary text-white py-3.5 px-8 rounded-full font-bold shadow-primary hover:bg-primary-hover hover:-translate-y-0.5 transition-all"
          >
            Send more Bibles
          </Link>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-accent-lavender text-primary py-3.5 px-8 rounded-full font-bold hover:bg-primary hover:text-white transition-all"
          >
            Share on Twitter
          </a>
        </div>
      </div>
    </div>
  );
}
