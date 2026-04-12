// client/src/pages/student/StudentLayout.jsx
import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import {
  NOTIFICATION_AREAS,
  fetchNotifications,
  createReadMapStorageKey,
  formatNotificationTime,
  getNotificationMeta,
  getNotificationRoute,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  persistNotificationState,
  readNotificationState,
} from "../../utils/notifications";

const NAV = [
  { label: "Dashboard",           to: "/dashboard" },
  { label: "Room Allocation",     to: "/dashboard/room" },
  { label: "Mess Subscription",   to: "/dashboard/mess" },
  { label: "Complaint & Feedback",to: "/dashboard/complaints" },
];

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readMap, setReadMap] = useState({});
  const notificationsButtonRef = useRef(null);
  const notificationsPanelRef = useRef(null);
  const initials = user?.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) || "SL";
  const storageKey = createReadMapStorageKey(user);
  const unreadCount = getUnreadCount(notifications, readMap);

  useEffect(() => {
    setReadMap(readNotificationState(storageKey));
  }, [storageKey]);

  useEffect(() => {
    let active = true;

    fetchNotifications(api, user)
      .then((items) => {
        if (active) {
          setNotifications(items);
        }
      })
      .catch(() => {
        if (active) {
          setNotifications([]);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!showNotifications) return undefined;

    const onDocumentMouseDown = (event) => {
      const target = event.target;
      const isInsidePanel = notificationsPanelRef.current?.contains(target);
      const isButton = notificationsButtonRef.current?.contains(target);
      if (!isInsidePanel && !isButton) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [showNotifications]);

  const handleNotificationClick = (item) => {
    const nextMap = markAsRead(readMap, item?.id);
    setReadMap(nextMap);
    persistNotificationState(storageKey, nextMap);
    navigate(getNotificationRoute(item, NOTIFICATION_AREAS.STUDENT));
    setShowNotifications(false);
  };

  const handleMarkAllRead = () => {
    const nextMap = markAllAsRead(notifications);
    setReadMap(nextMap);
    persistNotificationState(storageKey, nextMap);
  };

  return (
    <div className="glass-app-surface min-h-screen flex font-sans">
      {/* Sidebar */}
      <aside className="glass-sidebar w-64 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <p className="text-white font-bold tracking-widest text-xs">H M S  P o r t a l</p>
          <p className="text-[#c9a0a0] text-xs mt-0.5">IBA Karachi</p>
        </div>

        <nav className="flex-1 py-4">
          {NAV.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/dashboard"}
              className={({ isActive }) =>
                `block px-6 py-3 text-sm transition-colors ${
                  isActive
                    ? "bg-white/10 text-white font-medium border-l-4 border-white"
                    : "text-[#d4a0a0] hover:text-white hover:bg-white/5"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <span className="text-white text-sm flex-1 truncate">{user?.fullName}</span>
        </div>
      </aside>

      {/* Main */}
      <div className="relative flex-1 flex flex-col min-h-screen bg-transparent">
        {/* Topbar */}
        <header className="glass-topbar m-4 mb-0 h-14 rounded-xl flex items-center justify-between px-6">
          <span className="text-gray-600 text-sm" id="page-title">Dashboard</span>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#6B0F1A]/10 px-3 py-1 text-xs font-semibold text-[#6B0F1A]">
              Student · {user?.fullName || "User"}
            </span>
            <button
              ref={notificationsButtonRef}
              type="button"
              onClick={() => setShowNotifications((v) => !v)}
              className="relative text-sm text-gray-600 border border-gray-300 rounded px-3 py-1 hover:bg-gray-50"
            >
              Notifications
              {unreadCount > 0 && <span className="ml-2 inline-block rounded-full bg-[#6B0F1A] px-1.5 text-xs text-white">{unreadCount}</span>}
            </button>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="text-sm text-gray-600 border border-gray-300 rounded px-3 py-1 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </header>

        {showNotifications && (
          <div ref={notificationsPanelRef} className="glass-popover absolute right-6 top-20 z-40 w-[380px] rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/60 px-4 py-2 text-sm font-semibold text-gray-700">
              <span>Notifications</span>
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-[#6B0F1A] hover:underline"
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-96 overflow-auto p-2">
              {notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNotificationClick(item)}
                  className={`w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/70 ${readMap[item.id] ? "opacity-80" : "bg-white/55"}`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getNotificationMeta(item).tone}`}>
                      {getNotificationMeta(item).icon}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700">{item.message}</p>
                  <p className="mt-1 text-[11px] text-gray-500">{formatNotificationTime(item.at)}</p>
                </button>
              ))}
              {notifications.length === 0 && <p className="px-3 py-8 text-center text-sm text-gray-500">No notifications yet</p>}
            </div>
          </div>
        )}

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
