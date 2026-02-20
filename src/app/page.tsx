"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  const [amount, setAmount] = useState("");
  const router = useRouter();

  const handleDonate = () => {
    const num = parseInt(amount.replace(/[^0-9]/g, ""));
    if (num && num >= 15) {
      router.push(`/donate?amount=${num}`);
    } else {
      router.push("/donate?amount=15");
    }
  };

  return (
    <>
      <div className="max-w-[1200px] mx-auto px-6">
        <Navbar />

        {/* Hero */}
        <section className="py-20 pb-16 text-center relative">
          <h1 className="text-[56px] leading-[1.1] font-[800] mb-6 text-text-main max-w-[800px] mx-auto">
            Send a message of hope to a stranger&apos;s doorstep.
          </h1>
          <p className="text-xl text-text-sub max-w-[600px] mx-auto mb-12 leading-relaxed font-semibold">
            We mail free Bibles to random households across the United States.
            Brighten a home, spark curiosity, and share the Word anonymously.
          </p>
          <Link
            href="/donate"
            className="inline-block bg-primary text-white text-xl font-bold py-[18px] px-12 rounded-full shadow-primary hover:shadow-primary-hover hover:bg-primary-hover hover:-translate-y-0.5 active:translate-y-px transition-all"
          >
            Start Sending
          </Link>
        </section>

        {/* Sticker Cloud */}
        <section className="relative h-[400px] w-full max-w-[1000px] mx-auto">
          {/* Accent shapes */}
          <div className="absolute top-[20%] right-[35%] w-10 h-10 bg-accent-orange rounded-full opacity-80 animate-floaty" style={{ animationDirection: "reverse", animationDuration: "7s" }} />
          <div className="absolute top-[40%] left-[10%] opacity-80 animate-floaty" style={{ animationDirection: "reverse", animationDuration: "7s" }}>
            <svg viewBox="0 0 100 30" width="60">
              <path d="M5,15 Q25,5 50,15 T95,15" fill="none" stroke="#E0D9FA" strokeWidth="8" strokeLinecap="round" />
            </svg>
          </div>

          {/* Sticker 1 - House (purple) */}
          <div className="absolute w-[140px] h-[140px] top-[10%] left-[15%] rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] border-4 border-white animate-floaty hover:scale-105 hover:rotate-[5deg] transition-transform cursor-default" style={{ animationDelay: "0s" }}>
            <div className="w-full h-full rounded-full bg-accent-lavender flex items-center justify-center">
              <svg className="w-[60%] h-[60%]" viewBox="0 0 24 24" fill="none" stroke="#654AF5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          </div>

          {/* Sticker 2 - Orange dot */}
          <div className="absolute w-[100px] h-[100px] top-[5%] right-[20%] rounded-full bg-accent-orange shadow-[0_8px_24px_rgba(0,0,0,0.08)] border-4 border-white animate-floaty hover:scale-105 hover:rotate-[5deg] transition-transform cursor-default" style={{ animationDelay: "1s" }} />

          {/* Sticker 3 - Bible+Cross (cyan) */}
          <div className="absolute w-[180px] h-[180px] top-[30%] left-1/2 -translate-x-1/2 rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] border-4 border-white animate-floaty z-[2] hover:scale-105 hover:rotate-[5deg] transition-transform cursor-default" style={{ animationDelay: "2s" }}>
            <div className="w-full h-full rounded-full bg-[#E0FCFD] flex items-center justify-center">
              <svg className="w-[60%] h-[60%]" viewBox="0 0 24 24" fill="none" stroke="#2EC4B6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <line x1="12" y1="6" x2="12" y2="10" />
                <line x1="10" y1="7" x2="14" y2="7" />
              </svg>
            </div>
          </div>

          {/* Sticker 4 - Heart (pink) */}
          <div className="absolute w-[120px] h-[120px] bottom-[10%] left-[20%] rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] border-4 border-white animate-floaty hover:scale-105 hover:rotate-[5deg] transition-transform cursor-default" style={{ animationDelay: "1.5s" }}>
            <div className="w-full h-full rounded-full bg-[#FFEBF0] flex items-center justify-center">
              <svg className="w-[60%] h-[60%]" viewBox="0 0 24 24" fill="none" stroke="#FF5D8F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          </div>

          {/* Sticker 5 - Map Pin (orange) */}
          <div className="absolute w-[150px] h-[150px] bottom-[20%] right-[15%] rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] border-4 border-white animate-floaty hover:scale-105 hover:rotate-[5deg] transition-transform cursor-default" style={{ animationDelay: "0.5s" }}>
            <div className="w-full h-full rounded-full bg-[#FFF4E0] flex items-center justify-center">
              <svg className="w-[60%] h-[60%]" viewBox="0 0 24 24" fill="none" stroke="#FF9F1C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="10" r="3" />
                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
              </svg>
            </div>
          </div>

          {/* Triangle accent */}
          <div
            className="absolute bottom-[5%] right-[30%] opacity-60 animate-floaty"
            style={{
              width: 0, height: 0,
              borderLeft: "15px solid transparent",
              borderRight: "15px solid transparent",
              borderBottom: "25px solid #AEEFF0",
              transform: "rotate(15deg)",
              animationDuration: "4s",
            }}
          />
        </section>
      </div>

      {/* Features */}
      <div className="py-20" style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #F9F8FF 100%)" }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-16">
            <div className="bg-white rounded-card p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:-translate-y-2.5 transition-transform">
              <div className="w-20 h-20 rounded-full bg-[#E8F4FD] mx-auto mb-6 flex items-center justify-center text-[#4FA3F7]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              </div>
              <h3 className="text-xl font-[800] mb-3 text-text-main">We Pack It</h3>
              <p className="text-text-sub leading-relaxed">Every package includes a Bible, a reading guide, and a note letting them know they are loved.</p>
            </div>
            <div className="bg-white rounded-card p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:-translate-y-2.5 transition-transform">
              <div className="w-20 h-20 rounded-full bg-[#FFF4E6] mx-auto mb-6 flex items-center justify-center text-[#FF9F1C]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="9" x2="20" y2="9" />
                  <line x1="4" y1="15" x2="20" y2="15" />
                  <line x1="10" y1="3" x2="8" y2="21" />
                  <line x1="16" y1="3" x2="14" y2="21" />
                </svg>
              </div>
              <h3 className="text-xl font-[800] mb-3 text-text-main">Random Address</h3>
              <p className="text-text-sub leading-relaxed">Our algorithm selects a random residential address in the US that hasn&apos;t received a drop yet.</p>
            </div>
            <div className="bg-white rounded-card p-10 text-center shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:-translate-y-2.5 transition-transform">
              <div className="w-20 h-20 rounded-full bg-[#E6FFF2] mx-auto mb-6 flex items-center justify-center text-[#00C48C]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 className="text-xl font-[800] mb-3 text-text-main">It Arrives</h3>
              <p className="text-text-sub leading-relaxed">Within 5-7 days, a surprise lands on a doorstep. You get a notification when it&apos;s delivered.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Donate Section */}
      <div className="py-20 pb-32 text-center">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-4xl font-[800] mb-6">Send a Bible today.</h2>
          <div className="bg-white p-2 rounded-full shadow-input inline-flex items-center max-w-[500px] w-full border-2 border-[#F0F0F0] focus-within:border-primary transition-colors">
            <input
              type="text"
              className="border-none py-4 px-6 text-lg font-semibold flex-grow outline-none rounded-full text-text-main placeholder:text-gray-300"
              placeholder="Enter donation amount (e.g. $15)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              onClick={handleDonate}
              className="bg-primary text-white font-bold py-3 px-6 rounded-full m-1 hover:bg-primary-hover transition-colors"
            >
              Donate
            </button>
          </div>
          <p className="mt-4 text-text-sub text-sm">$15 covers one Bible + Shipping.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-10 text-text-sub text-sm font-semibold">
        <p>© 2026 GospelDrop Project. Spreading love, randomly.</p>
      </footer>
    </>
  );
}
