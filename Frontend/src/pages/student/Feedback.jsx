// client/src/pages/student/Feedback.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

export default function Feedback() {
  const navigate  = useNavigate();
  const [form, setForm]     = useState({ feedbackType: "", comment: "", rating: 0 });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]   = useState("");
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/feedback/my");
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const resetForm = () => {
    setForm({ feedbackType: "", comment: "", rating: 0 });
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.feedbackType || !form.comment || !form.rating) return setError("Please fill all fields");
    try {
      await api.post("/feedback", form);
      setSubmitted(true);
      fetchHistory();
    } catch { setError("Failed to submit feedback"); }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-lg">⭐ Feedback submitted successfully</span>
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">🎉</div>
        <p className="font-semibold text-gray-800">Feedback Submitted!</p>
        <p className="text-gray-500 text-sm text-center">Your Hostel feedback ({form.rating}★) has been recorded. Thank you for helping us improve.</p>
        <div className="flex gap-3">
          <button onClick={() => navigate("/dashboard")} className="border border-gray-200 px-5 py-2.5 rounded-xl text-sm">Go to Dashboard</button>
          <button onClick={() => { setSubmitted(false); resetForm(); setTimeout(() => document.getElementById("feedback-history")?.scrollIntoView({ behavior: "smooth" }), 50); }} className="bg-[#6B0F1A] text-white px-5 py-2.5 rounded-xl text-sm">Go to Feedback History</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/dashboard/complaints")} className="w-8 h-8 rounded-lg bg-[#6B0F1A] text-white flex items-center justify-center">←</button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Submit Feedback</h2>
          <p className="text-xs text-gray-400">Help us improve hostel services</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">Feedback Type *</label>
          <select value={form.feedbackType} onChange={e => setForm(f => ({...f, feedbackType: e.target.value}))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6B0F1A]">
            <option value="">Select type</option>
            {["Hostel","Mess","Warden","Internet","Cleaning"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-500 mb-1 block">Comment</label>
          <textarea rows={3} placeholder="description" value={form.comment}
            onChange={e => setForm(f => ({...f, comment: e.target.value}))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#6B0F1A]" />
        </div>
        <div>
          <label className="text-sm text-gray-500 mb-2 block">Rating *</label>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(star => (
              <button key={star} onClick={() => setForm(f => ({...f, rating: star}))}
                className={`text-2xl transition-all ${form.rating >= star ? "text-yellow-400" : "text-gray-300"}`}>
                ★
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleSubmit} className="bg-[#6B0F1A] text-white px-5 py-2.5 rounded-xl text-sm font-medium">Submit Feedback</button>
        </div>
      </div>

      <div id="feedback-history" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">My Submitted Feedback</h3>
        </div>
        <div className="p-4 space-y-3">
          {history.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-800">{item.feedbackType}</p>
                <p className="text-xs text-gray-500">{new Date(item.submittedAt).toLocaleDateString()}</p>
              </div>
              <p className="text-sm text-gray-600 mt-2">{item.comment}</p>
              <p className="text-xs text-yellow-600 mt-2">Rating: {item.rating}/5</p>
            </div>
          ))}
          {history.length === 0 && <p className="text-sm text-gray-400">No feedback submitted yet.</p>}
        </div>
      </div>
    </div>
  );
}
