// client/src/pages/student/ComplaintView.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../utils/api";

export default function ComplaintView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const [msg, setMsg] = useState("");

  const reload = async () => {
    try {
      const r = await api.get(`/complaints/${id}`);
      setC(r.data);
    } catch {
      navigate("/dashboard/complaints");
    }
  };

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 10000);
    return () => clearInterval(timer);
  }, [id]);

  const handleReopen = async () => {
    try {
      await api.put(`/complaints/${id}/reopen`);
      setMsg("Complaint reopened successfully.");
      reload();
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to reopen complaint");
    }
  };

  if (!c) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/dashboard/complaints")} className="w-8 h-8 rounded-lg bg-[#6B0F1A] text-white flex items-center justify-center">←</button>
        <h2 className="text-xl font-semibold">#{c.complaintId}</h2>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <p className="text-xs text-gray-400 italic">🔒 Read-only. You cannot edit or change the status.</p>
        {msg && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">{msg}</p>}
        <div className="grid grid-cols-2 gap-4">
          {[
            ["Complaint ID", `#${c.complaintId}`],
            ["Category", c.category],
            ["Location", `Room ${c.roomNumber}, Floor ${c.floor || "-"}, Block ${c.block || "-"}`],
            ["Status", c.status],
            ["Assigned Staff", c.assignedRole ? `${c.assignedRole}${c.assignedStaff ? ` - ${c.assignedStaff}` : ""}` : "Unassigned"],
            ["Submitted By", c.isAnonymous ? "Anonymous" : c.student?.user?.fullName || "-"],
            ["Date Submitted", new Date(c.submittedAt).toLocaleDateString()],
            ["Last Updated", new Date(c.updatedAt).toLocaleDateString()],
          ].map(([label, val]) => (
            <div key={label} className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm text-gray-800 font-medium mt-0.5">{val}</p>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{c.description}</p>
        </div>
        {c.attachment && (
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">Attachment</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 truncate max-w-[70%]">Attached document available</span>
              <a
                href={c.attachment}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#6B0F1A] hover:underline"
              >
                View
              </a>
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-400 mb-2">Timeline</p>
          <div className="space-y-2">
            {(c.updates || []).map((u) => (
              <div key={u.id} className="text-sm text-gray-700">
                <p className="font-medium">{u.status || "Updated"}{u.remarks ? ` - ${u.remarks}` : ""}</p>
                <p className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleString()} by {u.updatedBy?.fullName || "System"}</p>
              </div>
            ))}
            {!(c.updates || []).length && <p className="text-xs text-gray-500">No updates yet.</p>}
          </div>
        </div>

        {c.status === "RESOLVED" && (
          <div className="pt-2">
            <button onClick={handleReopen} className="bg-[#6B0F1A] text-white px-4 py-2 rounded-xl text-sm">Not Satisfied? Reopen Complaint</button>
          </div>
        )}
      </div>
    </div>
  );
}
