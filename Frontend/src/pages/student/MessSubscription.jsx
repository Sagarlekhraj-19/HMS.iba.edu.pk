// client/src/pages/student/MessSubscription.jsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../utils/api";

const MEAL_RATES = { Breakfast: 170, Dinner: 270, Lunch: 220 };
const MEALS_LIST  = Object.keys(MEAL_RATES);

export default function MessSubscription() {
  const location = useLocation();
  const navigate = useNavigate();
  const requestsRef = useRef(null);
  const [tab,    setTab]    = useState("order");
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [menuMode, setMenuMode] = useState("DAY");
  const [menuDate, setMenuDate] = useState(new Date().toISOString().slice(0, 10));
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = (day + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    return monday.toISOString().slice(0, 10);
  });
  const [showForm, setShowForm] = useState(false);
  const [success,  setSuccess]  = useState(null);
  const [notice, setNotice] = useState("");
  const [pendingPayment, setPendingPayment] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [refreshingBilling, setRefreshingBilling] = useState(false);
  const [pauseForm, setPauseForm] = useState({ pauseStartDate: "", pauseEndDate: "", reason: "" });
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    mealTypes: [], startDate: "", endDate: ""
  });

  const fetchOrders = () => api.get("/mess/my-orders").then(r => setOrders(Array.isArray(r.data) ? r.data : []));
  const fetchRequests = () => api.get("/mess/my-requests").then(r => setRequests(Array.isArray(r.data) ? r.data : [])).catch(() => setRequests([]));
  const fetchMenu = async () => {
    const params = menuMode === "DAY"
      ? { date: menuDate }
      : {
          weekStart,
          weekEnd: (() => {
            const end = new Date(weekStart);
            end.setDate(end.getDate() + 6);
            return end.toISOString().slice(0, 10);
          })(),
        };
    const res = await api.get("/mess/menu", { params });
    setMenuItems(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    fetchOrders();
    fetchRequests();

    const timer = setInterval(() => {
      fetchOrders();
      fetchRequests();
    }, 10000);

    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get("tab");
    if (tabParam === "requests") {
      setTab("order");
      window.setTimeout(() => {
        requestsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
  }, [location.search]);
  useEffect(() => {
    if (tab === "menu") {
      fetchMenu().catch(() => setMenuItems([]));
    }
  }, [tab, menuMode, menuDate, weekStart]);

  const activeOrder = orders.find(o => o.status === "ACTIVE");

  const calcTotal = () => {
    if (!form.startDate || !form.endDate || !form.mealTypes.length) return 0;
    const days = Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1;
    return days * form.mealTypes.reduce((s, m) => s + (MEAL_RATES[m] || 0), 0);
  };

  const toggleMeal = (meal) => {
    setForm(f => ({
      ...f,
      mealTypes: f.mealTypes.includes(meal)
        ? f.mealTypes.filter(m => m !== meal)
        : [...f.mealTypes, meal],
    }));
  };

  const handleOrder = async () => {
    setError("");
    setNotice("");

    if (!form.mealTypes.length) {
      setError("At least 1 meal is required to be selected");
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError("Start and end dates are required");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError("End date must be on or after start date");
      return;
    }

    try {
      const res = await api.post("/mess/order", form);
      setPendingPayment(res.data);
      setShowForm(false);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to place order");
    }
  };

  const handleConfirmPayment = async () => {
    if (!pendingPayment?.id) return;
    setProcessingPayment(true);
    setError("");
    setNotice("");
    try {
      const res = await api.put(`/mess/order/${pendingPayment.id}/pay`);
      setSuccess(res.data);
      setPendingPayment(null);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.error || "Payment confirmation failed");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePauseRequestSubmit = async () => {
    setError("");
    setNotice("");
    try {
      await api.post("/mess/pause-request", pauseForm);
      setPauseForm({ pauseStartDate: "", pauseEndDate: "", reason: "" });
      setNotice("Your pause request has been sent for manager approval.");
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to send pause request");
    }
  };

  const handleRefreshBilling = async () => {
    setRefreshingBilling(true);
    setError("");
    try {
      await fetchOrders();
      setNotice("Subscriptions refreshed successfully.");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to refresh subscriptions");
    } finally {
      setRefreshingBilling(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!activeOrder?.id) return;
    const shouldCancel = window.confirm("Cancel this active mess order? This cannot be undone.");
    if (!shouldCancel) return;

    setError("");
    setNotice("");
    try {
      await api.delete(`/mess/order/${activeOrder.id}`);
      setNotice("Your active mess order has been cancelled.");
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.error || "Unable to cancel order");
    }
  };

  const handleExportBillingCsv = () => {
    if (!orders.length) {
      setError("No subscriptions available to export");
      return;
    }

    const headers = [
      "Order Number",
      "Meal Types",
      "Subscribed On",
      "Start Date",
      "End Date",
      "Total Amount",
      "Payment Status",
      "Order Status",
    ];

    const rows = orders.map((o) => [
      o.orderId,
      (o.mealTypes || []).join(", "),
      new Date(o.createdAt).toLocaleDateString(),
      new Date(o.startDate).toLocaleDateString(),
      new Date(o.endDate).toLocaleDateString(),
      o.totalAmount,
      o.isPaid ? "Paid" : "Unpaid",
      o.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `meal-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const handlePrintBilling = () => {
    if (!orders.length) {
      setError("No subscriptions available to print");
      return;
    }

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      setError("Popup blocked. Please allow popups to print subscriptions.");
      return;
    }

    const rowsHtml = orders.map((o) => `
      <tr>
        <td>${o.orderId}</td>
        <td>${(o.mealTypes || []).join(", ")}</td>
        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
        <td>${new Date(o.startDate).toLocaleDateString()}</td>
        <td>${new Date(o.endDate).toLocaleDateString()}</td>
        <td>PKR ${Number(o.totalAmount || 0).toLocaleString()}</td>
        <td>${o.isPaid ? "Paid" : "Unpaid"}</td>
        <td>${o.status}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Meal Subscriptions</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin: 0 0 12px 0; font-size: 20px; }
            p { color: #555; font-size: 12px; margin: 0 0 16px 0; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>My Meal Subscriptions</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Meal Types</th>
                <th>Subscribed On</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Total Amount</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <span className="text-green-600 text-xs bg-green-100 px-3 py-1 rounded-lg">● Order placed — #{success.orderId}</span>
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">🎉</div>
        <p className="font-semibold text-gray-800">Order Placed Successfully!</p>
        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm">#{success.orderId}</span>
        <p className="text-gray-500 text-sm text-center">
          Your {success.mealTypes?.join(" + ")} subscription is active<br />
          from {new Date(success.startDate).toLocaleDateString()} to {new Date(success.endDate).toLocaleDateString()}.
        </p>
        <span className="bg-red-100 text-red-700 px-4 py-1 rounded-lg text-sm font-medium">
          Total: PKR {success.totalAmount?.toLocaleString()}
        </span>
        <div className="flex gap-3 mt-2">
          <button onClick={() => { setSuccess(null); setTab("billing"); }} className="border border-gray-300 px-5 py-2.5 rounded-xl text-sm">Viewing billing →</button>
          <button onClick={() => setSuccess(null)} className="bg-[#6B0F1A] text-white px-5 py-2.5 rounded-xl text-sm">Back to Mess home →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/dashboard")} className="w-8 h-8 rounded-lg bg-[#6B0F1A] text-white flex items-center justify-center">←</button>
        <div>
          <h2 className="text-xl font-semibold">Mess Subscription</h2>
          <p className="text-xs text-gray-400">Choose your meal plan for the current subscription period.</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 flex items-center gap-2">
        📅 Current subscription period: 18 Feb – 19 Mar 2026 · Deadline to subscribe: 25 Feb 2026
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl">{error}</div>}
      {notice && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-xl">{notice}</div>}

      {/* Tabs */}
      <div className="flex border border-gray-200 rounded-xl overflow-hidden w-fit">
        {[["order", "Order Meals"], ["billing", "Subscriptions & Billing"], ["menu", "Daily / Weekly Menu"]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium ${tab===t ? "bg-[#6B0F1A]/10 text-[#6B0F1A] border-b-2 border-[#6B0F1A]" : "text-gray-500 hover:text-gray-700"}`}
          >{l}</button>
        ))}
      </div>

      {tab === "order" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-medium text-gray-700">Pause Subscription Request</h3>
            <p className="text-xs text-gray-500">Pause request must be at least 5 days.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input type="date" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={pauseForm.pauseStartDate} onChange={(e) => setPauseForm((s) => ({ ...s, pauseStartDate: e.target.value }))} />
              <input type="date" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" value={pauseForm.pauseEndDate} onChange={(e) => setPauseForm((s) => ({ ...s, pauseEndDate: e.target.value }))} />
              <input className="rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Reason" value={pauseForm.reason} onChange={(e) => setPauseForm((s) => ({ ...s, reason: e.target.value }))} />
            </div>
            <div className="flex justify-end">
              <button onClick={handlePauseRequestSubmit} className="bg-[#6B0F1A] text-white px-4 py-2 rounded-xl text-sm">Send Pause Request</button>
            </div>

            <div ref={requestsRef} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-semibold text-gray-700">My Recent Requests (Auto-refresh: 10s)</p>
              <div className="space-y-1">
                {requests.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
                    <span className="text-gray-700">{r.type} · {new Date(r.createdAt).toLocaleDateString()}</span>
                    <span className={`rounded-full px-2 py-0.5 ${r.status === "APPROVED" ? "bg-green-100 text-green-700" : r.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
                {requests.length === 0 && <p className="text-xs text-gray-500">No mess requests submitted yet.</p>}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-gray-700">Need to review a pending request?</p>
                <p className="text-[11px] text-gray-500">The notification opens this request section directly.</p>
              </div>
            </div>
          </div>

          {pendingPayment && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h3 className="font-medium text-gray-700">Payment Confirmation Required</h3>
              <p className="text-sm text-gray-600">Order #{pendingPayment.orderId} was created. Confirm payment to finalize it.</p>
              <p className="text-sm text-gray-700 font-medium">Amount: PKR {pendingPayment.totalAmount?.toLocaleString()}</p>
              <button
                onClick={handleConfirmPayment}
                disabled={processingPayment}
                className="bg-[#6B0F1A] text-white px-5 py-2 rounded-xl text-sm disabled:opacity-60"
              >
                {processingPayment ? "Confirming Payment..." : "Confirm Payment"}
              </button>
            </div>
          )}

          {activeOrder ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-700">🍽️ Active Subscription</h3>
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full">Active</span>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-400">{["ORDER #","MEALS","DURATION","TOTAL"].map(h => <th key={h} className="text-left pb-2">{h}</th>)}</tr></thead>
                <tbody>
                  <tr>
                    <td className="text-gray-700">#{activeOrder.orderId}</td>
                    <td className="text-gray-600">{activeOrder.mealTypes?.join(" + ")}</td>
                    <td className="text-gray-600">{new Date(activeOrder.startDate).toLocaleDateString()} – {new Date(activeOrder.endDate).toLocaleDateString()}</td>
                    <td className="text-gray-700 font-medium">PKR {activeOrder.totalAmount?.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 flex gap-2">
                <div className="h-1 flex-1 bg-[#6B0F1A] rounded" />
                <div className="h-1 flex-1 bg-gray-100 rounded" />
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleCancelOrder}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No active subscription.</p>
          )}

          {!showForm ? (
            <div className="flex justify-end">
              <button onClick={() => setShowForm(true)} className="bg-[#6B0F1A] text-white px-5 py-2.5 rounded-xl text-sm font-medium">+ New Meals</button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h3 className="font-medium text-gray-700">New Meal Order</h3>
              <div>
                <label className="text-sm text-gray-500 mb-2 block">Select Meals</label>
                <div className="flex flex-wrap gap-2">
                  {MEALS_LIST.map(m => (
                    <button key={m} onClick={() => toggleMeal(m)}
                      className={`px-4 py-2 rounded-xl text-sm border transition-all ${form.mealTypes.includes(m) ? "bg-[#6B0F1A] text-white border-[#6B0F1A]" : "border-gray-200 text-gray-600 hover:border-[#6B0F1A]"}`}
                    >
                      {m} — PKR {MEAL_RATES[m]}/day
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6B0F1A]" />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({...f, endDate: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6B0F1A]" />
                </div>
              </div>
              {calcTotal() > 0 && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm">
                  <span className="text-gray-500">Estimated Total: </span>
                  <span className="font-semibold text-gray-800">PKR {calcTotal().toLocaleString()}</span>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowForm(false)} className="border border-gray-200 px-4 py-2 rounded-xl text-sm text-gray-600">Cancel</button>
                <button onClick={handleOrder} disabled={!form.mealTypes.length || !form.startDate || !form.endDate}
                  className="bg-[#6B0F1A] text-white px-5 py-2 rounded-xl text-sm disabled:opacity-50">
                  Place Order →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "billing" && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">My Meal Subscriptions</h3>
            <div className="flex gap-2">
              <button onClick={handlePrintBilling} className="border border-gray-200 text-sm px-3 py-1.5 rounded-lg text-gray-600">Print (PDF)</button>
              <button onClick={handleExportBillingCsv} className="border border-gray-200 text-sm px-3 py-1.5 rounded-lg text-gray-600">Export Excel</button>
              <button onClick={handleRefreshBilling} className="border border-gray-200 text-sm px-3 py-1.5 rounded-lg text-gray-600">{refreshingBilling ? "Refreshing..." : "Refresh"}</button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {orders.map(o => (
              <div key={o.id} className="border border-gray-200 rounded-xl p-4 space-y-2">
                <p className="text-center text-sm font-medium text-gray-700">Order Number: {o.orderId}</p>
                <div className="grid grid-cols-2 gap-y-1 text-sm">
                  <p className="text-gray-600">Meal Types: {o.mealTypes?.join(", ")}</p>
                  <p className="text-gray-500 text-right">Subscribed On: {new Date(o.createdAt).toLocaleDateString()}</p>
                  <p className="text-gray-600">Meal Rates: PKR {o.totalAmount?.toLocaleString()}</p>
                  <p className="text-gray-500 text-right">End Date: {new Date(o.endDate).toLocaleDateString()}</p>
                  <p className="text-gray-600">Total Amount: {o.totalAmount?.toLocaleString()}</p>
                  <p className="text-gray-500 text-right">Start Date: {new Date(o.startDate).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${o.isPaid ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                    Status: {o.isPaid ? "Paid" : "Unpaid"}
                  </span>
                  {o.status === "ACTIVE" && <span className="ml-auto text-xs text-gray-500">Active order</span>}
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No subscriptions yet</p>}
          </div>
        </div>
      )}

      {tab === "menu" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              {[["DAY", "Daily"], ["WEEK", "Weekly"]].map(([m, label]) => (
                <button key={m} onClick={() => setMenuMode(m)} className={`px-3 py-1.5 text-sm ${menuMode === m ? "bg-[#6B0F1A] text-white" : "text-gray-700 bg-white"}`}>
                  {label}
                </button>
              ))}
            </div>

            {menuMode === "DAY" ? (
              <input type="date" value={menuDate} onChange={(e) => setMenuDate(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            ) : (
              <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Mess Menu</h3>
            <div className="space-y-2">
              {menuItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-100 p-3">
                  <p className="text-sm font-medium text-gray-800">{item.itemName}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(item.date).toLocaleDateString()} | {item.mealType}
                    {item.isHoliday ? " | Holiday" : ""}
                  </p>
                  {item.notes && <p className="text-xs text-gray-600 mt-1">{item.notes}</p>}
                </div>
              ))}
              {menuItems.length === 0 && <p className="text-sm text-gray-500">No menu items for selected period.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
