// client/src/pages/student/StudentDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apps,    setApps]    = useState([]);
  const [orders,  setOrders]  = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const [appsRes, ordersRes, complaintsRes] = await Promise.allSettled([
        api.get("/rooms/my-applications"),
        api.get("/mess/my-orders"),
        api.get("/complaints"),
      ]);

      if (appsRes.status === "fulfilled") setApps(Array.isArray(appsRes.value.data) ? appsRes.value.data : []);
      if (ordersRes.status === "fulfilled") setOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : []);
      if (complaintsRes.status === "fulfilled") setComplaints(Array.isArray(complaintsRes.value.data) ? complaintsRes.value.data : []);

      if ([appsRes, ordersRes, complaintsRes].some(r => r.status === "rejected")) {
        setError("Some dashboard data could not be loaded. Pull to refresh later.");
      }
    };

    load();

    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  const currentRoom   = apps.find(a => a.status === "ALLOCATED");
  const activeOrder   = orders.find(o => o.status === "ACTIVE");
  const openComplaints = complaints.filter(c => ["OPEN", "PENDING", "ASSIGNED", "IN_PROGRESS", "REOPENED"].includes(c.status));
  const balanceDue = orders.filter(o => !o.isPaid).reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const studentType = user?.isNTHP ? "NTHP Student" : "Non-NTHP Student";

  const initials = user?.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "SL";

  const StatCard = ({ label, value, sub, color }) => (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-md flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl">
        {label === "ROOM STATUS" ? "🛏️" : label === "MESS STATUS" ? "🍽️" : "💬"}
      </div>
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">{label}</p>
        <p className={`font-semibold text-lg ${color}`}>{value}</p>
        <p className="text-xs text-gray-600">{sub}</p>
      </div>
    </div>
  );

  const QuickCard = ({ title, desc, badge, badgeColor, linkLabel, to }) => (
    <div
      onClick={() => navigate(to)}
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-md cursor-pointer hover:border-[#6B0F1A] hover:shadow-lg transition-all relative"
    >
      <span className={`absolute top-4 right-4 text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
        {badge}
      </span>
      <p className="font-semibold text-gray-800 mt-4">{title}</p>
      <p className="text-xs text-gray-400 mt-1 mb-4">{desc}</p>
      <p className="text-xs text-[#6B0F1A] font-medium">{linkLabel} →</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="bg-[#6B0F1A] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="text-white text-xl font-semibold">{user?.fullName}</h2>
            <p className="text-[#f0d7d7] text-sm">ERP: {user?.erp}</p>
            <p className="text-[#f0d7d7] text-sm">{user?.program} · Spring 2026</p>
            <p className="text-[#f0d7d7] text-sm">{studentType}</p>
          </div>
          <span className="bg-white/25 text-white text-xs px-3 py-1 rounded-lg font-semibold">Student</span>
        </div>
        <div className="bg-white/95 mx-4 mb-4 rounded-xl p-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600">Email:</p>
            <p className="text-sm text-gray-800 font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Room Number:</p>
            <p className="text-sm text-gray-800 font-medium">{currentRoom?.room?.roomNumber || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Hostel Block:</p>
            <p className="text-sm text-gray-800 font-medium">{currentRoom?.room?.block || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Balance Due:</p>
            <p className="text-sm text-gray-800 font-medium">PKR {balanceDue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {error && <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-2 rounded-xl">{error}</div>}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="ROOM STATUS"
          value={currentRoom ? "Allocated" : "Not Allocated"}
          sub={currentRoom ? `${currentRoom.room?.roomNumber} · ${currentRoom.room?.block}` : "No room assigned"}
          color={currentRoom ? "text-green-600" : "text-gray-400"}
        />
        <StatCard
          label="MESS STATUS"
          value={activeOrder ? "Subscribed" : "Not Subscribed"}
          sub={activeOrder ? `${activeOrder.mealTypes?.join(" + ")} · Active` : "No active subscription"}
          color={activeOrder ? "text-green-600" : "text-gray-400"}
        />
        <StatCard
          label="OPEN COMPLAINTS"
          value={openComplaints.length}
          sub={`${complaints.filter(c=>c.status==="PENDING" || c.status==="OPEN").length} Pending · ${complaints.filter(c=>c.status==="IN_PROGRESS").length} In Progress`}
          color="text-gray-800"
        />
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-3 gap-4">
        <QuickCard
          title="Room Allocation"
          desc="View your room details and application history for current & past terms."
          badge={currentRoom ? "Allocated" : "Pending"}
          badgeColor={currentRoom ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}
          linkLabel="View Room Details"
          to="/dashboard/room"
        />
        <QuickCard
          title="Mess Subscription"
          desc="Manage meal plans, view billing history and place new orders."
          badge={activeOrder ? "Active" : "Inactive"}
          badgeColor={activeOrder ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}
          linkLabel="Manage Mess"
          to="/dashboard/mess"
        />
        <QuickCard
          title="Complaint & Feedback"
          desc="Raise complaints, track status updates, and submit service feedback."
          badge={`${openComplaints.length} open`}
          badgeColor="bg-blue-100 text-blue-700"
          linkLabel="Open Complaints"
          to="/dashboard/complaints"
        />
      </div>
    </div>
  );
}
