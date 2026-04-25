// client/src/pages/admin/AdminLayout.jsx
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
  { label: "Dashboard",     to: "/admin/admin-dashboard", icon: "📊", roles: ["ADMIN"] },
  { label: "Mess Dashboard",to: "/admin/mess-dashboard", icon: "🍽️", roles: ["ADMIN", "MESS_MANAGER"] },
  { label: "Applications",  to: "/admin/applications",  icon: "📋", roles: ["ADMIN"] },
  { label: "Rooms",         to: "/admin/rooms",         icon: "🛏️", roles: ["ADMIN"] },
  { label: "Complaints",    to: "/admin/complaints",    icon: "💬", roles: ["ADMIN", "COMPLAINT_MANAGER", "CLEANING_MANAGER"] },
  { label: "Mess Management",to: "/admin/orders",        icon: "🍽️", roles: ["ADMIN", "MESS_MANAGER"] },
  { label: "Students",      to: "/admin/students",      icon: "👥", roles: ["ADMIN"] },
  { label: "User Access",   to: "/admin/users-access",  icon: "🔐", roles: ["ADMIN"] },
];

const ROLE_LABEL = {
  ADMIN: "Admin",
  MESS_MANAGER: "Mess Manager",
  COMPLAINT_MANAGER: "Complaint Manager",
  CLEANING_MANAGER: "Cleaning Manager",
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readMap, setReadMap] = useState({});
  const notificationsButtonRef = useRef(null);
  const notificationsPanelRef = useRef(null);
  const initials = user?.fullName?.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2) || "AD";
  const navItems = NAV.filter(item => item.roles.includes(user?.role));
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
    
    const route = getNotificationRoute(item, NOTIFICATION_AREAS.ADMIN);
    
    // For room applications, extract the numeric ID and pass as query param
    if (item?.id?.startsWith("RAPP-")) {
      const appId = item.id.replace("RAPP-", "");
      navigate(`${route}?appId=${appId}`);
    } else {
      navigate(route);
    }
    
    setShowNotifications(false);
  };

  const handleMarkAllRead = () => {
    const nextMap = markAllAsRead(notifications);
    setReadMap(nextMap);
    persistNotificationState(storageKey, nextMap);
  };

  return (
    <div className="glass-app-surface min-h-screen flex font-sans">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <aside className={`glass-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col transform transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-6 border-b border-white/10">
          <p className="text-white font-bold tracking-widest text-xs">H M S  P o r t a l</p>
          <p className="text-[#c9a0a0] text-xs mt-0.5">IBA Karachi — Admin</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map(({ label, to, icon }) => (
            <NavLink key={to} to={to} end={to === "/admin"} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${isActive
                  ? "bg-white/10 text-white font-medium border-l-4 border-white"
                  : "text-[#d4a0a0] hover:text-white hover:bg-white/5"
                }`
              }>
              <span>{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">{initials}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs truncate">{user?.fullName}</p>
            <p className="text-[#c9a0a0] text-xs">{ROLE_LABEL[user?.role] || "Staff"}</p>
          </div>
        </div>
      </aside>

      <div className="relative flex-1 flex flex-col bg-transparent">
        <header className="glass-topbar m-4 mb-0 h-14 rounded-xl flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 md:hidden"
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <span className="text-gray-600 text-sm">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              ref={notificationsButtonRef}
              type="button"
              onClick={() => setShowNotifications((v) => !v)}
              className="text-sm text-gray-600 border border-gray-300 rounded px-3 py-1 hover:bg-gray-50"
            >
              Notifications
              {unreadCount > 0 && <span className="ml-2 inline-block rounded-full bg-[#6B0F1A] px-1.5 text-xs text-white">{unreadCount}</span>}
            </button>
            <button onClick={() => { logout(); navigate("/admin/login"); }}
              className="text-sm text-gray-600 border border-gray-300 rounded px-3 py-1 hover:bg-gray-50">
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
