# HMS Portal — Project Structure

```
hms-portal/
├── Frontend/                  # React frontend (Vite)
│   ├── src/
│   │   ├── api/               # axiosInstance.js
│   │   ├── context/           # AuthContext (global state)
│   │   ├── pages/
│   │   │   ├── student/       # Student views
│   │   │   └── admin/         # Admin views
│   │   ├── utils/             # api.js, notifications.js
│   │   └── App.jsx
│   └── package.json
│
└── Backend/                   # Express backend
    ├── routes/                # Route handlers
    ├── services/              # Business logic (DB calls)
    ├── middleware/            # Auth middleware (JWT)
    ├── prisma/
    │   ├── schema.prisma      # DB schema
    │   └── migrations/        # Migration files
    ├── tests/                 # Auth & role tests
    ├── app.js
    ├── index.js               # Entry point
    └── package.json
```