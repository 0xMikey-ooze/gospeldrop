"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Shipment {
  id: string;
  status: string;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  address: {
    name: string;
    line1: string;
    city: string;
    state: string;
    zip: string;
  };
  donation: {
    user: { email: string; name: string | null };
  };
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const SORTABLE_COLS = [
  { key: "createdAt", label: "Created" },
  { key: "shippedAt", label: "Shipped" },
  { key: "deliveredAt", label: "Delivered" },
  { key: "status", label: "Status" },
];

export default function ShipmentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = searchParams.get("sortDir") || "desc";
  const statusFilter = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const fetchShipments = () => {
    const params = new URLSearchParams({ sortBy, sortDir, page: String(page) });
    if (statusFilter) params.set("status", statusFilter);
    fetch(`/api/admin/shipments?${params}`)
      .then((r) => r.json())
      .then((d) => { setShipments(d.shipments || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const params = new URLSearchParams({ sortBy, sortDir, page: String(page) });
    if (statusFilter) params.set("status", statusFilter);

    void fetch(`/api/admin/shipments?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setShipments(d.shipments || []);
        setTotal(d.total || 0);
      })
      .finally(() => setLoading(false));
  }, [page, sortBy, sortDir, statusFilter]);

  const setSort = (col: string) => {
    setLoading(true);
    const newDir = sortBy === col && sortDir === "desc" ? "asc" : "desc";
    const p = new URLSearchParams(searchParams.toString());
    p.set("sortBy", col);
    p.set("sortDir", newDir);
    p.set("page", "1");
    router.push(`/admin/shipments?${p}`);
  };

  const setStatus = (s: string) => {
    setLoading(true);
    const p = new URLSearchParams(searchParams.toString());
    if (s) p.set("status", s); else p.delete("status");
    p.set("page", "1");
    router.push(`/admin/shipments?${p}`);
  };

  const updateStatus = async (id: string, status: string, trackingNumber?: string) => {
    setLoading(true);
    await fetch(`/api/admin/shipments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, trackingNumber }),
    });
    fetchShipments();
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString() : "—";

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-[800]">Shipment Tracking</h1>
          <p className="text-text-sub font-semibold mt-1">{total} total shipments</p>
        </div>
        <div className="flex gap-2">
          {["", "pending", "shipped", "delivered", "failed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                statusFilter === s
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-text-sub border-gray-200 hover:border-primary"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-sub font-semibold">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {SORTABLE_COLS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => setSort(col.key)}
                    className="px-4 py-3 text-left font-bold text-text-sub cursor-pointer hover:text-primary select-none"
                  >
                    {col.label}
                    {sortBy === col.key && (
                      <span className="ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>
                    )}
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-bold text-text-sub">Recipient</th>
                <th className="px-4 py-3 text-left font-bold text-text-sub">Donor</th>
                <th className="px-4 py-3 text-left font-bold text-text-sub">Tracking</th>
                <th className="px-4 py-3 text-left font-bold text-text-sub">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-text-sub font-semibold">
                    No shipments found
                  </td>
                </tr>
              ) : (
                shipments.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-text-sub">{fmt(s.createdAt)}</td>
                    <td className="px-4 py-3 text-text-sub">{fmt(s.shippedAt)}</td>
                    <td className="px-4 py-3 text-text-sub">{fmt(s.deliveredAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[s.status] || "bg-gray-100 text-gray-700"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-text-main">{s.address.name}</div>
                      <div className="text-text-sub text-xs">{s.address.city}, {s.address.state} {s.address.zip}</div>
                    </td>
                    <td className="px-4 py-3 text-text-sub">{s.donation.user.email}</td>
                    <td className="px-4 py-3 text-text-sub font-mono text-xs">{s.trackingNumber || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {s.status === "pending" && (
                          <button
                            onClick={() => {
                              const tn = window.prompt("Enter tracking number (optional):");
                              updateStatus(s.id, "shipped", tn || undefined);
                            }}
                            className="text-xs bg-blue-50 text-blue-700 font-bold px-3 py-1 rounded-full hover:bg-blue-100"
                          >
                            Ship
                          </button>
                        )}
                        {s.status === "shipped" && (
                          <button
                            onClick={() => updateStatus(s.id, "delivered")}
                            className="text-xs bg-green-50 text-green-700 font-bold px-3 py-1 rounded-full hover:bg-green-100"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => {
                setLoading(true);
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(p));
                router.push(`/admin/shipments?${params}`);
              }}
              className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                page === p ? "bg-primary text-white" : "bg-white text-text-sub border border-gray-200 hover:border-primary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
