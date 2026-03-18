"use client";

import { useEffect, useState, useCallback } from "react";

interface Shipment {
  id: string;
  status: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  address: { name: string; line1: string; city: string; state: string; zip: string };
  donation: { quantity: number; user: { name?: string; email: string } };
}

type SortField = "createdAt" | "status" | "shippedAt" | "deliveredAt";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    shipped: "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-primary ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTracking, setEditTracking] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ sortBy, sortDir });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/shipments?${params}`);
    const data = await res.json();
    if (Array.isArray(data)) setShipments(data);
    setLoading(false);
  }, [sortBy, sortDir, statusFilter]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  function startEdit(s: Shipment) {
    setEditingId(s.id);
    setEditTracking(s.trackingNumber || "");
    setEditStatus(s.status);
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch("/api/admin/shipments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: editStatus, trackingNumber: editTracking }),
    });
    setEditingId(null);
    setSaving(false);
    fetchShipments();
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-[800] text-text-main mb-2">Shipments</h1>
      <p className="text-text-sub font-semibold mb-6">Track and manage all Bible deliveries.</p>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        {["", "pending", "shipped", "delivered"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
              statusFilter === s
                ? "bg-primary text-white shadow-primary"
                : "bg-white text-text-sub hover:bg-accent-lavender hover:text-primary"
            }`}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-card shadow-soft overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !shipments.length ? (
          <div className="p-8 text-center text-text-sub font-semibold">No shipments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-4 px-4 text-text-sub font-bold">Recipient</th>
                  <th className="text-left py-4 px-4 text-text-sub font-bold">Donor</th>
                  <th className="text-left py-4 px-4 text-text-sub font-bold">Qty</th>
                  <th
                    className="text-left py-4 px-4 text-text-sub font-bold cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    Status <SortIcon active={sortBy === "status"} dir={sortDir} />
                  </th>
                  <th className="text-left py-4 px-4 text-text-sub font-bold">Tracking #</th>
                  <th
                    className="text-left py-4 px-4 text-text-sub font-bold cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("shippedAt")}
                  >
                    Shipped <SortIcon active={sortBy === "shippedAt"} dir={sortDir} />
                  </th>
                  <th
                    className="text-left py-4 px-4 text-text-sub font-bold cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("createdAt")}
                  >
                    Created <SortIcon active={sortBy === "createdAt"} dir={sortDir} />
                  </th>
                  <th className="text-left py-4 px-4 text-text-sub font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold">{s.address.name}</p>
                      <p className="text-text-sub text-xs">{s.address.city}, {s.address.state} {s.address.zip}</p>
                    </td>
                    <td className="py-3 px-4 text-text-sub">{s.donation.user.name || s.donation.user.email}</td>
                    <td className="py-3 px-4 font-bold">{s.donation.quantity}</td>
                    <td className="py-3 px-4">
                      {editingId === s.id ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm font-semibold"
                        >
                          <option value="pending">Pending</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      ) : (
                        <StatusBadge status={s.status} />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingId === s.id ? (
                        <input
                          value={editTracking}
                          onChange={(e) => setEditTracking(e.target.value)}
                          placeholder="Tracking #"
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-32"
                        />
                      ) : (
                        <span className="text-text-sub text-xs font-mono">{s.trackingNumber || "—"}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-sub text-xs">
                      {s.shippedAt ? new Date(s.shippedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 px-4 text-text-sub text-xs">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {editingId === s.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(s.id)}
                            disabled={saving}
                            className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-hover transition-colors disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 bg-gray-100 text-text-sub rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(s)}
                          className="px-3 py-1 bg-accent-lavender text-primary rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
