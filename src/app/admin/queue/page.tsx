"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface QueueItem {
  id: string;
  status: string;
  createdAt: string;
  address: { name: string; line1: string; line2?: string | null; city: string; state: string; zip: string };
  donation: { user: { email: string; name: string | null } };
}

export default function QueuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fulfilling, setFulfilling] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchQueue();
    }
  }, [status]);

  const fetchQueue = () => {
    setLoading(true);
    fetch("/api/admin/queue")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setQueue(data); })
      .finally(() => setLoading(false));
  };

  const handleFulfill = async (id: string) => {
    setFulfilling(id);
    try {
      const res = await fetch(`/api/admin/queue/${id}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: trackingInputs[id] || null }),
      });
      if (res.ok) {
        setQueue((prev) => prev.filter((item) => item.id !== id));
      }
    } finally {
      setFulfilling(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-3xl font-[800]">Bible Request Queue</h1>
        <button
          onClick={fetchQueue}
          className="text-sm text-primary font-semibold hover:underline"
        >
          Refresh
        </button>
      </div>
      <p className="text-text-sub font-semibold mb-8">
        {queue.length} item{queue.length !== 1 ? "s" : ""} pending processing
      </p>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
        </div>
      ) : queue.length === 0 ? (
        <div className="bg-white rounded-card p-16 text-center shadow-soft">
          <p className="text-xl font-[800] text-text-main">Queue is empty!</p>
          <p className="text-text-sub mt-2">All Bible requests have been processed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <div key={item.id} className="bg-white rounded-card shadow-soft p-6 flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.status === "processing" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>
                    {item.status}
                  </span>
                  <span className="text-xs text-text-sub">
                    Requested {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="font-[800]">{item.address.name}</p>
                <p className="text-text-sub text-sm">
                  {item.address.line1}{item.address.line2 ? ", " + item.address.line2 : ""}, {item.address.city}, {item.address.state} {item.address.zip}
                </p>
                <p className="text-xs text-text-sub mt-1">Donor: {item.donation.user.name || item.donation.user.email}</p>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Tracking number (optional)"
                  value={trackingInputs[item.id] || ""}
                  onChange={(e) => setTrackingInputs((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary w-52"
                />
                <button
                  onClick={() => handleFulfill(item.id)}
                  disabled={fulfilling === item.id}
                  className="bg-primary text-white py-2 px-4 rounded-full font-bold text-sm hover:bg-primary-hover transition-all disabled:opacity-50"
                >
                  {fulfilling === item.id ? "Processing..." : "Mark as Shipped"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
