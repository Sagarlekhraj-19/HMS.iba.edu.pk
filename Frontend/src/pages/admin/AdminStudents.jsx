// client/src/pages/admin/AdminStudents.jsx
import { useEffect, useState } from "react";
import api from "../../utils/api";

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search,   setSearch]   = useState("");
  const [allocation, setAllocation] = useState("ALL");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [details, setDetails] = useState(null);
  const [msg, setMsg] = useState("");

  const loadStudents = async () => {
    try {
      const res = await api.get("/admin/students", {
        params: { page, pageSize, search, allocation },
      });
      setStudents(res.data?.students || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to load students");
    }
  };

  useEffect(() => {
    loadStudents();
  }, [page, pageSize, search, allocation]);

  const loadDetails = async (student) => {
    setSelectedStudent(student);
    setDetails(null);
    try {
      const res = await api.get(`/admin/students/${student.id}/details`);
      setDetails(res.data);
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to load student details");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Students</h2>
          <p className="text-xs text-gray-400">Paginated student registry with search, allocation status and full profile history</p>
        </div>
        <div className="text-sm text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-xl">
          Total: <span className="font-semibold text-gray-800">{total}</span>
        </div>
      </div>

      {msg && <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-700">{msg}</div>}

      {/* Search */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name, student ID, or email"
          value={search}
          onChange={e => { setPage(1); setSearch(e.target.value); }}
          className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6B0F1A]"
        />
        <select
          value={allocation}
          onChange={(e) => { setPage(1); setAllocation(e.target.value); }}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
        >
          <option value="ALL">All Allocation</option>
          <option value="ALLOCATED">Allocated</option>
          <option value="UNALLOCATED">Unallocated</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-md">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["#", "Name", "Student ID", "Email", "Room", "Status", "Joined", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#6B0F1A]/10 flex items-center justify-center text-[#6B0F1A] text-xs font-bold">
                      {s.user?.fullName?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <span className="text-gray-700 font-medium">{s.user?.fullName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.user?.erp || "-"}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{s.user?.email}</td>
                <td className="px-4 py-3 text-gray-500">{s.room || "Unallocated"}</td>
                <td className="px-4 py-3 text-gray-500">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${s.user?.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {s.user?.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {s.user?.createdAt ? new Date(s.user.createdAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => loadDetails(s)} className="text-xs text-[#6B0F1A] hover:underline">View details</button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                  {search ? "No students match your search" : "No students registered yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50">Prev</button>
        <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50">Next</button>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Student Detail View</h3>
              <button onClick={() => setSelectedStudent(null)} className="rounded border border-gray-300 px-3 py-1 text-sm">Close</button>
            </div>

            {!details && <p className="text-sm text-gray-500">Loading details...</p>}

            {details && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Info label="Name" value={details.student?.user?.fullName} />
                  <Info label="Student ID" value={details.student?.user?.erp || "-"} />
                  <Info label="Email" value={details.student?.user?.email} />
                  <Info label="Program" value={details.student?.user?.program || "-"} />
                  <Info label="Account Status" value={details.student?.user?.isActive ? "Active" : "Inactive"} />
                  <Info label="Current Room" value={details.currentRoom ? `${details.currentRoom.roomNumber} (${details.currentRoom.block})` : "Unallocated"} />
                </div>

                <Section title="Room Application History">
                  <SimpleTable
                    headers={["Term", "Status", "Allocated Room", "Applied On"]}
                    rows={(details.roomApplications || []).map((a) => [a.term, a.status, a.room?.roomNumber || "-", new Date(a.submittedAt).toLocaleDateString()])}
                    empty="No room applications"
                  />
                </Section>

                <Section title="Mess Subscriptions">
                  <SimpleTable
                    headers={["Order ID", "Meal Type", "Duration", "Payment"]}
                    rows={(details.messSubscriptions || []).map((m) => [
                      m.orderId,
                      (m.mealTypes || []).join(", "),
                      `${new Date(m.startDate).toLocaleDateString()} - ${new Date(m.endDate).toLocaleDateString()}`,
                      m.isPaid ? "Paid" : "Unpaid",
                    ])}
                    empty="No mess subscriptions"
                  />
                </Section>

                <Section title="Complaint History">
                  <SimpleTable
                    headers={["Complaint ID", "Category", "Status", "Date"]}
                    rows={(details.complaints || []).map((c) => [c.complaintId, c.category, c.status, new Date(c.submittedAt).toLocaleDateString()])}
                    empty="No complaints"
                  />
                </Section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-800 mb-2">{title}</h4>
      {children}
    </div>
  );
}

function SimpleTable({ headers, rows, empty }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>{headers.map((h) => <th key={h} className="px-3 py-2 text-left text-xs text-gray-500">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-gray-100">
              {r.map((cell, idx) => <td key={idx} className="px-3 py-2 text-gray-700">{cell}</td>)}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={headers.length}>{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
