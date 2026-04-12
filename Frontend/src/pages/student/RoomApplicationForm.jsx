// client/src/pages/student/RoomApplicationForm.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

export default function RoomApplicationForm() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [term, setTerm]     = useState("Fall 2026");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      await api.post("/rooms/apply", { term });
      navigate("/dashboard/room/status", { state: { justSubmitted: true } });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit application");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/dashboard/room")} className="w-8 h-8 rounded-lg bg-[#6B0F1A] text-white flex items-center justify-center">←</button>
        <div>
          <h2 className="text-xl font-semibold">Room Application</h2>
          <p className="text-xs text-gray-400">Select your preferred room and submit an application for hostel accommodation.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="font-medium text-gray-700">Room details</h3>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <ReadField label="Name" value={user?.fullName} />
          <ReadField label="ERP*" value={user?.erp} />
          <ReadField label="Program*" value={user?.program} />
          <div>
            <label className="block text-sm text-gray-500 mb-1">Term</label>
            <select
              value={term}
              onChange={e => setTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6B0F1A]"
            >
              {["Fall 2026","Spring 2027","Fall 2027"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between bg-[#6B0F1A]/5 border border-[#6B0F1A]/20 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm text-gray-600">{user?.erp}</p>
            <p className="text-sm text-gray-600">{term}</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#6B0F1A] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#8B1520] disabled:opacity-60"
          >
            {loading ? "Submitting…" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const ReadField = ({ label, value }) => (
  <div>
    <label className="block text-sm text-gray-500 mb-1">{label}</label>
    <div className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 bg-gray-50">{value}</div>
  </div>
);
