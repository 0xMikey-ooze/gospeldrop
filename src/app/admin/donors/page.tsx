"use client";

import { useEffect, useState } from "react";

interface Donation {
  id: string;
  amount: number;
  quantity: number;
  status: string;
  createdAt: string;
  bibleDrops: Array<{ id: string; status: string }>;
}

interface Donor {
  id: string;
  name?: string;
  email: string;
  createdAt: string;
  totalDonated: number;
  bibleCount: number;
  donationCount: number;
  donations: Donation[];
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

export default function DonorsPage() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/donors")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setDonors(data); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = donors.filter(
    (d) =>
      !search ||
      d.email.toLowerCase().includes(search.toLowerCase()) ||
      (d.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-[800] text-text-main mb-2">Donors</h1>
      <p className="text-text-sub font-semibold mb-6">Manage donors and their donation history.</p>

      {/* Search */}
      <div className="mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full max-w-md px-4 py-3 rounded-2xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary shadow-input"
        />
      </div>

      {/* Summary row */}
      {!loading && (
        <div className="flex gap-6 mb-6">
          <div className="bg-white rounded-2xl px-5 py-3 shadow-soft flex items-center gap-3">
            <span className="text-primary font-[800] text-xl">{donors.length}</span>
            <span className="text-text-sub font-bold text-sm">Total Donors</span>
          </div>
          <div className="bg-white rounded-2xl px-5 py-3 shadow-soft flex items-center gap-3">
            <span className="text-green-600 font-[800] text-xl">
              ${(donors.reduce((s, d) => s + d.totalDonated, 0) / 100).toFixed(0)}
            </span>
            <span className="text-text-sub font-bold text-sm">Total Raised</span>
          </div>
          <div className="bg-white rounded-2xl px-5 py-3 shadow-soft flex items-center gap-3">
            <span className="text-primary font-[800] text-xl">
              {donors.reduce((s, d) => s + d.bibleCount, 0)}
            </span>
            <span className="text-text-sub font-bold text-sm">Bibles Donated</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !filtered.length ? (
          <div className="p-8 text-center text-text-sub font-semibold">No donors found.</div>
        ) : (
          <div>
            {filtered.map((donor) => (
              <div key={donor.id} className="border-b border-gray-100 last:border-0">
                {/* Donor Row */}
                <div
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === donor.id ? null : donor.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-accent-lavender flex items-center justify-center font-[800] text-primary text-sm flex-shrink-0">
                    {(donor.name || donor.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-main truncate">{donor.name || donor.email}</p>
                    {donor.name && <p className="text-text-sub text-xs truncate">{donor.email}</p>}
                  </div>
                  <div className="flex gap-6 text-center flex-shrink-0">
                    <div>
                      <p className="font-[800] text-green-600">${(donor.totalDonated / 100).toFixed(0)}</p>
                      <p className="text-xs text-text-sub font-semibold">Donated</p>
                    </div>
                    <div>
                      <p className="font-[800] text-primary">{donor.bibleCount}</p>
                      <p className="text-xs text-text-sub font-semibold">Bibles</p>
                    </div>
                    <div>
                      <p className="font-[800] text-text-main">{donor.donationCount}</p>
                      <p className="text-xs text-text-sub font-semibold">Gifts</p>
                    </div>
                  </div>
                  <span className="text-text-sub ml-2">{expandedId === donor.id ? "▲" : "▼"}</span>
                </div>

                {/* Expanded donation history */}
                {expandedId === donor.id && (
                  <div className="px-6 pb-4 bg-gray-50">
                    <p className="text-xs font-bold text-text-sub uppercase tracking-wide mb-3 pt-3">Donation History</p>
                    {!donor.donations.length ? (
                      <p className="text-sm text-text-sub">No donations yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {donor.donations.map((d) => (
                          <div key={d.id} className="flex items-center gap-4 bg-white rounded-2xl p-3 text-sm">
                            <div className="flex-1">
                              <span className="font-bold">${(d.amount / 100).toFixed(2)}</span>
                              <span className="text-text-sub ml-2">· {d.quantity} Bible{d.quantity > 1 ? "s" : ""}</span>
                            </div>
                            <StatusBadge status={d.status} />
                            <span className="text-text-sub text-xs">{new Date(d.createdAt).toLocaleDateString()}</span>
                            <span className="text-xs text-text-sub">
                              {d.bibleDrops.filter((b) => b.status === "delivered").length}/{d.bibleDrops.length} delivered
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
