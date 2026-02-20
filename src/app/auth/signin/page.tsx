"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

function SignInContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 min-h-screen">
      <Navbar />
      <div className="max-w-md mx-auto py-20">
        <h1 className="text-3xl font-[800] mb-8 text-center">Sign In</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-card p-8 shadow-soft space-y-6">
          {error && <p className="text-red-500 text-sm font-semibold text-center">{error}</p>}
          <div>
            <label className="block font-bold mb-1 text-sm">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border-2 border-[#F0F0F0] rounded-2xl py-3 px-4 outline-none focus:border-primary transition-colors font-semibold" />
          </div>
          <div>
            <label className="block font-bold mb-1 text-sm">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border-2 border-[#F0F0F0] rounded-2xl py-3 px-4 outline-none focus:border-primary transition-colors font-semibold" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-primary hover:bg-primary-hover transition-all disabled:opacity-50">
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <p className="text-center text-text-sub text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-primary font-bold hover:underline">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
