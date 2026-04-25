// client/src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats,  setStats]  = useState({});
  const [apps,   setApps]   = useState([]);
  const [complaints, setComplaints] = useState([]);

  const loadDashboard = () => {
    api.get("/admin/dashboard").then(r => setStats(r.data)).catch(()=>{});
    api.get("/rooms/admin/applications?status=PENDING").then(r => setApps(r.data.slice(0,5))).catch(()=>{});
    api.get("/complaints/admin/all?status=PENDING").then(r => setComplaints(r.data.slice(0,5))).catch(()=>{});
  };

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(loadDashboard, 30000);
    return () => clearInterval(timer);
  }, []);

  const statCards = [
    { label:"Total Students", value: stats.totalStudents ?? "—", icon:"👥", color:"bg-blue-50 text-blue-600", link:"/admin/students" },
    { label:"Allocated Rooms", value: stats.allocatedRooms ?? "—", icon:"🛏️", color:"bg-indigo-50 text-indigo-600", link:"/admin/rooms" },
    { label:"Available Rooms", value: stats.availableRooms ?? "—", icon:"🏠", color:"bg-cyan-50 text-cyan-600", link:"/admin/rooms" },
    { label:"Pending Applications", value: stats.pendingApps ?? "—", icon:"📋", color:"bg-yellow-50 text-yellow-600", link:"/admin/applications" },
    { label:"Active Complaints", value: stats.activeComplaints ?? "—", icon:"💬", color:"bg-red-50 text-red-600", link:"/admin/complaints" },
    { label:"Active Mess Subscriptions", value: stats.activeOrders ?? "—", icon:"🍽️", color:"bg-green-50 text-green-600", link:"/admin/orders" },
    { label:"Unpaid Subscriptions", value: stats.unpaidSubscriptions ?? "—", icon:"💳", color:"bg-orange-50 text-orange-600", link:"/admin/orders" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Admin Dashboard</h2>
        <p className="text-xs text-gray-400">HMS Portal — IBA Karachi Hostel Management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon, color, link }) => (
          <div key={label} onClick={() => link && navigate(link)}
            className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-md ${link ? "cursor-pointer hover:shadow-lg" : ""}`}>
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-xl mb-3`}>{icon}</div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-md">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-medium text-gray-700">Recent Applications</h3>
            <button onClick={() => navigate("/admin/applications")} className="text-xs text-[#6B0F1A] hover:underline">View all →</button>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50"><tr>{["Student","Term","Status"].map(h=><th key={h} className="px-4 py-2 text-left text-gray-400">{h}</th>)}</tr></thead>
            <tbody>
              {apps.map(a => (
                <tr key={a.id} className="border-t border-gray-50">
                  <td className="px-4 py-2.5 text-gray-700">{a.student?.user?.fullName}</td>
                  <td className="px-4 py-2.5 text-gray-500">{a.term}</td>
                  <td className="px-4 py-2.5"><span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{a.status}</span></td>
                </tr>
              ))}
              {apps.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No pending applications</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Recent Complaints */}
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-md">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-medium text-gray-700">Pending Complaints</h3>
            <button onClick={() => navigate("/admin/complaints")} className="text-xs text-[#6B0F1A] hover:underline">View all →</button>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50"><tr>{["Subject","Category","Date"].map(h=><th key={h} className="px-4 py-2 text-left text-gray-400">{h}</th>)}</tr></thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c.id} className="border-t border-gray-50">
                  <td className="px-4 py-2.5 text-gray-700 max-w-[150px] truncate">{c.subject}</td>
                  <td className="px-4 py-2.5 text-gray-500">{c.category}</td>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(c.submittedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {complaints.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">No open complaints</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
