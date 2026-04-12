// client/src/pages/student/MessBilling.jsx
// Redirects to MessSubscription billing tab — already integrated there
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
export default function MessBilling() {
  const navigate = useNavigate();
  useEffect(() => navigate("/dashboard/mess?tab=billing"), []);
  return null;
}
