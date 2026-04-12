// client/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Auth pages
import Register from "./pages/Register";
import Login    from "./pages/Login";

// Student pages
import StudentLayout        from "./pages/student/StudentLayout";
import StudentDashboard     from "./pages/student/StudentDashboard";
import RoomAllocation       from "./pages/student/RoomAllocation";
import RoomApplicationForm  from "./pages/student/RoomApplicationForm";
import RoomApplicationStatus from "./pages/student/RoomApplicationStatus";
import MessSubscription     from "./pages/student/MessSubscription";
import MessBilling          from "./pages/student/MessBilling";
import Complaints           from "./pages/student/Complaints";
import RaiseComplaint       from "./pages/student/RaiseComplaint";
import ComplaintView        from "./pages/student/ComplaintView";
import Feedback             from "./pages/student/Feedback";

// Admin pages
import AdminLayout          from "./pages/admin/AdminLayout";
import AdminDashboard       from "./pages/admin/AdminDashboard";
import AdminApplications    from "./pages/admin/AdminApplications";
import AdminRooms           from "./pages/admin/AdminRooms";
import AdminComplaints      from "./pages/admin/AdminComplaints";
import AdminOrders          from "./pages/admin/AdminOrders";
import AdminStudents        from "./pages/admin/AdminStudents";
import MessManagerDashboard from "./pages/admin/MessManagerDashboard";
import MessStudentProfile   from "./pages/admin/MessStudentProfile";
import AdminUserAccess      from "./pages/admin/AdminUserAccess";

// Route guards
const PrivateRoute = ({ children, role, loginPath = "/login" }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!user) return <Navigate to={loginPath} />;
  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(user.role)) {
      return <Navigate to={user.role === "STUDENT" ? "/dashboard" : "/admin"} />;
    }
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === "STUDENT" ? "/dashboard" : "/admin"} />;
  return children;
};

const RoleBasedAdminHome = () => {
  const { user } = useAuth();
  if (user?.role === "MESS_MANAGER") return <MessManagerDashboard />;
  if (user?.role === "COMPLAINT_MANAGER" || user?.role === "CLEANING_MANAGER") return <AdminComplaints />;
  return <AdminDashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login portal="STUDENT" /></PublicRoute>} />
          <Route path="/admin/login" element={<PublicRoute><Login portal="ADMIN" /></PublicRoute>} />
          <Route path="/"         element={<Navigate to="/login" />} />

          {/* Student routes */}
          <Route path="/dashboard" element={<PrivateRoute role="STUDENT" loginPath="/login"><StudentLayout /></PrivateRoute>}>
            <Route index                    element={<StudentDashboard />} />
            <Route path="room"              element={<RoomAllocation />} />
            <Route path="room/apply"        element={<RoomApplicationForm />} />
            <Route path="room/status"       element={<RoomApplicationStatus />} />
            <Route path="mess"              element={<MessSubscription />} />
            <Route path="mess/billing"      element={<MessBilling />} />
            <Route path="complaints"        element={<Complaints />} />
            <Route path="complaints/new"    element={<RaiseComplaint />} />
            <Route path="complaints/:id"    element={<ComplaintView />} />
            <Route path="feedback"          element={<Feedback />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<PrivateRoute role={["ADMIN", "MESS_MANAGER", "COMPLAINT_MANAGER", "CLEANING_MANAGER"]} loginPath="/admin/login"><AdminLayout /></PrivateRoute>}>
            <Route index                    element={<PrivateRoute role={["ADMIN", "MESS_MANAGER", "COMPLAINT_MANAGER", "CLEANING_MANAGER"]}><RoleBasedAdminHome /></PrivateRoute>} />
            <Route path="mess-dashboard"   element={<PrivateRoute role={["ADMIN", "MESS_MANAGER"]}><MessManagerDashboard /></PrivateRoute>} />
            <Route path="mess/students/:studentId" element={<PrivateRoute role={["ADMIN", "MESS_MANAGER"]}><MessStudentProfile /></PrivateRoute>} />
            <Route path="admin-dashboard"  element={<PrivateRoute role="ADMIN"><AdminDashboard /></PrivateRoute>} />
            <Route path="applications"      element={<PrivateRoute role="ADMIN"><AdminApplications /></PrivateRoute>} />
            <Route path="rooms"             element={<PrivateRoute role="ADMIN"><AdminRooms /></PrivateRoute>} />
            <Route path="complaints"        element={<PrivateRoute role={["ADMIN", "COMPLAINT_MANAGER", "CLEANING_MANAGER"]}><AdminComplaints /></PrivateRoute>} />
            <Route path="orders"            element={<PrivateRoute role={["ADMIN", "MESS_MANAGER"]}><AdminOrders /></PrivateRoute>} />
            <Route path="students"          element={<PrivateRoute role="ADMIN"><AdminStudents /></PrivateRoute>} />
            <Route path="users-access"      element={<PrivateRoute role="ADMIN"><AdminUserAccess /></PrivateRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
