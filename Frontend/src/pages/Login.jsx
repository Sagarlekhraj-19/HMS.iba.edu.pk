// client/src/pages/Login.jsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

export default function Login({ portal = "STUDENT" }) {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location = useLocation();
  const [form, setForm]     = useState({ erp: "", password: "" });
  const [selectedPortal, setSelectedPortal] = useState(portal);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotForm, setForgotForm] = useState({ identifier: "", oldPassword: "", newPassword: "", confirmPassword: "" });
  const [forgotError, setForgotError] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login({ ...form, portal: selectedPortal });
      navigate(user.role === "STUDENT" ? "/dashboard" : "/admin");
    } catch (err) {
      const message = err.response?.data?.error || "Login failed";
      setError(message);

      if (message.includes("Staff accounts must sign in from the admin login page")) {
        setSelectedPortal("ADMIN");
        if (location.pathname !== "/admin/login") {
          navigate("/admin/login", { replace: true });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const switchPortal = (nextPortal) => {
    setSelectedPortal(nextPortal);
    setError("");
    if (nextPortal === "ADMIN" && location.pathname !== "/admin/login") {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (nextPortal === "STUDENT" && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotMsg("");

    if (!forgotForm.identifier.trim()) {
      setForgotError("ERP or email is required");
      return;
    }

    if (!(forgotForm.oldPassword || "").trim()) {
      setForgotError("Current password is required");
      return;
    }

    if ((forgotForm.newPassword || "").length < 8) {
      setForgotError("New password must be at least 8 characters");
      return;
    }

    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setForgotError("Passwords do not match");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", {
        identifier: forgotForm.identifier,
        oldPassword: forgotForm.oldPassword,
        newPassword: forgotForm.newPassword,
      });
      setForgotMsg(res.data?.message || "Password reset successful");
      setForgotForm({ identifier: "", oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setForgotError(err.response?.data?.error || "Unable to reset password");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="w-2/5 bg-[#6B0F1A] hidden md:flex flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute top-10 right-10 w-48 h-48 rounded-full bg-white opacity-5" />
        <div className="absolute bottom-20 right-0 w-72 h-72 rounded-full bg-white opacity-5" />
        <div>
          <p className="text-white font-bold tracking-widest text-sm">HMS</p>
          <p className="text-white font-bold tracking-widest text-sm">Portal</p>
          <p className="text-[#c9a0a0] text-xs tracking-wider">IBA Karachi</p>
        </div>
        <div>
          <h1 className="text-white text-5xl font-light mb-3">Sign in</h1>
          <p className="text-[#c9a0a0] text-sm leading-relaxed">
            Fill in your details to access<br />the Hostel Management System.
          </p>
        </div>
        <div />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-semibold text-gray-900 mb-1">Welcome Back</h2>
          <p className="text-gray-500 text-sm mb-4">Sign in to your HMS account</p>

          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => switchPortal("STUDENT")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  selectedPortal === "STUDENT"
                    ? "bg-[#6B0F1A] text-white"
                    : "text-gray-600 hover:bg-white"
                }`}
              >
                Student Login
              </button>
              <button
                type="button"
                onClick={() => switchPortal("ADMIN")}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  selectedPortal === "ADMIN"
                    ? "bg-[#6B0F1A] text-white"
                    : "text-gray-600 hover:bg-white"
                }`}
              >
                Admin/Staff Login
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">ERP or Email*</label>
              <input
                type="text"
                placeholder="e.g. 29325 or admin@iba.edu.pk"
                value={form.erp}
                onChange={(e) => setForm({ ...form, erp: e.target.value })}
                required
                className="w-full border border-[#6B0F1A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/30"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Password*</label>
              <input
                type="password"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="w-full border border-[#6B0F1A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/30"
              />
              <div className="text-right mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(true);
                    setForgotError("");
                    setForgotMsg("");
                  }}
                  className="text-[#6B0F1A] text-sm cursor-pointer hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#6B0F1A] text-white py-3 rounded-xl font-medium hover:bg-[#8B1520] transition-colors disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            No account yet?{" "}
            <Link to="/register" className="text-[#6B0F1A] font-medium hover:underline">
              Sign up here
            </Link>
          </p>
        </div>
      </div>

      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
              <button
                type="button"
                className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                onClick={() => setShowForgot(false)}
              >
                Close
              </button>
            </div>

            {forgotError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{forgotError}</div>}
            {forgotMsg && <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{forgotMsg}</div>}

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <input
                type="text"
                placeholder="ERP or Email"
                value={forgotForm.identifier}
                onChange={(e) => setForgotForm((s) => ({ ...s, identifier: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/30"
              />
              <input
                type="password"
                placeholder="Current password"
                value={forgotForm.oldPassword}
                onChange={(e) => setForgotForm((s) => ({ ...s, oldPassword: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/30"
              />
              <input
                type="password"
                placeholder="New password"
                value={forgotForm.newPassword}
                onChange={(e) => setForgotForm((s) => ({ ...s, newPassword: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/30"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={forgotForm.confirmPassword}
                onChange={(e) => setForgotForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/30"
              />

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full rounded-xl bg-[#6B0F1A] py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {forgotLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
