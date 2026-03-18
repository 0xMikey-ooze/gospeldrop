"use client";

import { useEffect, useState } from "react";

interface QueueItem {
  id: string;
  status: string;
  createdAt: string;
  address: { name: string; line1: string; line2?: string; city: string; state: string; zip: string };
  donation: { quantity: number; user: { name?: string; email: string } };
}

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fulfilling, setFulfilling] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");

  async function fetchQueue() {
    setLoading(true);
    const res = await fetch("/api/admin/queue");
    const data = await res.json();
    if (Array.isArray(data)) setQueue(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchQueue();
  }, []);

  async function fulfillItem(id: string) {
    setFulfilling(id);
    const trackingNumber = trackingInputs[id] || undefined;
    const res = await fetch("/api/admin/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, trackingNumber }),
    });
    const data = await res.json();
    if (!data.error) {
      setSuccessMsg(`Order fulfilled! Email sent to donor.`);
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchQueue();
    }
    setFulfilling(null);
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-[800] text-text-main mb-2">Bible Queue</h1>
      <p className="text-text-sub font-semibold mb-6">Process pending Bible delivery requests.</p>

      {successMsg && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 font-bold px-5 py-3 rounded-2xl flex items-center gap-2">
          <span>✓</span> {successMsg}
        </div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="mb-6 flex items-center gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-3 flex items-center gap-3">
            <span className="text-yellow-600 font-[800] text-xl">{queue.length}</span>
            <span className="text-yellow-700 font-bold text-sm">Pending in Queue</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-48 bg-white rounded-card shadow-soft">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !queue.length ? (
          <div className="bg-white rounded-card shadow-soft p-12 text-center">
            <p className="text-4xl mb-4">🎉</p>
            <p className="text-xl font-[800] text-text-main">Queue is empty!</p>
            <p className="text-text-sub font-semibold mt-2">All Bible requests have been fulfilled.</p>
          </div>
        ) : (
          queue.map((item) => (
            <div key={item.id} className="bg-white rounded-card shadow-soft p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Address info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-text-sub">Recipient</span>
                  </div>
                  <p className="font-[800] text-text-main text-lg">{item.address.name}</p>
                  <p className="text-text-sub font-semibold">{item.address.line1}</p>
                  {item.address.line2 && <p className="text-text-sub font-semibold">{item.address.line2}</p>}
                  <p className="text-text-sub font-semibold">{item.address.city}, {item.address.state} {item.address.zip}</p>
                </div>

                {/* Donor info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-text-sub">Donor</span>
                  </div>
                  <p className="font-bold text-text-main">{item.donation.user.name || item.donation.user.email}</p>
                  {item.donation.user.name && (
                    <p className="text-text-sub text-sm">{item.donation.user.email}</p>
                  )}
                  <p className="mt-2 text-sm">
                    <span className="font-[800] text-primary">{item.donation.quantity}</span>
                    <span className="text-text-sub font-semibold ml-1">Bible{item.donation.quantity > 1 ? "s" : ""} requested</span>
                  </p>
                  <p className="text-xs text-text-sub mt-1">
                    Queued {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Fulfill action */}
                <div className="flex-shrink-0 flex flex-col gap-3 min-w-[200px]">
                  <input
                    value={trackingInputs[item.id] || ""}
                    onChange={(e) => setTrackingInputs((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="Tracking # (optional)"
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => fulfillItem(item.id)}
                    disabled={fulfilling === item.id}
                    className="bg-primary text-white py-2.5 px-6 rounded-full font-bold text-sm shadow-primary hover:bg-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {fulfilling === item.id ? (
                      <span className="flex items-center gap-2 justify-center">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Fulfilling...
                      </span>
                    ) : (
                      "Mark as Shipped ✉️"
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
