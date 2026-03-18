"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Donation {
  id: string;
  amount: number;
  quantity: number;
  status: string;
  createdAt: string;
}

interface Donor {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  totalDonated: number;
  bibleCount: number;
  donations: Donation[];
}

export default function DonorsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/admin/donors")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setDonors(data); })
        .finally(() => setLoading(false));
    }
  }, [status]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-[800] mb-2">Donors</h1>
      <p className="text-text-sub font-semibold mb-8">All registered donors and their donation history</p>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {donors.map((donor) => (
            <div key={donor.id} className="bg-white rounded-card shadow-soft overflow-hidden">
              <div
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === donor.id ? null : donor.id)}
              >
                <div>
                  <p className="font-[800] text-text-main">{donor.name || donor.email}</p>
                  <p className="text-text-sub text-sm">{donor.email} · Joined {new Date(donor.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-8 items-center">
                  <div className="text-center">
                    <p className="text-xl font-[800] text-primary">${(donor.totalDonated / 100).toLocaleString()}</p>
                    <p className="text-xs text-text-sub font-semibold">Total Donated</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-[800] text-[#FF9F1C]">{donor.bibleCount}</p>
                    <p className="text-xs text-text-sub font-semibold">Bibles</p>
                  </div>
                  <span className="text-text-sub">{expanded === donor.id ? "^" : "v"}</span>
                </div>
              </div>

              {expanded === donor.id && (
                <div className="border-t border-gray-100 p-6">
                  <h3 className="text-sm font-bold text-text-sub uppercase tracking-wider mb-3">Donation History</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-bold text-text-sub uppercase">
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Amount</th>
                        <th className="pb-2">Bibles</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {donor.donations.map((d) => (
                        <tr key={d.id}>
                          <td className="py-2 text-text-sub">{new Date(d.createdAt).toLocaleDateString()}</td>
                          <td className="py-2 font-semibold">${(d.amount / 100).toFixed(2)}</td>
                          <td className="py-2">{d.quantity}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${d.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {donor.donations.length === 0 && (
                        <tr><td colSpan={4} className="py-4 text-text-sub text-center">No donations yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          {donors.length === 0 && (
            <div className="bg-white rounded-card p-12 text-center text-text-sub shadow-soft">
              No donors found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
