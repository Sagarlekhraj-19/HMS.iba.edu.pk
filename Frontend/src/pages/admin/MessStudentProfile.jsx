import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../utils/api";

export default function MessStudentProfile() {
  const { studentId } = useParams();
  const [profile, setProfile] = useState(null);
  const [msg, setMsg] = useState("");

  const avatar = useMemo(() => {
    const seed = profile?.user?.erp || profile?.user?.fullName || "student";
    return `https://api.dicebear.com/8.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
  }, [profile]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/mess/manager/students/${studentId}`);
        setProfile(res.data);
      } catch (err) {
        setMsg(err.response?.data?.error || "Unable to load profile");
      }
    };

    load();
  }, [studentId]);

  if (msg) return <p className="text-sm text-red-600">{msg}</p>;
  if (!profile) return <p className="text-sm text-gray-500">Loading student profile...</p>;

  const latestMembership = profile.messMemberships?.[0];
  const latestRoom = profile.roomApplications?.[0]?.room;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Student Profile</h1>
        <Link className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700" to="/admin/mess-dashboard">Back</Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <img src={avatar} alt="student avatar" className="h-24 w-24 rounded-lg border border-gray-200" />
          <p className="mt-3 text-lg font-semibold text-gray-800">{profile.user?.fullName}</p>
          <p className="text-sm text-gray-500">ERP: {profile.user?.erp || "-"}</p>
          <p className="text-sm text-gray-500">Email: {profile.user?.email}</p>
          <p className="text-sm text-gray-500">Program: {profile.user?.program || "-"}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="font-medium text-gray-800">Mess Information</p>
          <p className="mt-2 text-sm text-gray-700">Membership: {latestMembership?.status || "No record"}</p>
          <p className="text-sm text-gray-700">Dietary Preference: {latestMembership?.dietaryPreference || profile.dietaryPreference || "-"}</p>
          <p className="text-sm text-gray-700">Start Date: {latestMembership?.startDate ? new Date(latestMembership.startDate).toLocaleDateString() : "-"}</p>
          <p className="text-sm text-gray-700">Latest Mess Orders: {profile.messOrders?.length || 0}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="font-medium text-gray-800">Hostel Room</p>
          <p className="mt-2 text-sm text-gray-700">Room Number: {latestRoom?.roomNumber || "Not allocated"}</p>
          <p className="text-sm text-gray-700">Block: {latestRoom?.block || "-"}</p>
          <p className="text-sm text-gray-700">Type: {latestRoom?.type || "-"}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-2 font-medium text-gray-800">Recent Bills</p>
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(profile.messBills || []).map((b) => (
                <tr key={b.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{b.month}/{b.year}</td>
                  <td className="px-3 py-2">PKR {Number(b.totalAmount).toLocaleString()}</td>
                  <td className="px-3 py-2">PKR {Number(b.paidAmount).toLocaleString()}</td>
                  <td className="px-3 py-2">{b.paymentStatus}</td>
                </tr>
              ))}
              {!profile.messBills?.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-gray-500">No bills found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
