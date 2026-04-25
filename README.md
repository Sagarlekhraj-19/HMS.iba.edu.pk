# HMS Portal — IBA Karachi
**Hostel Management System** — Web-Based Application Development, Milestone 4

HMS Portal is a hostel and mess management web application built to streamline room allocation, complaints, mess subscriptions, student records, and administrative workflows for IBA Karachi.

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18 + Vite + Tailwind CSS    |
| Backend  | Express.js (Node.js)              |
| Database | PostgreSQL                        |
| ORM      | Prisma                            |
| Auth     | JWT (jsonwebtoken) + bcryptjs     |

## Features

- Student registration, login, logout, and role-based access control
- Room application, allocation, review, and room management workflows
- Mess order placement, cancellation, billing, and manager review flows
- Complaint submission, assignment, resolution, and rejection tracking
- Student feedback submission and history tracking
- Admin dashboards, mess manager dashboards, and user access management
- Responsive UI with toast-style status messages, confirmation dialogs, and realtime refreshes

---

## Project Structure

```
hms-portal/
├── Frontend/             # React frontend (Vite)
│   ├── src/
│   │   ├── context/      # AuthContext (global user state)
│   │   ├── utils/        # Axios instance with JWT interceptor
│   │   ├── pages/
│   │   │   ├── student/  # Student-facing pages
│   │   │   └── admin/    # Admin/warden-facing pages
│   │   └── App.jsx       # Routes + guards
│   └── package.json
│
└── Backend/              # Express backend
    ├── routes/           # Route handlers (one file per domain)
    ├── services/         # Business logic + Prisma queries
    ├── middleware/       # JWT auth middleware
    ├── prisma/
    │   └── schema.prisma # Database schema
    └── index.js          # Entry point
```

---

## Local Setup

### Prerequisites
- Node.js v18+
- PostgreSQL installed and running

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/hms-portal.git
cd hms-portal
```

### 2. Set up the backend

```bash
cd Backend
npm install
```

Create a `.env` file in `Backend/`:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/hms_db"
JWT_SECRET="any_long_random_secret_string"
PORT=5000
CLIENT_URL="http://localhost:5173"
```

Create the database in PostgreSQL:
```bash
psql -U postgres -c "CREATE DATABASE hms_db;"
```

Push the Prisma schema to the database:
```bash
npx prisma db push
```

Start the server:
```bash
npm run dev
```

Server runs on: `http://localhost:5000`

### 3. Set up the frontend

```bash
cd ../Frontend
npm install
```

Create a `.env` file in `Frontend/`:
```env
VITE_API_URL=http://localhost:5000/api
```

Start the dev server:
```bash
npm run dev
```

Frontend runs on: `http://localhost:5173`

### 4. Seed data

If your database is empty, run the Prisma seed script from the backend folder:

```bash
npm run db:seed
```

If your project uses a different seed command in `Backend/package.json`, use that script instead.

---

## Implemented Flows

### Flow 1: Room Allocation (Full CRUD)
| Operation | Who    | Endpoint                              |
|-----------|--------|---------------------------------------|
| Create    | Student| `POST /api/rooms/apply`               |
| Read      | Student| `GET /api/rooms/my-applications`      |
| Read all  | Admin  | `GET /api/rooms/admin/applications`   |
| Update    | Admin  | `PUT /api/rooms/admin/applications/:id` (approve / allocate / reject) |
| Create    | Admin  | `POST /api/rooms/admin/create`        |
| Update    | Admin  | `PUT /api/rooms/admin/:id`            |
| Delete    | Admin  | `DELETE /api/rooms/admin/:id`         |

### Flow 2: Mess Subscription (Full CRUD)
| Operation | Who     | Endpoint                          |
|-----------|---------|-----------------------------------|
| Create    | Student | `POST /api/mess/order`            |
| Read      | Student | `GET /api/mess/my-orders`         |
| Delete    | Student | `DELETE /api/mess/order/:id`      |
| Read all  | Admin   | `GET /api/mess/admin/orders`      |
| Update    | Admin   | `PUT /api/mess/admin/orders/:id/pay` |

---

## Full API Reference

### Auth
```
POST   /api/auth/register     Register a new user
POST   /api/auth/login        Student login, returns JWT token
POST   /api/auth/admin-login  Admin/staff login (student credentials denied)
POST   /api/auth/logout       Clear session cookie and local auth
POST   /api/auth/forgot-password  Self-service password reset
GET    /api/auth/me           Get current user profile [JWT required]
GET    /api/auth/notifications Get current user notifications [JWT required]
```

**Register request body:**
```json
{
  "fullName": "Sagar Lekhraj",
  "erp": "29325",
  "email": "s.sagar.29325@khi.iba.edu.pk",
  "password": "mypassword123",
  "program": "BSCS"
}
```

**Login request body:**
```json
{ "erp": "29325", "password": "mypassword123" }
```

**Login response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "user": { "id": 1, "fullName": "Sagar Lekhraj", "erp": "29325", "role": "STUDENT" }
}
```

---

### Room Allocation

```
GET    /api/rooms                          List all rooms [JWT]
GET    /api/rooms/:id                      Get one room [JWT]
GET    /api/rooms/my-applications          Student's own applications [JWT]
POST   /api/rooms/apply                    Student submits application [JWT, STUDENT]
GET    /api/rooms/admin/applications       All applications [JWT, ADMIN]
PUT    /api/rooms/admin/applications/:id   Update status + assign room [JWT, ADMIN]
POST   /api/rooms/admin/create             Create a room [JWT, ADMIN]
PUT    /api/rooms/admin/:id                Update room [JWT, ADMIN]
DELETE /api/rooms/admin/:id                Delete room [JWT, ADMIN]
```

**POST /api/rooms/apply body:**
```json
{ "term": "Fall 2026" }
```

**PUT /api/rooms/admin/applications/:id body (approve + assign room):**
```json
{ "status": "ALLOCATED", "roomId": 3 }
```

**POST /api/rooms/admin/create body:**
```json
{
  "roomNumber": "B-204",
  "block": "Block B",
  "floor": 2,
  "type": "DOUBLE",
  "capacity": 2
}
```

---

### Mess Subscription

```
GET    /api/mess/my-orders              Student's orders [JWT]
POST   /api/mess/order                  Place a new order [JWT, STUDENT]
DELETE /api/mess/order/:id              Cancel an order [JWT, STUDENT]
GET    /api/mess/admin/orders           All orders [JWT, ADMIN]
PUT    /api/mess/admin/orders/:id/pay   Mark order as paid [JWT, ADMIN]
```

### Team Contributions

| Team Member | Responsibilities |
|-------------|------------------|
| Frontend Developer | Frontend pages, layout, styling, responsive behavior, and routing |
| Backend Developer | Backend APIs, Prisma schema, authentication, validation, and business rules |
| QA / Documentation | Testing, bug fixing, deployment checks, and README documentation |

**POST /api/mess/order body:**
```json
{
  "mealTypes": ["Sehri", "Dinner"],
  "startDate": "2026-02-18",
  "endDate": "2026-03-10"
}
```

**POST /api/mess/order response:**
```json
{
  "id": 5,
  "orderId": "ORD-1740000000000",
  "mealTypes": ["Sehri", "Dinner"],
  "startDate": "2026-02-18T00:00:00.000Z",
  "endDate": "2026-03-10T00:00:00.000Z",
  "totalAmount": 11970,
  "status": "ACTIVE",
  "isPaid": false
}
```

---

### Complaints

```
GET    /api/complaints              Student's complaints [JWT]
GET    /api/complaints/:id          View one complaint [JWT]
POST   /api/complaints              Raise a complaint [JWT, STUDENT]
DELETE /api/complaints/:id          Withdraw a complaint [JWT, STUDENT]
GET    /api/complaints/admin/all    All complaints [JWT, ADMIN]
PUT    /api/complaints/admin/:id    Update complaint status [JWT, ADMIN]
```

**POST /api/complaints body:**
```json
{
  "category": "ELECTRICAL",
  "subject": "Power socket sparking",
  "description": "The socket near the desk has been sparking since Feb 6th.",
  "roomNumber": "B-204",
  "attachment": "socket_issue.jpg"
}
```

**PUT /api/complaints/admin/:id body:**
```json
{ "status": "IN_PROGRESS" }
```

---

### Admin

```
GET    /api/admin/dashboard    Stats summary [JWT, ADMIN]
GET    /api/admin/students     All students [JWT, ADMIN]
GET    /api/admin/feedback     All feedback [JWT, ADMIN]
```

### Feedback (Student)

```
GET    /api/feedback/my        Student feedback history [JWT, STUDENT]
POST   /api/feedback           Submit feedback [JWT, STUDENT]
```

---

## Version Control Guidelines

```bash
# Branching strategy used:
main                        # production-ready, always deployable
feature/auth                # user registration and login
feature/room-allocation     # room apply + admin review flow
feature/mess-subscription   # meal ordering + billing
feature/complaints          # raise, view, withdraw, admin update

# Commit message format:
feat(scope): short description     # new feature
fix(scope): short description      # bug fix
chore: description                 # deps, config, setup
docs: update README                # documentation
```

---

## Database Schema Overview

| Model          | Key Fields                                          |
|----------------|-----------------------------------------------------|
| User           | id, fullName, erp, email, password, role            |
| Student        | id, userId (→ User)                                 |
| Admin          | id, userId (→ User), block                          |
| Room           | id, roomNumber, block, floor, type, isAvailable     |
| RoomApplication| id, studentId, roomId, term, status, appId          |
| MessOrder      | id, studentId, mealTypes[], startDate, endDate, totalAmount, isPaid |
| Complaint      | id, studentId, category, subject, description, roomNumber, status |
| Feedback       | id, studentId, feedbackType, comment, rating        |

---

  
  
  
  
  
  
  # Figma wireframes:
  https://www.figma.com/design/vhQavxqOXw0dNVJUJAAiCI/Untitled?node-id=0-1&t=eEUc7TVduyAgbTkO-1
