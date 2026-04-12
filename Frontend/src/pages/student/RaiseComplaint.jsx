// client/src/pages/student/RaiseComplaint.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";

const CATEGORIES = [
  { value: "ELECTRICAL", label: "Broken fan / AC" },
  { value: "ELECTRICAL", label: "Light not working" },
  { value: "PLUMBING", label: "Plumbing issues (leakage)" },
  { value: "MESS_FOOD", label: "Food quality" },
  { value: "MESS_FOOD", label: "Late meals" },
  { value: "MESS_FOOD", label: "Hygiene in kitchen" },
  { value: "MAINTENANCE", label: "Bed/mattress problem" },
  { value: "MAINTENANCE", label: "Furniture damage" },
  { value: "INTERNET_WIFI", label: "WiFi not working" },
  { value: "PLUMBING", label: "Water shortage" },
  { value: "MAINTENANCE", label: "Laundry issues" },
  { value: "OTHER", label: "Security issues" },
  { value: "OTHER", label: "Other" },
];

const INIT = { category:"", subject:"", description:"", roomNumber:"", floor:"", block:"", attachment:"" };

export default function RaiseComplaint() {
  const navigate = useNavigate();
  const [form, setForm]   = useState(INIT);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachmentName, setAttachmentName] = useState("");
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    const prefillLocation = async () => {
      try {
        const res = await api.get("/rooms/my-applications");
        const apps = Array.isArray(res.data) ? res.data : [];
        const allocated = apps.find((a) => a.status === "ALLOCATED" && a.room) || null;
        if (!allocated?.room) return;

        setForm((f) => ({
          ...f,
          roomNumber: allocated.room.roomNumber || f.roomNumber,
          floor: String(allocated.room.floor ?? "") || f.floor,
          block: allocated.room.block || f.block,
        }));
      } catch {
        // Keep manual entry if location prefill cannot be fetched.
      } finally {
        setLocationLoading(false);
      }
    };

    prefillLocation();
  }, []);

  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Attachment must be up to 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, attachment: String(reader.result || "") }));
      setAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.category || !form.subject || !form.description || !form.roomNumber)
      return setError("Please fill all required fields");
    setLoading(true); setError("");
    try {
      await api.post("/complaints", form);
      navigate("/dashboard/complaints");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit complaint");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/dashboard/complaints")} className="w-8 h-8 rounded-lg bg-[#6B0F1A] text-white flex items-center justify-center">←</button>
        <div>
          <h2 className="text-xl font-semibold">Raise a Complaint</h2>
          <p className="text-xs text-gray-400">Describe the issue clearly. Our team will respond within 24–48 hours.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h3 className="font-medium text-gray-700">✏️ Complaint Details</h3>
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div>
          <label className="text-sm text-gray-500 mb-2 block">Category *</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6B0F1A]"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat, idx) => (
              <option key={`${cat.value}-${idx}`} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500 mb-1 block">Subject *</label>
            <input type="text" maxLength={100} placeholder="Bathroom tap leaking continuously"
              value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6B0F1A]" />
            <p className="text-xs text-gray-400 mt-1">Keep it short and specific (max 100 characters)</p>
          </div>
          <div>
            <label className="text-sm text-gray-500 mb-1 block">Room Number *</label>
            <input
              type="text"
              placeholder="Fetched from your allocated room"
              value={form.roomNumber}
              readOnly
              className="w-full border border-gray-200 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-500 mb-1 block">Floor</label>
            <input
              type="text"
              placeholder="Fetched from your allocated room"
              value={form.floor}
              readOnly
              className="w-full border border-gray-200 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 mb-1 block">Block</label>
            <input
              type="text"
              placeholder="Fetched from your allocated room"
              value={form.block}
              readOnly
              className="w-full border border-gray-200 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          {locationLoading
            ? "Fetching your room details from your student record..."
            : form.roomNumber
              ? "Room, floor, and block were auto-filled from your allocated room."
              : "No allocated room found yet. These details will appear automatically after room allocation."}
        </div>

        <div>
          <label className="text-sm text-gray-500 mb-1 block">Description *</label>
          <textarea rows={4} placeholder="Describe the issue in detail…"
            value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#6B0F1A] resize-none" />
        </div>

        <label className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-[#6B0F1A]/50 transition-colors block">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <p className="text-2xl mb-2">📎</p>
          <p className="text-sm text-gray-400">Upload issue image</p>
          <p className="text-xs text-gray-400">PNG, JPG, WEBP up to 5MB</p>
          {attachmentName && <p className="text-xs text-green-700 mt-2">Attached: {attachmentName}</p>}
        </label>

        {form.attachment && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
            Attachment is included with this complaint.
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={() => navigate("/dashboard/complaints")} className="border border-gray-200 px-5 py-2.5 rounded-xl text-sm text-gray-600">cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="bg-[#6B0F1A] text-white px-5 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
            {loading ? "Submitting…" : "Submit Complaint →"}
          </button>
        </div>
      </div>
    </div>
  );
}
