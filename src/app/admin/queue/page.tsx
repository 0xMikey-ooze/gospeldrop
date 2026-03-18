"use client";

import { useEffect, useState, useCallback } from "react";

interface QueueItem {
  id: string;
  status: string;
  trackingNumber: string | null;
  createdAt: string;
  address: {
    name: string;
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    zip: string;
  };
  donation: {
    user: { email: string; name: string | null };
  };
}

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchQueue = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/queue")
      .then((r) => r.json())
      .then((d) => { setQueue(d.queue || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleAction = async (id: string, action: "fulfill" | "skip" | "cancel") => {
    setProcessing(id);
    let trackingNumber: string | undefined;
    if (action === "fulfill") {
      const tn = window.prompt("Enter tracking number (optional):");
      trackingNumber = tn || undefined;
    }
    await fetch(`/api/admin/queue/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, trackingNumber }),
    });
    setProcessing(null);
    fetchQueue();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this item from the queue? This cannot be undone.")) return;
    setProcessing(id);
    await fetch(`/api/admin/queue/${id}`, { method: "DELETE" });
    setProcessing(null);
    fetchQueue();
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-[800]">Bible Request Queue</h1>
          <p className="text-text-sub font-semibold mt-1">{total} pending requests</p>
        </div>
        <button
          onClick={fetchQueue}
          className="bg-accent-lavender text-primary font-bold px-4 py-2 rounded-full text-sm hover:bg-primary hover:text-white transition-all"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-text-sub font-semibold">Loading queue...</div>
      ) : queue.length === 0 ? (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-12 text-center">
          <p className="text-3xl mb-3">🎉</p>
          <p className="font-[800] text-lg text-green-800">Queue is empty!</p>
          <p className="text-text-sub font-semibold mt-1">All Bible requests have been fulfilled.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-soft p-6 flex items-start justify-between gap-6"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">📖</span>
                  <div>
                    <p className="font-bold text-text-main">{item.address.name}</p>
                    <p className="text-text-sub text-sm">
                      {item.address.line1}{item.address.line2 ? `, ${item.address.line2}` : ""},{" "}
                      {item.address.city}, {item.address.state} {item.address.zip}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-text-sub mt-2">
                  <span className="font-semibold">Requested by:</span> {item.donation.user.email}
                </div>
                <div className="text-xs text-text-sub">
                  <span className="font-semibold">Added:</span> {fmt(item.createdAt)}
                </div>
                {item.trackingNumber && (
                  <div className="text-xs text-text-sub mt-1">
                    <span className="font-semibold">Tracking:</span>{" "}
                    <span className="font-mono">{item.trackingNumber}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  disabled={processing === item.id}
                  onClick={() => handleAction(item.id, "fulfill")}
                  className="bg-primary text-white font-bold px-5 py-2 rounded-full text-sm hover:bg-primary-hover transition-all disabled:opacity-50"
                >
                  Fulfill
                </button>
                <button
                  disabled={processing === item.id}
                  onClick={() => handleAction(item.id, "cancel")}
                  className="bg-red-50 text-red-600 font-bold px-5 py-2 rounded-full text-sm hover:bg-red-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={processing === item.id}
                  onClick={() => handleDelete(item.id)}
                  className="bg-gray-50 text-text-sub font-bold px-5 py-2 rounded-full text-sm hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
