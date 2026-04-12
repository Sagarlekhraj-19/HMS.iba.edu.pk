// client/src/pages/admin/AdminApplications.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../utils/api";

const STATUSES = ["PENDING","UNDER_REVIEW","APPROVED","ALLOCATED","REJECTED"];
const STATUS_COLORS = {
  PENDING:"bg-yellow-100 text-yellow-700", UNDER_REVIEW:"bg-blue-100 text-blue-700",
  APPROVED:"bg-green-100 text-green-700",  ALLOCATED:"bg-emerald-100 text-emerald-700",
  REJECTED:"bg-red-100 text-red-700",
};

export default function AdminApplications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [apps,    setApps]    = useState([]);
  const [rooms,   setRooms]   = useState([]);
  const [filter,  setFilter]  = useState("ALL");
  const [termFilter, setTermFilter] = useState("ALL");
  const [selected, setSelected] = useState(null); // app being acted on
  const [form, setForm] = useState({ status:"", roomNumber:"", remarks:"" });
  const [msg, setMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [appsRes, roomsRes] = await Promise.all([
        api.get("/rooms/admin/applications", { params: { term: termFilter !== "ALL" ? termFilter : undefined } }),
        api.get("/rooms?available=true"),
      ]);
      setApps(Array.isArray(appsRes.data) ? appsRes.data : []);
      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to load applications");
    }
  };

  useEffect(() => {
    fetchData();
  }, [termFilter]);

  // Auto-open modal if notification clicked
  useEffect(() => {
    const appId = searchParams.get("appId");
    if (appId && apps.length > 0) {
      const app = apps.find(a => a.id === parseInt(appId));
      if (app) {
        handleOpenReview(app);
        setSearchParams({}); // clear query param
      }
    }
  }, [apps, searchParams, setSearchParams]);

  const filtered = filter === "ALL" ? apps : apps.filter(a => a.status === filter);
  const terms = Array.from(new Set(apps.map((a) => a.term))).sort((a, b) => b.localeCompare(a));

  const exportCsv = async () => {
    try {
      const res = await api.get("/rooms/admin/applications/export", {
        responseType: "blob",
        params: {
          status: filter !== "ALL" ? filter : undefined,
          term: termFilter !== "ALL" ? termFilter : undefined,
        },
      });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `room-applications-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to export applications");
    }
  };

  const handleOpenReview = async (app) => {
    setSelected(app);
    setForm({ status: app.status, roomNumber: app.room?.roomNumber || "", remarks: app.remarks || "" });
    setMsg("");

    // Mark as reviewed when admin opens the modal
    try {
      await api.post(`/rooms/admin/applications/${app.id}/mark-reviewed`);
      // Refresh data to show isAdminReviewed flag
      fetchData();
    } catch (err) {
      console.error("Error marking as reviewed:", err);
    }
  };

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      let updateData = { ...form };
      
      // Always send roomNumber to backend (it handles lookup, creation, and validation)
      if (form.roomNumber) {
        updateData.roomNumber = form.roomNumber.trim().toUpperCase();
      }
      
      delete updateData.roomId; // Remove old field
      
      const response = await api.put(`/rooms/admin/applications/${selected.id}`, updateData);
      setMsg(`✓ ${form.status === "ALLOCATED" ? "🎉 Room " + form.roomNumber.trim().toUpperCase() + " allocated successfully!" : "Application updated successfully"}`);
      setSelected(null);
      fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Error updating application";
      setMsg(`❌ ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Room Applications</h2>
          <p className="text-xs text-gray-400">Review and allocate rooms to students</p>
        </div>
        <button onClick={exportCsv} className="border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Export CSV</button>
      </div>

      {msg && <div className={`border rounded-xl px-4 py-2 text-sm ${msg.includes("✓") ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>{msg}</div>}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", ...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium ${filter===s ? "bg-[#6B0F1A] text-white" : "border border-gray-200 text-gray-600"}`}>
            {s} {s!=="ALL" && `(${apps.filter(a=>a.status===s).length})`}
          </button>
        ))}
        <select value={termFilter} onChange={(e) => setTermFilter(e.target.value)} className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 text-gray-600">
          <option value="ALL">All Terms</option>
          {terms.map((term) => <option key={term} value={term}>{term}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{["App ID","Student","ERP","Email","Term","Submitted","Room","Status","Admin Review","Action"].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className={`border-t border-gray-50 hover:bg-gray-50/50 ${a.isAdminReviewed ? "bg-blue-50/30" : ""}`}>
                <td className="px-4 py-3 text-gray-600 text-xs">{a.appId}</td>
                <td className="px-4 py-3 text-gray-700 font-medium">{a.student?.user?.fullName}</td>
                <td className="px-4 py-3 text-gray-500">{a.student?.user?.erp}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{a.student?.user?.email || "-"}</td>
                <td className="px-4 py-3 text-gray-500">{a.term}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.submittedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-500">{a.room?.roomNumber || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {a.isAdminReviewed ? (
                    <span className="text-xs font-semibold text-green-600">✓ Reviewed</span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {a.status !== "ALLOCATED" && a.status !== "REJECTED" && (
                    <button onClick={() => handleOpenReview(a)}
                      className="text-xs text-[#6B0F1A] border border-[#6B0F1A]/30 px-2 py-1 rounded-lg hover:bg-[#6B0F1A]/5">
                      Review
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">No applications</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Review Application — {selected.appId}</h3>
              {selected.isAdminReviewed && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ You reviewed this</span>
              )}
            </div>
            <p className="text-sm text-gray-500">Student: {selected.student?.user?.fullName} ({selected.student?.user?.erp})</p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700"><strong>Status:</strong> {selected.status}</p>
              <p className="text-xs text-blue-700 mt-1"><strong>Submitted:</strong> {new Date(selected.submittedAt).toLocaleString()}</p>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Assign Room</label>
              <input
                type="text"
                value={form.roomNumber}
                onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
                placeholder="Enter room number (e.g., A-103)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6B0F1A]"
              />
              <p className="text-xs text-gray-400 mt-1">Type the room number like A-103, B-205, etc.</p>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Update Status</label>
              <select value={form.status} onChange={e=>setForm(f=>({...f, status:e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6B0F1A]">
                <option value="">Select status</option>
                {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Remarks</label>
              <textarea
                value={form.remarks}
                onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                rows={3}
                placeholder="Add review remarks or rejection reason"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6B0F1A]"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <button onClick={() => setSelected(null)} disabled={isSubmitting} className="border border-gray-200 px-4 py-2 rounded-xl text-sm text-gray-600">Cancel</button>
              <button onClick={handleUpdate} disabled={isSubmitting} className={`text-white px-5 py-2 rounded-xl text-sm font-medium ${isSubmitting ? "bg-gray-400" : "bg-[#6B0F1A] hover:bg-[#8B1020]"}`}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
