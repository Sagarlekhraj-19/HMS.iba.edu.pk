// client/src/pages/student/RoomApplicationStatus.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

export default function RoomApplicationStatus() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [error, setError] = useState("");
  const [showSubmitted, setShowSubmitted] = useState(Boolean(location.state?.justSubmitted));

  const loadApplications = async () => {
    try {
      const r = await api.get("/rooms/my-applications");
      setApps(Array.isArray(r.data) ? r.data : []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to load application status");
    }
  };

  useEffect(() => {
    loadApplications();

    // Set up polling as fallback (reduced to 30 seconds)
    const timer = setInterval(() => {
      loadApplications();
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // Set up real-time SSE updates
  useEffect(() => {
    if (!user?.id) return;

    const token = localStorage.getItem("auth_token") || sessionStorage.getItem("hms_session");
    if (!token) return;

    const eventSource = new EventSource(`${api.defaults.baseURL}/rooms/stream?token=${token}`);

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        setApps(prevApps => 
          prevApps.map(app => 
            app.id === update.applicationId 
              ? {
                  ...app,
                  status: update.status,
                  room: update.roomNumber ? { ...app.room, roomNumber: update.roomNumber, block: update.roomBlock } : app.room,
                  isAllocated: update.isAllocated,
                }
              : app
          )
        );
      } catch (err) {
        console.error("Error parsing SSE update:", err);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
      eventSource.close();
    };

    return () => eventSource.close();
  }, [user?.id]);

  useEffect(() => {
    if (!showSubmitted) return;
    const timer = setTimeout(() => setShowSubmitted(false), 4500);
    return () => clearTimeout(timer);
  }, [showSubmitted]);

  const current = apps[0];
  const stepMap = { PENDING: 1, UNDER_REVIEW: 2, APPROVED: 3, ALLOCATED: 4, REJECTED: 1 };
  const step = current ? stepMap[current.status] : 1;
  const isFullyCompleted = current?.status === "ALLOCATED";

  const statusNote = current?.status === "ALLOCATED"
    ? `🎉 Room allocated successfully to ${current.room?.roomNumber || "your room"} in ${current.room?.block || "the hostel"}. Please check your room details.`
    : current?.status === "REJECTED"
      ? "❌ Application was rejected. You can submit a fresh request for the next term."
      : current?.status === "UNDER_REVIEW"
        ? "👀 Your application is currently under admin review."
        : current?.status === "APPROVED"
          ? "✓ Application approved. Waiting for room allocation."
          : "📋 Application submitted and waiting for review.";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/dashboard/room")} className="w-8 h-8 rounded-lg bg-[#6B0F1A] text-white flex items-center justify-center">←</button>
        <h2 className="text-xl font-semibold">Room Application Status</h2>
        {current && showSubmitted && (
          <span className="ml-auto bg-green-600 text-white text-xs px-3 py-1 rounded-lg">
            ✓ Application submitted — #{current.appId}
          </span>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl">{error}</div>}

      {current ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h3 className="font-medium text-gray-700">Application Workflow</h3>

          <div className={`bg-yellow-50 border rounded-xl px-4 py-3 ${current.status === "ALLOCATED" ? "border-green-200 bg-green-50" : "border-yellow-200"}`}>
            <span className="text-2xl">{current.status === "ALLOCATED" ? "🎉" : "⏳"}</span>
            <p className={`text-sm font-medium ${current.status === "ALLOCATED" ? "text-green-700" : "text-gray-700"}`}>{statusNote}</p>
            <p className="text-xs text-gray-500 mt-2">Application ID: #{current.appId} · {current.term}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-center gap-0">
              {["Submitted", "Admin Review", "Approved", "Room Allocated"].map((s, i) => (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  {(() => {
                    const index = i + 1;
                    const done = index < step || (isFullyCompleted && index === 4);
                    const active = index === step && !done;
                    return (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    done ? "bg-green-600 text-white" :
                    active ? "bg-[#6B0F1A] text-white" :
                    "bg-gray-200 text-gray-500"
                  }`}>
                    {done ? "✓" : index}
                  </div>
                    );
                  })()}
                  {i < 3 && <div className={`h-0.5 flex-1 ${i + 1 < step ? "bg-[#6B0F1A]" : "bg-gray-200"}`} />}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 mt-2">
              <span className="text-xs text-gray-500">Submitted</span>
              <span className="text-xs text-gray-500 text-center">Admin Review</span>
              <span className="text-xs text-gray-500 text-center">Approved</span>
              <span className="text-xs text-gray-500 text-right">Room Allocated</span>
            </div>
          </div>

          {current.status === "ALLOCATED" && current.room && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-emerald-800">Allocated Room Details</p>
              <p className="text-sm text-emerald-700">Allocated To: {current.student?.user?.fullName || "Student"} ({current.student?.user?.erp || "N/A"})</p>
              <p className="text-sm text-emerald-700">Email: {current.student?.user?.email || "N/A"}</p>
              <p className="text-sm text-emerald-700">Room: {current.room.roomNumber} · Block: {current.room.block} · Floor: {current.room.floor}</p>
            </div>
          )}

          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{["App ID", "Term", "Applied On", "Room", "Status", "Remarks"].map((h) => <th key={h} className="px-3 py-2 text-left text-xs text-gray-400">{h}</th>)}</tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} className="border-t border-gray-50">
                  <td className="px-3 py-2">{a.appId}</td>
                  <td className="px-3 py-2">{a.term}</td>
                  <td className="px-3 py-2">{new Date(a.submittedAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{a.room?.roomNumber || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      a.status === "ALLOCATED"
                        ? "bg-emerald-100 text-emerald-700"
                        : a.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : a.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{a.remarks || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400">No applications found.</p>
      )}
    </div>
  );
}
