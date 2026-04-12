# Room Allocation Workflow Improvements

## Overview
The room allocation system has been enhanced to provide a seamless, real-time workflow where:
- Admins can see which applications they've reviewed
- Notifications directly navigate to the application review
- Students see changes instantly without waiting for polling
- The entire process is more transparent and efficient

---

## 🎯 Workflow Flow

### Student Applies for Room
```
Student → Fills form → Submits application
   ↓
RoomApplication created with status: PENDING
   ↓
Notification sent to admin: "RAPP-{appId}"
```

### Admin Receives & Reviews
```
Admin sees notification → Clicks it
   ↓
Auto-navigates to /admin/applications?appId={ID}
   ↓
Review modal auto-opens
   ↓
"mark-reviewed" API called
   ↓
isAdminReviewed set to true (shows ✓ Reviewed badge)
```

### Admin Approves
```
Admin selects status → UNDER_REVIEW, APPROVED, or ALLOCATED
   ↓
If ALLOCATED → Selects room
   ↓
Clicks "Save Changes" or "Allocate Room"
   ↓
updateApplicationStatus called
   ↓
SSE publishes update to student
```

### Student Sees Update (Real-Time)
```
Student connected via SSE (/rooms/stream?token=...)
   ↓
Receives: { status: "APPROVED", roomNumber: "B-204", ... }
   ↓
RoomApplicationStatus page updates instantly
   ↓
Shows "✓ Application approved" with room details
```

---

## 🛠 Technical Implementation

### 1. Database Changes
**File**: `Backend/prisma/schema.prisma`

Added two new fields to RoomApplication model:
```prisma
isAdminReviewed  Boolean      @default(false)  // Tracks if admin viewed it
reviewedAt       DateTime?                     // When admin first opened it
```

**Migration**: `Backend/prisma/migrations/add_admin_review_tracking.sql`
```sql
ALTER TABLE "RoomApplication" ADD COLUMN "isAdminReviewed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RoomApplication" ADD COLUMN "reviewedAt" TIMESTAMP(3);
CREATE INDEX "RoomApplication_isAdminReviewed_idx" ON "RoomApplication"("isAdminReviewed");
```

### 2. Backend API Endpoints

#### New Endpoint: Mark Application as Reviewed
```
POST /api/rooms/admin/applications/:id/mark-reviewed
Authorization: Admin token required

Purpose: Called when admin opens the review modal
Effect: Sets isAdminReviewed=true, reviewedAt=now()
```

**File**: `Backend/routes/room.routes.js` (lines 80-87)
**Service**: `Backend/services/room.service.js` (lines 265-290)

#### Updated Endpoint: Update Application Status
```
PUT /api/rooms/admin/applications/:id
Body: { status, roomId?, remarks?, adminUserId }

Changes:
- Automatically marks as reviewed: isAdminReviewed=true
- Publishes status update via SSE with roomBlock info
- Sends isAllocated flag to indicate allocation success
```

**File**: `Backend/services/room.service.js` (lines 140-230)

### 3. Frontend Admin Components

#### AdminApplications.jsx
**File**: `Frontend/src/pages/admin/AdminApplications.jsx`

**Key Features**:
- Auto-opens modal when ?appId=<ID> in URL
- Calls mark-reviewed endpoint on modal open
- Shows "✓ Reviewed" badge for reviewed applications
- Room dropdown displays occupancy: "B-204 — Block A (DOUBLE) — 1/2"
- Improved error handling with color-coded messages
- Save button shows loading state

**Query Parameter Handling**:
```jsx
const appId = searchParams.get("appId");
if (appId && apps.length > 0) {
  const app = apps.find(a => a.id === parseInt(appId));
  if (app) {
    handleOpenReview(app);
    setSearchParams({}); // clear query param
  }
}
```

### 4. Frontend Student Components

#### RoomApplicationStatus.jsx - Real-Time Updates
**File**: `Frontend/src/pages/student/RoomApplicationStatus.jsx`

**SSE Integration**:
```jsx
const eventSource = new EventSource(
  `${api.defaults.baseURL}/rooms/stream?token=${token}`
);

eventSource.onmessage = (event) => {
  const update = JSON.parse(event.data);
  // Updates state immediately with new status and room details
};
```

**Benefits**:
- No more waiting 10 seconds for updates
- Instant notification of status changes
- Polling fallback every 30 seconds (unchanged)
- Shows allocated room block and number immediately

**Enhanced Status Messages**:
```
✓ Application approved. Waiting for room allocation.
🎉 Room allocated successfully to B-204 in Block A.
👀 Your application is currently under admin review.
❌ Application was rejected. You can reapply next term.
```

### 5. Notification Routing

#### Updated Route Mapping
**File**: `Frontend/src/utils/notifications.js`

**Admin Routes**:
```jsx
const ADMIN_ROUTE_MAP = {
  RAPP: "/admin/applications?autoReview=true",  // Room applications
  RCMP: "/admin/complaints",                     // Complaints
  MRQ: "/admin/orders",                          // Mess requests
};
```

#### Smart Navigation
**File**: `Frontend/src/pages/admin/AdminLayout.jsx` (lines 89-102)

When admin clicks RAPP notification:
```jsx
if (item?.id?.startsWith("RAPP-")) {
  const appId = item.id.replace("RAPP-", "");
  navigate(`/admin/applications?appId=${appId}`);
}
```

---

## 📊 Service Level Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Admin Awareness** | No tracking if admin viewed it | isAdminReviewed flag + timestamp |
| **Admin Navigation** | Manual search for application | Direct link from notification |
| **Student Updates** | Poll every 10 seconds | Real-time SSE + 30s fallback |
| **Room Info** | Just room number | Room + Block + Floor + Occupancy |
| **Visual Feedback** | Generic text | Emojis + Color-coded status |
| **Notification Flow** | Just notification | Auto-open + mark-reviewed |

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     STUDENT SIDE                            │
├─────────────────────────────────────────────────────────────┤
│ 1. Apply for Room                                           │
│    POST /rooms/apply → RoomApplication (PENDING)           │
│    ↓                                                        │
│ 2. Notification sent                                        │
│    getNotifications() → "RAPP-123" notification            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      ADMIN SIDE                             │
├─────────────────────────────────────────────────────────────┤
│ 3. Admin Sees Notification                                  │
│    Click notification                                       │
│    ↓                                                        │
│ 4. Navigate to Application                                  │
│    navigate("/admin/applications?appId=123")               │
│    ↓                                                        │
│ 5. Auto-Open Modal                                          │
│    useEffect detects appId param                            │
│    Opens review modal                                       │
│    ↓                                                        │
│ 6. Mark as Reviewed                                         │
│    POST /admin/applications/123/mark-reviewed              │
│    isAdminReviewed = true                                  │
│    ↓                                                        │
│ 7. Admin Reviews & Decides                                 │
│    Select status (APPROVED, ALLOCATED, etc)                │
│    If ALLOCATED: select room                               │
│    Click "Save Changes"                                    │
│    ↓                                                        │
│ 8. Update Application                                       │
│    PUT /admin/applications/123                             │
│    publishRoomUpdate(studentUserId, update)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     STUDENT SIDE                            │
├─────────────────────────────────────────────────────────────┤
│ 9. Real-Time Update via SSE                                 │
│    /rooms/stream receives {                                │
│      status: "ALLOCATED",                                  │
│      roomNumber: "B-204",                                  │
│      roomBlock: "Block A"                                  │
│    }                                                        │
│    ↓                                                        │
│ 10. Instant Display Update                                  │
│     RoomApplicationStatus shows allocation                  │
│     🎉 Room allocated to B-204 in Block A                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 How to Deploy

### 1. Database Migration
```bash
cd Backend
npx prisma migrate dev --name add_admin_review_tracking
```

### 2. Backend Restart
```bash
npm restart
# OR
node index.js
```

### 3. Frontend Rebuild (if needed)
```bash
cd Frontend
npm run build
npm run dev
```

### 4. Test the Flow
1. Student submits room application
2. Admin receives notification
3. Admin clicks notification → auto-opens modal
4. Admin can see "✓ Reviewed" after opening
5. Admin selects "ALLOCATED" and assigns room
6. Student's page updates in real-time showing allocated room

---

## 🧪 Testing Checklist

- [ ] Notification marks student application as visible to admin
- [ ] Clicking notification navigates to /admin/applications?appId=<ID>
- [ ] Modal auto-opens without user clicking "Review"
- [ ] "✓ Reviewed" badge appears after opening
- [ ] Admin can select UNDER_REVIEW status
- [ ] Admin can select APPROVED status
- [ ] Admin can select ALLOCATED + room
- [ ] SSE updates student page instantly
- [ ] Student sees allocated room details
- [ ] Fallback polling works if SSE disconnects

---

## 📝 Notes

- **Migration**: Must run `npx prisma migrate dev` before deploying
- **SSE Token**: Student must be authenticated (token in localStorage or sessionStorage)
- **Real-time**: Requires backend realtime.js service (already in place)
- **Polling Fallback**: Reduced from 10s to 30s for efficiency
- **Error Handling**: Improved with specific error messages

