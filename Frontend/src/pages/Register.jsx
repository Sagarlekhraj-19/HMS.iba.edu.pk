// client/src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PROGRAMS = [
  "BS Computer Science (BSCS)",
  "BS Accounting & Finance (BSAF)",
  "BS Economics",
  "BS Economics & Mathematics",
  "BS Social Sciences & Liberal Arts",
  "BBA",
  "BBA (Round 2)",
  "BEd",
  "MBA (Evening)",
  "MBA (Master of Business Administration)",
  "MS Computer Science",
  "MS Management",
  "MS Economics",
  "MS Mathematics",
  "MS Data Science",
  "MS Journalism",
  "MS Development Studies",
  "MS Finance",
  "PhD Computer Science",
  "PhD Economics",
  "PhD Mathematics",
  "PhD Management",
];

const STAFF_ROLES = [
  { value: "ADMIN", label: "Admin (All Access)" },
  { value: "MESS_MANAGER", label: "Mess Manager" },
  { value: "COMPLAINT_MANAGER", label: "Complaint Manager" },
  { value: "CLEANING_MANAGER", label: "Cleaning Manager" },
];

const INITIAL = {
  mode: "STUDENT",
  fullName: "",
  username: "",
  program: "",
  erp: "",
  role: "ADMIN",
  isNTHP: false,
  email: "",
  password: "",
  confirm: "",
};

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]   = useState(INITIAL);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isStudent = form.mode === "STUDENT";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match");
    if (form.password.length < 8) return setError("Password must be at least 8 characters");
    if (isStudent && (!form.fullName || !form.erp || !form.program)) {
      return setError("Please complete all student fields");
    }
    if (!isStudent && !form.username) {
      return setError("Please enter username for staff account");
    }

    setLoading(true);
    try {
      const payload = isStudent
        ? {
            fullName: form.fullName,
            program: form.program,
            erp: form.erp,
            role: "STUDENT",
            isNTHP: form.isNTHP,
            email: form.email,
            password: form.password,
          }
        : {
            username: form.username,
            role: form.role,
            email: form.email,
            password: form.password,
          };

      const user = await register(payload);
      navigate(user.role === "STUDENT" ? "/dashboard" : "/admin");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const field = (key, placeholder, type = "text") => (
    <input
      type={type}
      placeholder={placeholder}
      value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      required
      className="w-full border border-[#6B0F1A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/30"
    />
  );

  return (
    <div className="min-h-screen flex">
      {/* Left */}
      <div className="w-2/5 bg-[#6B0F1A] hidden md:flex flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute top-10 right-10 w-48 h-48 rounded-full bg-white opacity-5" />
        <div className="absolute bottom-20 right-0 w-72 h-72 rounded-full bg-white opacity-5" />
        <div>
          <p className="text-white font-bold tracking-widest text-sm">HMS</p>
          <p className="text-white font-bold tracking-widest text-sm">Portal</p>
          <p className="text-[#c9a0a0] text-xs tracking-wider">IBA Karachi</p>
        </div>
        <div>
          <h1 className="text-white text-5xl font-light mb-3">Create Account</h1>
          <p className="text-[#c9a0a0] text-sm leading-relaxed">
            Fill in your details to register<br />as a hostel student. All fields<br />are required.
          </p>
        </div>
        <div />
      </div>

      {/* Right */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-lg">
          <h2 className="text-3xl font-semibold text-gray-900 mb-1">Create Account</h2>
          <p className="text-gray-500 text-sm mb-8">Register to access the Hostel Management System</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Account Type*</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, mode: "STUDENT", role: "STUDENT" }))}
                    className={`py-2.5 rounded-xl text-sm font-medium border ${isStudent ? "bg-[#6B0F1A] text-white border-[#6B0F1A]" : "text-gray-700 border-gray-300"}`}
                  >
                    Student Signup
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, mode: "STAFF", role: "ADMIN" }))}
                    className={`py-2.5 rounded-xl text-sm font-medium border ${!isStudent ? "bg-[#6B0F1A] text-white border-[#6B0F1A]" : "text-gray-700 border-gray-300"}`}
                  >
                    Admin / Staff Signup
                  </button>
                </div>
              </div>
            </div>

            {isStudent ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Full Name*</label>
                    {field("fullName", "e.g. Sagar Lekhraj")}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">ERP*</label>
                    {field("erp", "e.g. 29325")}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Program*</label>
                  <select
                    value={form.program}
                    onChange={(e) => setForm({ ...form, program: e.target.value })}
                    className="w-full border border-[#6B0F1A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/30"
                    required
                  >
                    <option value="">Select one program</option>
                    {PROGRAMS.map((program) => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>
                </div>

              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Username*</label>
                    {field("username", "e.g. mess.manager")}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Role*</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="w-full border border-[#6B0F1A] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]/30"
                    >
                      {STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email*</label>
                {field("email", "e.g. user@khi.iba.edu.pk", "email")}
              </div>
              <div className="text-xs text-gray-500 flex items-end pb-2">
                {isStudent ? "Student signup uses ERP + Program" : "Staff signup uses username + role (no ERP)"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Password*</label>
                {field("password", "Min. 8 characters", "password")}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Confirm Password*</label>
                {field("confirm", "Re-enter password", "password")}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#6B0F1A] text-white py-3 rounded-xl font-medium hover:bg-[#8B1520] transition-colors disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-[#6B0F1A] font-medium hover:underline">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
