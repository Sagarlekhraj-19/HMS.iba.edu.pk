// client/src/pages/student/Complaints.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

const STATUS_COLOR = {
  OPEN: "bg-red-100 text-red-700",
  PENDING: "bg-red-100 text-red-700",
  ASSIGNED: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-green-100 text-green-700",
  REOPENED: "bg-neutral-200 text-neutral-800",
};

const STATUS_LABEL = {
  OPEN: "Pending",
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  REOPENED: "Reopened",
};

export default function Complaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [feedbacks, setFeedbacks] = useState([]);
  const [panel, setPanel] = useState("complaints");

  const fetchComplaints = () => api.get("/complaints").then((r) => setComplaints(Array.isArray(r.data) ? r.data : []));
  const fetchFeedbacks = () => api.get("/feedback/my").then((r) => setFeedbacks(Array.isArray(r.data) ? r.data : [])).catch(() => setFeedbacks([]));

  useEffect(() => {
    fetchComplaints();
    fetchFeedbacks();

    const complaintsTimer = setInterval(fetchComplaints, 10000);
    const feedbackTimer = setInterval(fetchFeedbacks, 10000);

    return () => {
      clearInterval(complaintsTimer);
      clearInterval(feedbackTimer);
    };
  }, []);

  const filtered = filter === "ALL" ? complaints : complaints.filter((c) => c.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/dashboard")} className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6B0F1A] text-white">←</button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">My Complaints</h2>
          <p className="text-xs text-gray-400">Track and manage all complaints you've submitted</p>
        </div>
        <button onClick={() => navigate("/dashboard/complaints/new")} className="rounded-xl bg-[#6B0F1A] px-4 py-2 text-sm font-medium text-white hover:bg-[#8B1520]">
          + New Complaint
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setPanel("complaints")} className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${panel === "complaints" ? "bg-[#6B0F1A] text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
          Complaints
        </button>
        <button onClick={() => setPanel("feedbacks")} className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${panel === "feedbacks" ? "bg-[#6B0F1A] text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
          Feedbacks
        </button>
      </div>

      {panel === "complaints" && (
        <>
          <div className="flex flex-wrap gap-2">
            {[["ALL", "All"], ["PENDING", "Pending"], ["ASSIGNED", "Assigned"], ["IN_PROGRESS", "In Progress"], ["RESOLVED", "Resolved"], ["REOPENED", "Reopened"]].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${filter === val ? "bg-[#6B0F1A] text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                {label}{val !== "ALL" && ` (${complaints.filter((c) => c.status === val).length})`}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{["Complaint ID", "Category", "Subject", "Assigned", "Date", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700">#{c.complaintId}</td>
                    <td className="px-4 py-3 text-gray-600">{c.category}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-gray-600">{c.subject}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.assignedRole || "Unassigned"}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(c.submittedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[c.status]}`}>{STATUS_LABEL[c.status] || c.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/dashboard/complaints/${c.id}`)} className="text-xs text-[#6B0F1A] hover:underline">view →</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No complaints found</td></tr>
                )}
              </tbody>
            </table>
            <div className="flex justify-center border-t border-gray-100 p-4">
              <button onClick={() => navigate("/dashboard/feedback")} className="rounded-xl border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Submit feedback on services
              </button>
            </div>
          </div>
        </>
      )}

      {panel === "feedbacks" && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h3 className="font-semibold text-gray-800">My Feedbacks</h3>
              <p className="text-xs text-gray-400">Feedback submitted from the services form also appears here.</p>
            </div>
            <button onClick={() => navigate("/dashboard/feedback")} className="text-xs text-[#6B0F1A] hover:underline">Submit new feedback</button>
          </div>
          <div className="space-y-3 p-4">
            {feedbacks.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-gray-800">{item.feedbackType}</p>
                  <p className="text-xs text-gray-500">{new Date(item.submittedAt).toLocaleDateString()}</p>
                </div>
                <p className="mt-2 text-sm text-gray-600">{item.comment}</p>
                <p className="mt-2 text-xs text-yellow-600">Rating: {item.rating}/5</p>
              </div>
            ))}
            {feedbacks.length === 0 && <p className="py-4 text-sm text-gray-400">No feedback submitted yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
