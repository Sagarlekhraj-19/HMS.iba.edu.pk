// client/src/pages/admin/AdminRooms.jsx
import { useEffect, useState } from "react";
import api from "../../utils/api";

const INIT_FORM = { roomNumber:"", block:"", floor:"1", type:"DOUBLE", capacity:"2" };

export default function AdminRooms() {
  const [rooms,   setRooms]   = useState([]);
  const [occupancyFilter, setOccupancyFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [form, setForm]       = useState(INIT_FORM);
  const [msg,  setMsg]        = useState("");

  const fetchRooms = async () => {
    try {
      const res = await api.get("/rooms");
      setRooms(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to load rooms");
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredRooms = occupancyFilter === "ALL"
    ? rooms
    : rooms.filter((r) => (r.occupancyStatus || "EMPTY") === occupancyFilter);

  const handleSave = async () => {
    try {
      const payload = { ...form, floor: Number(form.floor), capacity: Number(form.capacity) };
      if (editRoom) await api.put(`/rooms/admin/${editRoom.id}`, payload);
      else          await api.post("/rooms/admin/create", payload);
      setMsg("Saved!"); setShowForm(false); setEditRoom(null); setForm(INIT_FORM); fetchRooms();
    } catch (err) { setMsg(err.response?.data?.error || "Error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this room?")) return;
    try {
      await api.delete(`/rooms/admin/${id}`);
      fetchRooms();
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to delete room");
    }
  };

  const openEdit = (room) => {
    setEditRoom(room);
    setForm({ roomNumber: room.roomNumber, block: room.block, floor: String(room.floor), type: room.type, capacity: String(room.capacity) });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Room Management</h2>
          <p className="text-xs text-gray-400">Create, edit, and manage hostel rooms</p>
        </div>
        <button onClick={() => { setEditRoom(null); setForm(INIT_FORM); setShowForm(true); }}
          className="bg-[#6B0F1A] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#8B1520]">
          + Add Room
        </button>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      <div className="flex gap-2">
        {["ALL", "EMPTY", "PARTIAL", "FULL"].map((f) => (
          <button
            key={f}
            onClick={() => setOccupancyFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium ${occupancyFilter === f ? "bg-[#6B0F1A] text-white" : "border border-gray-200 text-gray-600"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>{["Room No.","Block","Floor","Type","Capacity","Occupied","Occupancy Status","Available","Actions"].map(h=>(
              <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filteredRooms.map(r => (
              <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-800">{r.roomNumber}</td>
                <td className="px-4 py-3 text-gray-600">{r.block}</td>
                <td className="px-4 py-3 text-gray-600">{r.floor}</td>
                <td className="px-4 py-3 text-gray-600">{r.type}</td>
                <td className="px-4 py-3 text-gray-600">{r.capacity}</td>
                <td className="px-4 py-3 text-gray-600">{r.occupiedCount ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.occupancyStatus === "FULL" ? "bg-red-100 text-red-700" :
                    r.occupancyStatus === "PARTIAL" ? "bg-yellow-100 text-yellow-700" :
                    "bg-emerald-100 text-emerald-700"
                  }`}>
                    {r.occupancyStatus || "EMPTY"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {r.isAvailable ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEdit(r)} className="text-xs text-[#6B0F1A] border border-[#6B0F1A]/30 px-2 py-1 rounded-lg hover:bg-[#6B0F1A]/5">Edit</button>
                  <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50">Delete</button>
                </td>
              </tr>
            ))}
            {filteredRooms.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No rooms found</td></tr>}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">{editRoom ? "Edit Room" : "Add New Room"}</h3>
            {[["roomNumber","Room Number","text"],["block","Block","text"],["floor","Floor","number"],["capacity","Capacity","number"]].map(([key,label,type])=>(
              <div key={key}>
                <label className="text-sm text-gray-500 mb-1 block">{label}</label>
                <input type={type} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6B0F1A]" />
              </div>
            ))}
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Type</label>
              <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6B0F1A]">
                <option value="SINGLE">Single</option>
                <option value="DOUBLE">Double</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="border border-gray-200 px-4 py-2 rounded-xl text-sm text-gray-600">Cancel</button>
              <button onClick={handleSave} className="bg-[#6B0F1A] text-white px-5 py-2 rounded-xl text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
