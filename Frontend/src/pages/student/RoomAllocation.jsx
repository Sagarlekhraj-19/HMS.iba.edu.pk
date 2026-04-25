// client/src/pages/student/RoomAllocation.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { API_BASE_URL } from "../../api/axiosInstance";

const STATUS_COLORS = {
  PENDING:      "bg-yellow-100 text-yellow-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED:     "bg-green-100 text-green-700",
  ALLOCATED:    "bg-emerald-100 text-emerald-700",
  REJECTED:     "bg-red-100 text-red-700",
};

export default function RoomAllocation() {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadApplications = async () => {
    try {
      const r = await api.get("/rooms/my-applications");
      setApps(Array.isArray(r.data) ? r.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();

    const timer = setInterval(() => {
      loadApplications();
    }, 10000);

    const token = localStorage.getItem("hms_token");
    let source;
    if (token) {
      source = new EventSource(`${API_BASE_URL}/rooms/stream?token=${encodeURIComponent(token)}`);
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === "room_application_updated") {
            loadApplications();
          }
        } catch {
          // Ignore malformed SSE payloads.
        }
      };
    }

    return () => {
      clearInterval(timer);
      source?.close();
    };
  }, []);

  const current = apps.find(a => ["PENDING","UNDER_REVIEW","APPROVED","ALLOCATED"].includes(a.status));
  const hasActive = !!current;

  if (loading) return <p className="text-gray-400 text-sm">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/dashboard")} className="w-8 h-8 rounded-lg bg-[#6B0F1A] text-white flex items-center justify-center text-sm">←</button>
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Room Allocation</h2>
          <p className="text-xs text-gray-400">View and manage your hostel room</p>
        </div>
      </div>

      {hasActive ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-medium text-gray-700">Current Application</h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="App ID" value={current.appId} />
            <InfoField label="Term"   value={current.term} />
            <InfoField label="Submitted" value={new Date(current.submittedAt).toLocaleDateString()} />
            <InfoField label="Status" value={current.status} />
          </div>

          {current.status === "APPROVED" && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Approved for ERP {current.student?.user?.erp || "N/A"}. Room allocation is in progress.
            </div>
          )}

          {current.status === "ALLOCATED" && current.room && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-1">
              <p className="text-sm font-semibold text-emerald-800">Room allocated to this student profile</p>
              <p className="text-sm text-emerald-700">Student ERP: {current.student?.user?.erp || "N/A"}</p>
              <p className="text-sm text-emerald-700">Student Email: {current.student?.user?.email || "N/A"}</p>
              <p className="text-sm text-emerald-700">Room: {current.room.roomNumber} ({current.room.block})</p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => navigate("/dashboard/room/status")}
              className="px-4 py-2 border border-[#6B0F1A] text-[#6B0F1A] rounded-xl text-sm hover:bg-[#6B0F1A]/5"
            >
              Room details →
            </button>
            {current.status === "ALLOCATED" && (
              <span className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium">Allocated →</span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-400 mb-4">No active application</p>
          <button
            onClick={() => navigate("/dashboard/room/apply")}
            className="bg-[#6B0F1A] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#8B1520]"
          >
            Apply for Room
          </button>
        </div>
      )}

      {/* History */}
      {apps.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-medium text-gray-700">Application History</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["App ID","Term","Applied On","Room","Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.map(a => (
                <tr key={a.id} className="border-t border-gray-50">
                  <td className="px-4 py-3 text-gray-700">{a.appId}</td>
                  <td className="px-4 py-3 text-gray-600">{a.term}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(a.submittedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600">{a.room?.roomNumber || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]}`}>
                      {a.status}
                    </span>
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

const InfoField = ({ label, value }) => (
  <div className="bg-gray-50 rounded-xl px-4 py-3">
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
  </div>
);
