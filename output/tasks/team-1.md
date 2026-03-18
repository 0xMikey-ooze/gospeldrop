# Team 1: Admin Frontend (Pages + Components)

## Prerequisites
- Team 2 must have completed the Prisma schema migration (role field on User)
- Team 2's API routes define the data contracts; Team 1 fetches from them
- All API contracts are defined in `output/architecture.md`

## Dependencies (install before starting)
```bash
# No additional frontend deps needed — Tailwind + React already available
```

---

## Task 1.1: Admin Sidebar Component
**File**: `src/components/admin/AdminSidebar.tsx`

```typescript
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;  // inline SVG
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: /* grid SVG */ },
  { label: "Shipments", href: "/admin/shipments", icon: /* truck SVG */ },
  { label: "Donors", href: "/admin/donors", icon: /* users SVG */ },
  { label: "Queue", href: "/admin/queue", icon: /* list SVG */ },
];

export function AdminSidebar(): JSX.Element {
  const pathname = usePathname();
  // Render vertical sidebar, 64px wide collapsed / 240px expanded
  // Active item: bg-accent-lavender text-primary font-bold
  // Inactive item: text-text-sub hover:bg-gray-50
  // Logo area at top: "GospelDrop Admin" with accent dot
  // Each item: icon + label, rounded-xl padding
}
```

**Styling requirements**:
- Fixed left sidebar, full height (`min-h-screen`)
- Width: `w-60` (240px)
- Background: `bg-white` with right border `border-r border-gray-100`
- Active link: `bg-accent-lavender text-primary rounded-xl`
- Logo section: reuse the `GospelDrop` branding pattern from `Navbar.tsx` but add "Admin" suffix
- Bottom of sidebar: link back to main site `← Back to Site`

---

## Task 1.2: Stats Card Component
**File**: `src/components/admin/StatsCard.tsx`

```typescript
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color: "purple" | "orange" | "green" | "blue";
}

const colorMap: Record<StatsCardProps["color"], { bg: string; text: string }> = {
  purple: { bg: "bg-accent-lavender", text: "text-primary" },
  orange: { bg: "bg-[#FFF4E0]", text: "text-[#FF9F1C]" },
  green:  { bg: "bg-[#E6FFF2]", text: "text-[#00C48C]" },
  blue:   { bg: "bg-[#E8F4FD]", text: "text-[#4FA3F7]" },
};

export function StatsCard({ title, value, subtitle, color }: StatsCardProps): JSX.Element {
  // Render card matching existing dashboard card style
  // rounded-card p-8, shadow-soft
  // value in text-4xl font-[800], title in text-text-sub font-bold
}
```

---

## Task 1.3: Status Badge Component
**File**: `src/components/admin/StatusBadge.tsx`

```typescript
interface StatusBadgeProps {
  status: "pending" | "shipped" | "delivered";
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  shipped:   { bg: "bg-blue-100",   text: "text-blue-700",   label: "Shipped" },
  delivered: { bg: "bg-green-100",  text: "text-green-700",  label: "Delivered" },
};

export function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  // px-3 py-1 rounded-full text-sm font-bold
  // Match pattern from src/app/track/page.tsx statusColor mapping
}
```

---

## Task 1.4: Admin Layout
**File**: `src/app/admin/layout.tsx`

```typescript
"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    // Verify admin by calling GET /api/admin/stats (will 403 if not admin)
    fetch("/api/admin/stats")
      .then((r) => {
        if (r.status === 403 || r.status === 401) {
          router.push("/");
        } else {
          setIsAdmin(true);
        }
        setLoading(false);
      })
      .catch(() => router.push("/"));
  }, [session, status, router]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-sub font-semibold">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

---

## Task 1.5: Admin Dashboard Page
**File**: `src/app/admin/page.tsx`

```typescript
"use client";
import { useEffect, useState } from "react";
import { StatsCard } from "@/components/admin/StatsCard";

interface AdminStats {
  totalBiblesSent: number;
  pendingOrders: number;
  fulfilledThisMonth: number;
  totalDonations: number;
  totalDonors: number;
}

export default function AdminDashboardPage(): JSX.Element {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  // Render:
  // h1: "Admin Dashboard" in text-3xl font-[800]
  // Grid of 5 StatsCards (2 cols on mobile, 3+2 on desktop):
  //   1. Total Bibles Sent (purple)
  //   2. Pending Orders (orange)
  //   3. Fulfilled This Month (green)
  //   4. Total Donations formatted as $ (blue)
  //   5. Total Donors (purple)
}
```

---

## Task 1.6: Shipments Table Component
**File**: `src/components/admin/ShipmentsTable.tsx`

```typescript
"use client";
import { useState } from "react";
import { StatusBadge } from "./StatusBadge";

interface Shipment {
  id: string;
  donationId: string;
  trackingNumber: string | null;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  address: { city: string; state: string };
  donation: { user: { name: string | null; email: string } };
}

interface ShipmentsTableProps {
  shipments: Shipment[];
  total: number;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
}

export function ShipmentsTable(props: ShipmentsTableProps): JSX.Element {
  // Table with columns: ID (truncated), Donor, Location, Tracking #, Status, Shipped, Delivered
  // Sortable column headers with up/down arrow indicators
  // Pagination controls at bottom: Previous / Page X of Y / Next
  // Table styles: bg-white rounded-card shadow-soft overflow-hidden
  // Header row: bg-gray-50 text-text-sub text-sm font-bold uppercase
  // Body rows: border-b border-gray-50, hover:bg-gray-50 transition
  // StatusBadge for status column
  // Date formatting: toLocaleDateString() or "—" if null
}
```

---

## Task 1.7: Shipments Page
**File**: `src/app/admin/shipments/page.tsx`

```typescript
"use client";
import { useEffect, useState, useCallback } from "react";
import { ShipmentsTable } from "@/components/admin/ShipmentsTable";

export default function AdminShipmentsPage(): JSX.Element {
  const [shipments, setShipments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const pageSize = 20;

  const fetchShipments = useCallback(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sortBy,
      sortOrder,
    });
    fetch(`/api/admin/shipments?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setShipments(data.shipments);
        setTotal(data.total);
      });
  }, [page, sortBy, sortOrder]);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // Render:
  // h1: "Shipments" text-3xl font-[800]
  // ShipmentsTable with all props
}
```

---

## Task 1.8: Donors Table Component
**File**: `src/components/admin/DonorsTable.tsx`

```typescript
"use client";
import { useState } from "react";

interface DonorDonation {
  id: string;
  amount: number;
  quantity: number;
  status: string;
  createdAt: string;
}

interface Donor {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  totalDonated: number;
  bibleCount: number;
  donations: DonorDonation[];
}

interface DonorsTableProps {
  donors: Donor[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
}

export function DonorsTable({ donors, sortBy, sortOrder, onSort }: DonorsTableProps): JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Table with columns: Name, Email, Total Donated, Bibles, Joined
  // Click row to expand/collapse donation history
  // Expanded section: sub-table of donations with amount, quantity, status, date
  // Use chevron icon (▸ / ▾) to indicate expandable
  // Table styles match ShipmentsTable
  // Total Donated formatted as: $XX.XX (divide cents by 100)
}
```

---

## Task 1.9: Donors Page
**File**: `src/app/admin/donors/page.tsx`

```typescript
"use client";
import { useEffect, useState, useCallback } from "react";
import { DonorsTable } from "@/components/admin/DonorsTable";

export default function AdminDonorsPage(): JSX.Element {
  const [donors, setDonors] = useState([]);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchDonors = useCallback(() => {
    const params = new URLSearchParams({ sortBy, sortOrder });
    fetch(`/api/admin/donors?${params}`)
      .then((r) => r.json())
      .then((data) => setDonors(data.donors));
  }, [sortBy, sortOrder]);

  useEffect(() => { fetchDonors(); }, [fetchDonors]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Render:
  // h1: "Donors" text-3xl font-[800]
  // DonorsTable with all props
}
```

---

## Task 1.10: Queue List Component
**File**: `src/components/admin/QueueList.tsx`

```typescript
"use client";
import { useState } from "react";
import { StatusBadge } from "./StatusBadge";

interface QueueItem {
  id: string;
  donationId: string;
  trackingNumber: string | null;
  status: string;
  createdAt: string;
  address: {
    name: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    zip: string;
  };
  donation: {
    user: { name: string | null; email: string };
  };
}

interface QueueListProps {
  items: QueueItem[];
  onUpdateStatus: (id: string, status: "shipped" | "delivered", trackingNumber?: string) => void;
  onBulkUpdate: (ids: string[], status: "shipped" | "delivered", trackingNumbers?: Record<string, string>) => void;
}

export function QueueList({ items, onUpdateStatus, onBulkUpdate }: QueueListProps): JSX.Element {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  // Render:
  // Top bar: "X selected" + bulk action buttons (Mark Shipped, Mark Delivered)
  // Select-all checkbox in header
  // Each item card (not a table — card layout for more space):
  //   - Checkbox for selection
  //   - Address details (name, full address)
  //   - Donor info
  //   - Tracking number input field
  //   - Action buttons: "Ship" (requires tracking #) and "Delivered"
  //   - Created date
  // Card style: bg-white rounded-2xl p-6 shadow-soft mb-4
  // Tracking input: border rounded-lg px-3 py-2 text-sm
  // Action buttons: small rounded-full buttons matching primary/green styles
}
```

---

## Task 1.11: Queue Page
**File**: `src/app/admin/queue/page.tsx`

```typescript
"use client";
import { useEffect, useState, useCallback } from "react";
import { QueueList } from "@/components/admin/QueueList";

export default function AdminQueuePage(): JSX.Element {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const fetchQueue = useCallback(() => {
    fetch("/api/admin/queue")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      });
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleUpdateStatus = async (id: string, status: "shipped" | "delivered", trackingNumber?: string) => {
    await fetch("/api/admin/queue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, trackingNumber }),
    });
    fetchQueue();
  };

  const handleBulkUpdate = async (ids: string[], status: "shipped" | "delivered", trackingNumbers?: Record<string, string>) => {
    await fetch("/api/admin/queue/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status, trackingNumbers }),
    });
    fetchQueue();
  };

  // Render:
  // h1: "Bible Queue" text-3xl font-[800]
  // Subtitle: "{total} pending items"
  // QueueList with items and handlers
  // Empty state if no pending items
}
```

---

## File Ownership Summary
All files in this task belong to **Team 1 only**:
- `src/app/admin/layout.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/shipments/page.tsx`
- `src/app/admin/donors/page.tsx`
- `src/app/admin/queue/page.tsx`
- `src/components/admin/AdminSidebar.tsx`
- `src/components/admin/StatsCard.tsx`
- `src/components/admin/StatusBadge.tsx`
- `src/components/admin/ShipmentsTable.tsx`
- `src/components/admin/DonorsTable.tsx`
- `src/components/admin/QueueList.tsx`

## Data Fetching Pattern
All pages fetch from Team 2's API routes. Use the exact endpoint paths and response shapes from `output/architecture.md`. Never import Prisma directly in frontend code.
