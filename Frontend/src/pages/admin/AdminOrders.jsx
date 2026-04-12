// client/src/pages/admin/AdminOrders.jsx
import { useEffect, useState } from "react";
import api from "../../utils/api";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [msg,    setMsg]    = useState("");

  const fetchOrders = async () => {
    try {
      const res = await api.get("/mess/admin/orders");
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMsg(err.response?.data?.error || "Unable to load orders");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const byStatus = filter === "ALL" ? orders : orders.filter(o => o.status === filter);
  const filtered = paymentFilter === "ALL"
    ? byStatus
    : byStatus.filter((o) => paymentFilter === "UNPAID" ? !o.isPaid : o.isPaid);

  const handleMarkPaid = async (id) => {
    try {
      await api.put(`/mess/admin/orders/${id}/pay`);
      setMsg("Marked as paid!");
      fetchOrders();
    } catch (err) {
      setMsg(err.response?.data?.error || "Error updating order");
    }
  };

  const handleFlagUnpaid = async (id) => {
    try {
      await api.put(`/mess/admin/orders/${id}/unpay`);
      setMsg("Order flagged as unpaid");
      fetchOrders();
    } catch (err) {
      setMsg(err.response?.data?.error || "Error updating order");
    }
  };

  const STATUS_COLORS = {
    ACTIVE:    "bg-green-100 text-green-700",
    EXPIRED:   "bg-gray-100 text-gray-500",
    CANCELLED: "bg-red-100 text-red-500",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Mess Orders</h2>
        <p className="text-xs text-gray-400">View and manage all student meal subscriptions</p>
      </div>

      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-xl">
          {msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", "ACTIVE", "EXPIRED", "CANCELLED"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === s ? "bg-[#6B0F1A] text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {s} {s !== "ALL" && `(${orders.filter(o => o.status === s).length})`}
          </button>
        ))}
        {["ALL", "UNPAID", "PAID"].map((p) => (
          <button key={p} onClick={() => setPaymentFilter(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              paymentFilter === p ? "bg-gray-800 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {p}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Revenue", value: `PKR ${orders.filter(o=>o.isPaid).reduce((s,o)=>s+o.totalAmount,0).toLocaleString()}`, color: "text-green-600" },
          { label: "Unpaid Orders", value: orders.filter(o=>!o.isPaid && o.status==="ACTIVE").length, color: "text-red-500" },
          { label: "Active Orders", value: orders.filter(o=>o.status==="ACTIVE").length, color: "text-blue-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Order ID", "Student", "ERP", "Meals", "Duration", "Total", "Payment", "Status", "Action"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} className={`border-t border-gray-50 hover:bg-gray-50/50 ${!o.isPaid && o.status === "ACTIVE" ? "bg-red-50/50" : ""}`}>
                <td className="px-4 py-3 text-gray-600 text-xs font-mono">#{o.orderId}</td>
                <td className="px-4 py-3 text-gray-700 font-medium">{o.student?.user?.fullName}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{o.student?.user?.erp}</td>
                <td className="px-4 py-3 text-gray-600">{o.mealTypes?.join(" + ")}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(o.startDate).toLocaleDateString()} –<br />
                  {new Date(o.endDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-gray-700 font-medium">PKR {o.totalAmount?.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    o.isPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}>
                    {o.isPaid ? "Paid" : "Unpaid"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                    {o.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {!o.isPaid && o.status === "ACTIVE" && (
                    <button
                      onClick={() => handleMarkPaid(o.id)}
                      className="text-xs text-green-600 border border-green-200 px-2 py-1 rounded-lg hover:bg-green-50"
                    >
                      Mark Paid
                    </button>
                  )}
                  {o.isPaid && o.status === "ACTIVE" && (
                    <button
                      onClick={() => handleFlagUnpaid(o.id)}
                      className="text-xs text-amber-700 border border-amber-200 px-2 py-1 rounded-lg hover:bg-amber-50"
                    >
                      Flag Unpaid
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">No orders found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
