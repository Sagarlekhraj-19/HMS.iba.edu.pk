// client/src/pages/admin/AdminComplaints.jsx
import { useEffect, useState } from "react";
import api from "../../utils/api";

const STATUS_COLORS = {
  OPEN:"bg-red-100 text-red-700",
  PENDING:"bg-red-100 text-red-700",
  ASSIGNED:"bg-amber-100 text-amber-700",
  IN_PROGRESS:"bg-blue-100 text-blue-700",
  RESOLVED:"bg-green-100 text-green-700",
  REOPENED:"bg-neutral-200 text-neutral-800",
  REJECTED:"bg-red-200 text-red-800",
};

const STATUS_LABEL = {
  OPEN: "Pending",
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  REOPENED: "Reopened",
  REJECTED: "Rejected",
};

const ASSIGNED_ROLES = ["CLEANER", "ELECTRICIAN", "PLUMBER", "MESS_MANAGER", "SECURITY"];

const CATEGORY_LABELS = {
  ELECTRICAL_FAN_AC: "Broken fan / AC",
  ELECTRICAL_LIGHTS: "Light not working",
  PLUMBING_LEAKAGE: "Plumbing issues (leakage)",
  MESS_FOOD_QUALITY: "Food quality",
  MESS_LATE_MEALS: "Late meals",
  MESS_KITCHEN_HYGIENE: "Hygiene in kitchen",
  FURNITURE_BED_MATTRESS: "Bed/mattress problem",
  FURNITURE_DAMAGE: "Furniture damage",
  INTERNET_WIFI: "WiFi not working",
  WATER_SHORTAGE: "Water shortage",
  LAUNDRY_ISSUES: "Laundry issues",
  MAINTENANCE: "Maintenance",
  PLUMBING: "Plumbing",
  ELECTRICAL: "Electrical",
  MESS_FOOD: "Mess / Food",
  SECURITY: "Security",
  CLEANING: "Cleaning",
  OTHER: "Other",
};

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [assignedRole, setAssignedRole] = useState("");
  const [assignedStaff, setAssignedStaff] = useState("");
  const [remarks, setRemarks] = useState("");
  const [msg, setMsg] = useState("");

  const fetchComplaints = async () => {
    try {
      const res = await api.get("/complaints/admin/all", {
        params: {
          status: statusFilter === "ALL" ? undefined : statusFilter,
        },
      });
      setComplaints(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to load complaints");
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter]);

  const grouped = {
    PENDING: complaints.filter((c) => c.status === "PENDING" || c.status === "OPEN"),
    ASSIGNED: complaints.filter((c) => c.status === "ASSIGNED"),
    IN_PROGRESS: complaints.filter((c) => c.status === "IN_PROGRESS"),
    RESOLVED: complaints.filter((c) => c.status === "RESOLVED"),
    REOPENED: complaints.filter((c) => c.status === "REOPENED"),
    REJECTED: complaints.filter((c) => c.status === "REJECTED"),
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/complaints/admin/${selected.id}`, {
        status: newStatus,
        assignedRole: assignedRole || null,
        assignedStaff: assignedStaff || null,
        remarks: remarks || null,
      });
      setMsg("Status updated");
      setSelected(null);
      fetchComplaints();
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to update complaint");
    }
  };

  const exportCsv = async () => {
    try {
      const res = await api.get("/complaints/admin/export", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `complaints-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to export complaints");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Complaint Dashboard</h2>
        <p className="text-xs text-gray-400">Track hostel and mess complaints with assignment and structured status flow.</p>
      </div>

      <div className="flex justify-end">
        <button onClick={exportCsv} className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Export CSV</button>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      <div className="flex flex-wrap gap-2">
        {["ALL", "PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REOPENED", "REJECTED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium ${statusFilter === s ? "bg-[#6B0F1A] text-white" : "border border-gray-200 text-gray-600"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {Object.entries(grouped).map(([key, list]) => (
          <div key={key} className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs text-gray-500">{STATUS_LABEL[key]}</p>
            <p className="text-2xl font-bold text-gray-800">{list.length}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {complaints.map((c) => (
          <div key={c.id} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-gray-500">Complaint ID</p>
                <p className="text-sm font-semibold text-gray-800">#{c.complaintId}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-700"}`}>
                {STATUS_LABEL[c.status] || c.status}
              </span>
            </div>

            <div className="text-sm space-y-1">
              <p><span className="text-gray-500">Category:</span> {CATEGORY_LABELS[c.category] || c.category}</p>
              <p><span className="text-gray-500">Description:</span> {c.description}</p>
              <p><span className="text-gray-500">Location:</span> Room {c.roomNumber}, Floor {c.floor || "-"}, Block {c.block || "-"}</p>
              <p><span className="text-gray-500">Submitted by:</span> {c.isAnonymous ? "Anonymous" : `${c.student?.user?.fullName} (${c.student?.user?.erp || "-"})`}</p>
              <p><span className="text-gray-500">Date & time:</span> {new Date(c.submittedAt).toLocaleString()}</p>
              <p><span className="text-gray-500">Assigned staff:</span> {c.assignedRole ? `${c.assignedRole}${c.assignedStaff ? ` - ${c.assignedStaff}` : ""}` : "Unassigned"}</p>
            </div>

            {c.attachment && (
              <a href={c.attachment} target="_blank" rel="noreferrer" className="inline-block text-xs text-[#6B0F1A] underline">View image attachment</a>
            )}

            <button
              onClick={() => {
                setSelected(c);
                setNewStatus(c.status);
                setAssignedRole(c.assignedRole || "");
                setAssignedStaff(c.assignedStaff || "");
                setRemarks("");
                setMsg("");
              }}
              className="text-xs text-[#6B0F1A] border border-[#6B0F1A]/30 px-2 py-1 rounded-lg hover:bg-[#6B0F1A]/5"
            >
              Update
            </button>
          </div>
        ))}

        {complaints.length === 0 && (
          <div className="col-span-full rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">No complaints found</div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">Update Complaint — #{selected.complaintId}</h3>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">{selected.description}</p>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">New Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6B0F1A]">
                <option value="PENDING">Pending</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REOPENED">Reopened</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Assign To</label>
              <select value={assignedRole} onChange={e => setAssignedRole(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6B0F1A]">
                <option value="">Unassigned</option>
                {ASSIGNED_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Assigned Staff Name</label>
              <input
                type="text"
                value={assignedStaff}
                onChange={e => setAssignedStaff(e.target.value)}
                placeholder="e.g. Asif (Electrician)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6B0F1A]"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Remarks</label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
                placeholder="Add action notes"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6B0F1A]"
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 max-h-48 overflow-auto">
              <p className="text-xs font-semibold text-gray-700 mb-2">Timeline</p>
              {(selected.updates || []).map((u) => (
                <div key={u.id} className="mb-2 text-xs text-gray-700">
                  <p>
                    <span className="font-medium">{u.status || "Updated"}</span>
                    {u.remarks ? ` - ${u.remarks}` : ""}
                  </p>
                  <p className="text-gray-500">{new Date(u.createdAt).toLocaleString()} by {u.updatedBy?.fullName || "System"}</p>
                </div>
              ))}
              {!(selected.updates || []).length && <p className="text-xs text-gray-500">No timeline entries yet.</p>}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setSelected(null)} className="border border-gray-200 px-4 py-2 rounded-xl text-sm text-gray-600">Cancel</button>
              <button onClick={handleUpdate} className="bg-[#6B0F1A] text-white px-5 py-2 rounded-xl text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
