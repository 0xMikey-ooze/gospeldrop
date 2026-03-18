# API Contracts - GospelDrop

## Authentication
All `/api/admin/*` endpoints require:
- Valid NextAuth session cookie
- User `role === "admin"` in the database

Non-admin users receive `403 Forbidden`.
Unauthenticated users receive `401 Unauthorized`.

---

## Admin Endpoints

### GET /api/admin/stats
Returns aggregate statistics for the admin dashboard.

**Response 200**
```json
{
  "totalBiblesSent": 142,
  "pendingOrders": 17,
  "fulfilledThisMonth": 34,
  "totalDonors": 58,
  "totalDonated": 725000
}
```
- `totalDonated` is in cents (divide by 100 for dollars)
- `fulfilledThisMonth` counts `BibleDrop` records with `status=delivered` and `deliveredAt >= start of current month`

---

### GET /api/admin/shipments
Returns paginated, sortable list of all BibleDrop shipments.

**Query Params**
| Param     | Default     | Description                              |
|-----------|-------------|------------------------------------------|
| sortBy    | createdAt   | Column to sort: createdAt, shippedAt, deliveredAt, status |
| sortDir   | desc        | asc or desc                              |
| status    | (none)      | Filter by status: pending, shipped, delivered, failed |
| page      | 1           | Page number                              |
| limit     | 20          | Items per page                           |

**Response 200**
```json
{
  "shipments": [
    {
      "id": "clxxx",
      "status": "shipped",
      "trackingNumber": "1Z999AA10123456784",
      "shippedAt": "2026-03-15T10:00:00Z",
      "deliveredAt": null,
      "createdAt": "2026-03-14T08:00:00Z",
      "address": {
        "name": "John Smith",
        "line1": "123 Main St",
        "city": "Springfield",
        "state": "IL",
        "zip": "62701"
      },
      "donation": {
        "user": { "email": "donor@example.com", "name": "Jane Donor" }
      }
    }
  ],
  "total": 142,
  "page": 1,
  "limit": 20
}
```

---

### PATCH /api/admin/shipments/:id
Update status and/or tracking number for a shipment.

**Request Body**
```json
{
  "status": "shipped",
  "trackingNumber": "1Z999AA10123456784"
}
```
- `status`: optional, one of `pending | shipped | delivered | failed`
- `trackingNumber`: optional string
- Setting `status=shipped` automatically sets `shippedAt`
- Setting `status=delivered` automatically sets `deliveredAt` and **triggers fulfillment email** to the donor

**Response 200** — Updated BibleDrop record with nested donation.user

---

### GET /api/admin/donors
Returns paginated list of all donors with their donation history and aggregated stats.

**Query Params**
| Param  | Default | Description  |
|--------|---------|--------------|
| page   | 1       | Page number  |
| limit  | 20      | Per page     |

**Response 200**
```json
{
  "donors": [
    {
      "id": "clxxx",
      "email": "donor@example.com",
      "name": "Jane Donor",
      "role": "user",
      "createdAt": "2026-01-01T00:00:00Z",
      "totalDonated": 50000,
      "bibleCount": 10,
      "donationHistory": [
        {
          "id": "clyyy",
          "amount": 2500,
          "quantity": 5,
          "status": "completed",
          "createdAt": "2026-02-15T00:00:00Z",
          "bibleDrops": [
            { "id": "clzzz", "status": "delivered", "trackingNumber": "TRK123" }
          ]
        }
      ]
    }
  ],
  "total": 58,
  "page": 1,
  "limit": 20
}
```
- `totalDonated` is in cents

---

### GET /api/admin/queue
Returns paginated list of pending BibleDrop items in FIFO order (oldest first).

**Query Params**
| Param  | Default | Description  |
|--------|---------|--------------|
| page   | 1       | Page number  |
| limit  | 20      | Per page     |

**Response 200**
```json
{
  "queue": [
    {
      "id": "clxxx",
      "status": "pending",
      "trackingNumber": null,
      "createdAt": "2026-03-10T00:00:00Z",
      "address": {
        "name": "Random Household",
        "line1": "456 Oak Ave",
        "city": "Dallas",
        "state": "TX",
        "zip": "75201"
      },
      "donation": {
        "user": { "email": "sponsor@example.com", "name": "Sponsor" }
      }
    }
  ],
  "total": 17,
  "page": 1,
  "limit": 20
}
```

---

### PATCH /api/admin/queue/:id
Perform an action on a queue item.

**Request Body**
```json
{
  "action": "fulfill",
  "trackingNumber": "TRK456"
}
```
- `action`: required, one of `fulfill | skip | cancel`
  - `fulfill` → status becomes `shipped`, sets `shippedAt`, sends fulfillment email, `trackingNumber` optional
  - `skip` → status remains `pending` (moves to back of queue via updated timestamp)
  - `cancel` → status becomes `failed`

**Response 200** — Updated BibleDrop record

---

### DELETE /api/admin/queue/:id
Permanently removes a BibleDrop from the database.

**Response 200**
```json
{ "deleted": "clxxx" }
```

---

## Email Notifications

Fulfillment emails are triggered automatically when:
1. `PATCH /api/admin/shipments/:id` with `status=delivered`
2. `PATCH /api/admin/queue/:id` with `action=fulfill`

Email is sent to the donor (the user who created the donation linked to the BibleDrop).

**Environment Variables for Email:**
| Variable    | Description                        | Default                     |
|-------------|------------------------------------|-----------------------------|
| SMTP_HOST   | SMTP server hostname               | (uses jsonTransport if unset) |
| SMTP_PORT   | SMTP port                          | 587                         |
| SMTP_SECURE | true for TLS/SSL                   | false                       |
| SMTP_USER   | SMTP username                      | —                           |
| SMTP_PASS   | SMTP password                      | —                           |
| EMAIL_FROM  | Sender address                     | noreply@gospeldrop.org      |
