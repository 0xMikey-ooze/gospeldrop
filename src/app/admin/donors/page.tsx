"use client";

import { useEffect, useState } from "react";

interface DonationHistory {
  id: string;
  amount: number;
  quantity: number;
  status: string;
  createdAt: string;
  bibleDrops: { id: string; status: string; trackingNumber: string | null }[];
}

interface Donor {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  totalDonated: number;
  bibleCount: number;
  donationHistory: DonationHistory[];
}

export default function DonorsPage() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/donors")
      .then((r) => r.json())
      .then((d) => { setDonors(d.donors || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id: string) => setExpanded(expanded === id ? null : id);

  const fmt = (d: string) => new Date(d).toLocaleDateString();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-[800]">Donors</h1>
        <p className="text-text-sub font-semibold mt-1">{total} registered donors</p>
      </div>

      {loading ? (
        <div className="text-text-sub font-semibold">Loading...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-text-sub">Donor</th>
                <th className="px-4 py-3 text-left font-bold text-text-sub">Email</th>
                <th className="px-4 py-3 text-left font-bold text-text-sub">Total Donated</th>
                <th className="px-4 py-3 text-left font-bold text-text-sub">Bibles</th>
                <th className="px-4 py-3 text-left font-bold text-text-sub">Since</th>
                <th className="px-4 py-3 text-left font-bold text-text-sub">History</th>
              </tr>
            </thead>
            <tbody>
              {donors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-sub font-semibold">
                    No donors yet
                  </td>
                </tr>
              ) : (
                donors.map((donor) => (
                  <>
                    <tr
                      key={donor.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => toggleExpand(donor.id)}
                    >
                      <td className="px-4 py-3 font-semibold text-text-main">
                        {donor.name || "—"}
                        {donor.role === "admin" && (
                          <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">admin</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-sub">{donor.email}</td>
                      <td className="px-4 py-3 font-bold text-primary">
                        ${(donor.totalDonated / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-bold text-text-main">{donor.bibleCount}</td>
                      <td className="px-4 py-3 text-text-sub">{fmt(donor.createdAt)}</td>
                      <td className="px-4 py-3 text-text-sub">
                        {donor.donationHistory.length > 0 ? (
                          <span className="text-primary font-bold text-xs">
                            {expanded === donor.id ? "Hide ▲" : `${donor.donationHistory.length} donations ▼`}
                          </span>
                        ) : (
                          <span className="text-text-sub text-xs">No donations</span>
                        )}
                      </td>
                    </tr>
                    {expanded === donor.id && donor.donationHistory.length > 0 && (
                      <tr key={`${donor.id}-expanded`} className="bg-gray-50/80">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="space-y-3">
                            <h4 className="font-bold text-text-sub text-xs uppercase tracking-wider">Donation History</h4>
                            {donor.donationHistory.map((d) => (
                              <div key={d.id} className="bg-white rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <span className="font-bold text-primary">${(d.amount / 100).toFixed(2)}</span>
                                    <span className="text-text-sub text-sm ml-2">for {d.quantity} Bible{d.quantity !== 1 ? "s" : ""}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                      d.status === "completed" ? "bg-green-100 text-green-700" :
                                      d.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                                      "bg-gray-100 text-gray-700"
                                    }`}>{d.status}</span>
                                    <span className="text-text-sub text-xs">{fmt(d.createdAt)}</span>
                                  </div>
                                </div>
                                {d.bibleDrops.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {d.bibleDrops.map((b) => (
                                      <span key={b.id} className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                        b.status === "delivered" ? "bg-green-50 text-green-700" :
                                        b.status === "shipped" ? "bg-blue-50 text-blue-700" :
                                        "bg-yellow-50 text-yellow-700"
                                      }`}>
                                        {b.status}{b.trackingNumber ? ` #${b.trackingNumber}` : ""}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
