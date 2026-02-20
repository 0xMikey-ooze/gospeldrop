"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="py-6 flex justify-between items-center">
      <Link href="/" className="font-[800] text-2xl text-primary tracking-tight flex items-center gap-2">
        <div className="w-3 h-3 bg-accent-orange rounded-full" />
        GospelDrop
      </Link>
      <div className="flex gap-8 items-center">
        <Link href="/#features" className="text-text-main font-bold hover:text-primary transition-colors">Mission</Link>
        <Link href="/track" className="text-text-main font-bold hover:text-primary transition-colors">Track</Link>
        <Link href="/stories" className="text-text-main font-bold hover:text-primary transition-colors">Stories</Link>
        {session ? (
          <div className="flex gap-4 items-center">
            <Link href="/dashboard" className="text-text-main font-bold hover:text-primary transition-colors">Dashboard</Link>
            <button onClick={() => signOut()} className="bg-primary text-white py-3.5 px-8 rounded-full font-bold shadow-primary hover:bg-primary-hover hover:-translate-y-0.5 transition-all">
              Sign Out
            </button>
          </div>
        ) : (
          <Link href="/donate" className="bg-primary text-white py-3.5 px-8 rounded-full font-bold shadow-primary hover:bg-primary-hover hover:-translate-y-0.5 transition-all">
            Give Now
          </Link>
        )}
      </div>
    </nav>
  );
}
