"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }
      await signIn("credentials", { email, password, redirect: false });
      router.push("/");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 min-h-screen">
      <Navbar />
      <div className="max-w-md mx-auto py-20">
        <h1 className="text-3xl font-[800] mb-8 text-center">Create Account</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-card p-8 shadow-soft space-y-6">
          {error && <p className="text-red-500 text-sm font-semibold text-center">{error}</p>}
          <div>
            <label className="block font-bold mb-1 text-sm">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border-2 border-[#F0F0F0] rounded-2xl py-3 px-4 outline-none focus:border-primary transition-colors font-semibold" />
          </div>
          <div>
            <label className="block font-bold mb-1 text-sm">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border-2 border-[#F0F0F0] rounded-2xl py-3 px-4 outline-none focus:border-primary transition-colors font-semibold" />
          </div>
          <div>
            <label className="block font-bold mb-1 text-sm">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full border-2 border-[#F0F0F0] rounded-2xl py-3 px-4 outline-none focus:border-primary transition-colors font-semibold" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-primary hover:bg-primary-hover transition-all disabled:opacity-50">
            {loading ? "Creating..." : "Create Account"}
          </button>
          <p className="text-center text-text-sub text-sm">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary font-bold hover:underline">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
