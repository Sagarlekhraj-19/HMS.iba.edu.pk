import { useEffect, useMemo, useState } from "react";
import api from "../../utils/api";

const ROLES = ["STUDENT", "ADMIN", "MESS_MANAGER", "COMPLAINT_MANAGER", "CLEANING_MANAGER"];

export default function AdminUserAccess() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await api.get("/admin/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = query.toLowerCase();
    return users.filter((u) =>
      [u.fullName, u.email, u.erp, u.role].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [users, query]);

  const updateUser = async (id, payload) => {
    try {
      await api.put(`/admin/users/${id}`, payload);
      setMsg("User updated successfully");
      loadUsers();
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to update user");
    }
  };

  const removeUser = async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);
      setMsg("User removed successfully");
      loadUsers();
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to remove user");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">User Access Control</h2>
          <p className="text-xs text-gray-500">Activate/deactivate accounts and manage role permissions for all users.</p>
        </div>
        <button onClick={loadUsers} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700">Refresh</button>
      </div>

      {msg && <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">{msg}</div>}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, ERP, email, role"
        className="w-full max-w-md rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/30"
      />

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">ERP</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filteredUsers.map((u) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-800">{u.fullName}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{u.erp || "-"}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{u.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => removeUser(u.id)}
                      className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">No users found</td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">Loading users...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
