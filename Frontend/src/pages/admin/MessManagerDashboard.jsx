import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../utils/api";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "requests", label: "Requests" },
  { id: "members", label: "Members" },
  { id: "menu", label: "Menu" },
  { id: "billing", label: "Billing" },
  { id: "announcements", label: "Announcements" },
  { id: "settings", label: "Settings" },
];

const toDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

export default function MessManagerDashboard() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [requestStatusFilter, setRequestStatusFilter] = useState("ALL");
  const [requestSearch, setRequestSearch] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState("ALL");
  const [memberSearch, setMemberSearch] = useState("");

  const [dashboard, setDashboard] = useState({ stats: {}, latestAnnouncements: [] });
  const [requests, setRequests] = useState([]);
  const [members, setMembers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [bills, setBills] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [users, setUsers] = useState([]);

  const [menuForm, setMenuForm] = useState({ date: "", mealType: "BREAKFAST", itemName: "", notes: "", isHoliday: false });
  const [billGen, setBillGen] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    fixedCharge: "0",
    perMealCharge: "0",
    dueDate: "",
  });
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    type: "GENERAL",
    isPinned: false,
  });

  const activeMembers = useMemo(() => members.filter((m) => m.status === "ACTIVE"), [members]);
  const inactiveMembers = useMemo(() => members.filter((m) => m.status !== "ACTIVE"), [members]);
  const pendingRequests = useMemo(() => requests.filter((r) => r.status === "PENDING"), [requests]);

  const loadCore = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const [d, r, m, mn, b, a, u] = await Promise.all([
        api.get("/mess/manager/dashboard"),
        api.get("/mess/manager/requests"),
        api.get("/mess/manager/members"),
        api.get("/mess/manager/menu"),
        api.get("/mess/manager/bills"),
        api.get("/mess/manager/announcements"),
        api.get("/mess/manager/users"),
      ]);

      setDashboard(d.data || { stats: {}, latestAnnouncements: [] });
      setRequests(Array.isArray(r.data) ? r.data : []);
      setMembers(Array.isArray(m.data) ? m.data : []);
      setMenuItems(Array.isArray(mn.data) ? mn.data : []);
      setBills(Array.isArray(b.data) ? b.data : []);
      setAnnouncements(Array.isArray(a.data) ? a.data : []);
      setUsers(Array.isArray(u.data) ? u.data : []);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setMsg(err.response?.data?.error || "Could not load mess manager data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  useEffect(() => {
    const id = setInterval(() => {
      loadCore();
    }, 30000);
    return () => clearInterval(id);
  }, [loadCore]);

  const filteredRequests = useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    return requests.filter((r) => {
      const matchesStatus = requestStatusFilter === "ALL" || r.status === requestStatusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;

      const name = String(r.student?.user?.fullName || "").toLowerCase();
      const erp = String(r.student?.user?.erp || "").toLowerCase();
      const type = String(r.type || "").toLowerCase();
      return name.includes(q) || erp.includes(q) || type.includes(q);
    });
  }, [requests, requestSearch, requestStatusFilter]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return members.filter((m) => {
      const matchesStatus = memberStatusFilter === "ALL" || m.status === memberStatusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;

      const name = String(m.student?.user?.fullName || "").toLowerCase();
      const erp = String(m.student?.user?.erp || "").toLowerCase();
      const room = String(m.roomNumber || m.student?.roomApplications?.[0]?.room?.roomNumber || "").toLowerCase();
      return name.includes(q) || erp.includes(q) || room.includes(q);
    });
  }, [members, memberSearch, memberStatusFilter]);

  const reviewRequest = async (id, status) => {
    try {
      await api.put(`/mess/manager/requests/${id}/review`, { status });
      setMsg(`Request ${status.toLowerCase()} successfully`);
      loadCore();
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to update request");
    }
  };

  const updateMember = async (id, payload) => {
    try {
      await api.put(`/mess/manager/members/${id}`, payload);
      setMsg("Member record updated");
      loadCore();
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to update member");
    }
  };

  const addMenuItem = async (e) => {
    e.preventDefault();
    try {
      await api.post("/mess/manager/menu", menuForm);
      setMsg("Menu item added");
      setMenuForm({ date: "", mealType: "BREAKFAST", itemName: "", notes: "", isHoliday: false });
      loadCore();
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to add menu item");
    }
  };

  const generateBills = async (e) => {
    e.preventDefault();
    try {
      await api.post("/mess/manager/bills/generate", {
        ...billGen,
        month: Number(billGen.month),
        year: Number(billGen.year),
        fixedCharge: Number(billGen.fixedCharge),
        perMealCharge: Number(billGen.perMealCharge),
      });
      setMsg("Monthly bills generated");
      loadCore();
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to generate bills");
    }
  };

  const updateBill = async (bill, changes) => {
    try {
      await api.put(`/mess/manager/bills/${bill.id}`, {
        fine: Number(changes.fine ?? bill.fine),
        extraCharge: Number(changes.extraCharge ?? bill.extraCharge),
        paidAmount: Number(changes.paidAmount ?? bill.paidAmount),
      });
      setMsg("Bill updated");
      loadCore();
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to update bill");
    }
  };

  const exportBills = async () => {
    try {
      const response = await api.get("/mess/manager/bills/export", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mess-bills-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to export report");
    }
  };

  const addAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await api.post("/mess/manager/announcements", announcementForm);
      setMsg("Announcement posted");
      setAnnouncementForm({ title: "", message: "", type: "GENERAL", isPinned: false });
      loadCore();
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to post announcement");
    }
  };

  const changeUser = async (id, payload) => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) return;
    try {
      await api.put(`/mess/manager/users/${id}`, payload);
      setMsg("User permission updated");
      loadCore();
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to update user");
    }
  };

  const removeUser = async (id) => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) return;
    try {
      await api.delete(`/mess/manager/users/${id}`);
      setMsg("User removed");
      loadCore();
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to remove user");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Mess Manager Dashboard</h1>
        <p className="text-sm text-gray-500">Manage requests, records, menu, billing, notices and portal permissions.</p>
        <p className="text-xs text-gray-400 mt-1">
          Live snapshot updates every 30 seconds {lastUpdatedAt ? `• Last sync ${lastUpdatedAt.toLocaleTimeString()}` : ""}
        </p>
      </div>

      {msg && <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700">{msg}</div>}

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === t.id ? "bg-[#6B0F1A] text-white" : "border border-gray-300 bg-white text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading data...</p>}

      {!loading && tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            ["Active Members", dashboard.stats.activeMembers || 0],
            ["Inactive Members", dashboard.stats.inactiveMembers || 0],
            ["Pending Requests", dashboard.stats.pendingRequests || 0],
            ["Unpaid Bills", dashboard.stats.unpaidBills || 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{value}</p>
            </div>
          ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Requests Awaiting Action</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{pendingRequests.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Active Members (Loaded)</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{activeMembers.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Inactive Members (Loaded)</p>
              <p className="mt-1 text-2xl font-bold text-slate-700">{inactiveMembers.length}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && tab === "requests" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-3 flex flex-wrap items-center gap-2">
            <input
              value={requestSearch}
              onChange={(e) => setRequestSearch(e.target.value)}
              placeholder="Search by student name, ERP, or request type"
              className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={requestStatusFilter}
              onChange={(e) => setRequestStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2">Dietary</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-800">{r.student?.user?.fullName}</p>
                    <p className="text-xs text-gray-500">{r.student?.user?.erp}</p>
                  </td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{r.student?.roomApplications?.[0]?.room?.roomNumber || "-"}</td>
                  <td className="px-3 py-2">{r.dietaryPreference || "-"}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{toDate(r.createdAt)}</td>
                  <td className="px-3 py-2">
                    {r.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <button className="rounded border border-green-200 px-2 py-1 text-xs text-green-700" onClick={() => reviewRequest(r.id, "APPROVED")}>Approve</button>
                        <button className="rounded border border-red-200 px-2 py-1 text-xs text-red-700" onClick={() => reviewRequest(r.id, "REJECTED")}>Reject</button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-500">No requests match your filters</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {!loading && tab === "members" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-3 flex flex-wrap items-center gap-2">
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members by ERP, name, or room"
              className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={memberStatusFilter}
              onChange={(e) => setMemberStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="ALL">All Members</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2">Dietary</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Profile</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr key={m.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-800">{m.student?.user?.fullName}</p>
                    <p className="text-xs text-gray-500">{m.student?.user?.erp}</p>
                  </td>
                  <td className="px-3 py-2">{m.roomNumber || m.student?.roomApplications?.[0]?.room?.roomNumber || "-"}</td>
                  <td className="px-3 py-2">{m.dietaryPreference || m.student?.dietaryPreference || "-"}</td>
                  <td className="px-3 py-2">{m.status}</td>
                  <td className="px-3 py-2">
                    <Link className="text-xs text-blue-600 underline" to={`/admin/mess/students/${m.studentId}`}>View profile</Link>
                  </td>
                  <td className="px-3 py-2">
                    {m.status === "ACTIVE" ? (
                      <button className="rounded border border-red-200 px-2 py-1 text-xs text-red-700" onClick={() => updateMember(m.id, { status: "INACTIVE" })}>Set Inactive</button>
                    ) : (
                      <button className="rounded border border-green-200 px-2 py-1 text-xs text-green-700" onClick={() => updateMember(m.id, { status: "ACTIVE" })}>Set Active</button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">No members found for this filter/search</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Active vs Inactive: {activeMembers.length} active / {members.length - activeMembers.length} inactive
          </div>
        </div>
        </div>
      )}

      {!loading && tab === "menu" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <form onSubmit={addMenuItem} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <p className="font-medium text-gray-800">Update Menu Items</p>
            <input className="w-full rounded border p-2 text-sm" type="date" value={menuForm.date} onChange={(e) => setMenuForm((s) => ({ ...s, date: e.target.value }))} required />
            <select className="w-full rounded border p-2 text-sm" value={menuForm.mealType} onChange={(e) => setMenuForm((s) => ({ ...s, mealType: e.target.value }))}>
              <option value="BREAKFAST">Breakfast</option>
              <option value="LUNCH">Lunch</option>
              <option value="DINNER">Dinner</option>
            </select>
            <input className="w-full rounded border p-2 text-sm" placeholder="Items" value={menuForm.itemName} onChange={(e) => setMenuForm((s) => ({ ...s, itemName: e.target.value }))} required />
            <input className="w-full rounded border p-2 text-sm" placeholder="Notes" value={menuForm.notes} onChange={(e) => setMenuForm((s) => ({ ...s, notes: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={menuForm.isHoliday} onChange={(e) => setMenuForm((s) => ({ ...s, isHoliday: e.target.checked }))} />
              Mark as holiday
            </label>
            <button className="rounded bg-[#6B0F1A] px-3 py-2 text-sm text-white">Save Menu</button>
          </form>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-medium text-gray-800">Current Menu</p>
            <div className="space-y-2 max-h-[360px] overflow-auto">
              {menuItems.map((item) => (
                <div key={item.id} className="rounded border border-gray-100 p-2 text-sm">
                  <p className="font-medium text-gray-800">{item.itemName}</p>
                  <p className="text-xs text-gray-500">{toDate(item.date)} | {item.mealType}</p>
                  {item.notes && <p className="text-xs text-gray-600">{item.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === "billing" && (
        <div className="space-y-4">
          <form onSubmit={generateBills} className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-6">
            <input className="rounded border p-2 text-sm" placeholder="Month" value={billGen.month} onChange={(e) => setBillGen((s) => ({ ...s, month: e.target.value }))} required />
            <input className="rounded border p-2 text-sm" placeholder="Year" value={billGen.year} onChange={(e) => setBillGen((s) => ({ ...s, year: e.target.value }))} required />
            <input className="rounded border p-2 text-sm" placeholder="Fixed" value={billGen.fixedCharge} onChange={(e) => setBillGen((s) => ({ ...s, fixedCharge: e.target.value }))} required />
            <input className="rounded border p-2 text-sm" placeholder="Per meal" value={billGen.perMealCharge} onChange={(e) => setBillGen((s) => ({ ...s, perMealCharge: e.target.value }))} required />
            <input className="rounded border p-2 text-sm" type="date" value={billGen.dueDate} onChange={(e) => setBillGen((s) => ({ ...s, dueDate: e.target.value }))} />
            <button className="rounded bg-[#6B0F1A] px-3 py-2 text-sm text-white">Generate Bills</button>
          </form>

          <div className="flex justify-end">
            <button onClick={exportBills} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700">Export Reports</button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Month</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Paid</th>
                  <th className="px-3 py-2">Fine</th>
                  <th className="px-3 py-2">Extra</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{b.student?.user?.fullName}</td>
                    <td className="px-3 py-2">{b.month}/{b.year}</td>
                    <td className="px-3 py-2">PKR {Number(b.totalAmount).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-24 rounded border p-1 text-xs"
                        defaultValue={b.paidAmount}
                        onBlur={(e) => updateBill(b, { paidAmount: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-20 rounded border p-1 text-xs"
                        defaultValue={b.fine}
                        onBlur={(e) => updateBill(b, { fine: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-20 rounded border p-1 text-xs"
                        defaultValue={b.extraCharge}
                        onBlur={(e) => updateBill(b, { extraCharge: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">{b.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === "announcements" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <form onSubmit={addAnnouncement} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <p className="font-medium text-gray-800">Send Updates</p>
            <input className="w-full rounded border p-2 text-sm" placeholder="Title" value={announcementForm.title} onChange={(e) => setAnnouncementForm((s) => ({ ...s, title: e.target.value }))} required />
            <textarea className="w-full rounded border p-2 text-sm" rows={4} placeholder="Message" value={announcementForm.message} onChange={(e) => setAnnouncementForm((s) => ({ ...s, message: e.target.value }))} required />
            <select className="w-full rounded border p-2 text-sm" value={announcementForm.type} onChange={(e) => setAnnouncementForm((s) => ({ ...s, type: e.target.value }))}>
              <option value="MENU_CHANGE">Menu Changes</option>
              <option value="HOLIDAY">Holiday</option>
              <option value="DUES">Dues or Deadline</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="GENERAL">General</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={announcementForm.isPinned} onChange={(e) => setAnnouncementForm((s) => ({ ...s, isPinned: e.target.checked }))} />
              Pin this notice
            </label>
            <button className="rounded bg-[#6B0F1A] px-3 py-2 text-sm text-white">Post Announcement</button>
          </form>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 font-medium text-gray-800">Recent Updates</p>
            <div className="space-y-2 max-h-[360px] overflow-auto">
              {announcements.map((a) => (
                <div key={a.id} className="rounded border border-gray-100 p-2 text-sm">
                  <p className="font-medium text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.type} | {toDate(a.createdAt)}</p>
                  <p className="text-xs text-gray-700 mt-1">{a.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && tab === "settings" && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{u.fullName}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded border p-1 text-xs"
                      value={u.role}
                      onChange={(e) => changeUser(u.id, { role: e.target.value })}
                    >
                      <option value="STUDENT">Student</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MESS_MANAGER">Mess Manager</option>
                      <option value="COMPLAINT_MANAGER">Complaint Manager</option>
                      <option value="CLEANING_MANAGER">Cleaning Manager</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">{u.isActive ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 flex gap-2">
                    <button className="rounded border border-gray-300 px-2 py-1 text-xs" onClick={() => changeUser(u.id, { isActive: !u.isActive })}>
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button className="rounded border border-red-200 px-2 py-1 text-xs text-red-700" onClick={() => removeUser(u.id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
