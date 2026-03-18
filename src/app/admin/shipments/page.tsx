"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Shipment {
  id: string;
  status: string;
  trackingNumber: string | null;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  address: { name: string; line1: string; city: string; state: string; zip: string };
  donation: { user: { email: string; name: string | null } };
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
};

export default function ShipmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      setLoading(true);
      fetch(`/api/admin/shipments?sortBy=${sortBy}&sortOrder=${sortOrder}`)
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setShipments(data); })
        .finally(() => setLoading(false));
    }
  }, [status, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortOrder("desc"); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/shipments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const updated = await res.json();
      if (!updated.error) {
        setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      }
    } finally {
      setUpdating(null);
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <span className="text-gray-300 ml-1">updown</span>;
    return <span className="text-primary ml-1">{sortOrder === "asc" ? "up" : "down"}</span>;
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-[800] mb-2">Shipment Tracking</h1>
      <p className="text-text-sub font-semibold mb-8">All Bible drop shipments</p>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-soft overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  { label: "Recipient", field: null },
                  { label: "Address", field: null },
                  { label: "Status", field: "status" },
                  { label: "Created", field: "createdAt" },
                  { label: "Shipped", field: "shippedAt" },
                  { label: "Delivered", field: "deliveredAt" },
                  { label: "Tracking", field: null },
                  { label: "Actions", field: null },
                ].map(({ label, field }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-left text-xs font-bold text-text-sub uppercase tracking-wider ${field ? "cursor-pointer hover:text-text-main select-none" : ""}`}
                    onClick={() => field && handleSort(field)}
                  >
                    {label}
                    {field && <SortIcon field={field} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shipments.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-semibold">{shipment.donation.user.name || "—"}</div>
                    <div className="text-text-sub text-xs">{shipment.donation.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-sub">
                    {shipment.address.name}<br />
                    <span className="text-xs">{shipment.address.city}, {shipment.address.state}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[shipment.status] || "bg-gray-100 text-gray-800"}`}>
                      {shipment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-sub">{new Date(shipment.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-text-sub">{shipment.shippedAt ? new Date(shipment.shippedAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-xs text-text-sub">{shipment.deliveredAt ? new Date(shipment.deliveredAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-xs text-text-sub font-mono">{shipment.trackingNumber || "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={shipment.status}
                      disabled={updating === shipment.id}
                      onChange={(e) => handleStatusChange(shipment.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-primary"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </td>
                </tr>
              ))}
              {shipments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-sub">No shipments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
