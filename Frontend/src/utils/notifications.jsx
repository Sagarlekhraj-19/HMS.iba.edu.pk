export const NOTIFICATION_AREAS = {
  STUDENT: "STUDENT",
  ADMIN: "ADMIN",
};

const NOTIFICATION_CACHE_TTL_MS = 15000;
const notificationFeedCache = new Map();

const STUDENT_ROUTE_MAP = {
  APP: "/dashboard/room/status",
  CMPU: "/dashboard/complaints",
  ANN: "/dashboard/mess",
  MRQ: "/dashboard/mess?tab=requests",
};

const ADMIN_ROUTE_MAP = {
  RAPP: "/admin/applications?autoReview=true",
  RCMP: "/admin/complaints",
  MRQ: "/admin/orders",
};

const TYPE_META = {
  APP: { icon: "room", tone: "text-sky-700 bg-sky-100" },
  CMPU: { icon: "complaint", tone: "text-amber-700 bg-amber-100" },
  ANN: { icon: "announcement", tone: "text-indigo-700 bg-indigo-100" },
  RAPP: { icon: "review", tone: "text-teal-700 bg-teal-100" },
  RCMP: { icon: "issue", tone: "text-rose-700 bg-rose-100" },
  MRQ: { icon: "order", tone: "text-emerald-700 bg-emerald-100" },
  UNKNOWN: { icon: "notice", tone: "text-gray-700 bg-gray-100" },
};

const pad = (n) => (n < 10 ? `0${n}` : String(n));

export const getNotificationType = (id) => String(id || "").split("-")[0] || "UNKNOWN";

export const getNotificationRoute = (item, area) => {
  const type = getNotificationType(item?.id);
  const routeMap = area === NOTIFICATION_AREAS.ADMIN ? ADMIN_ROUTE_MAP : STUDENT_ROUTE_MAP;
  return routeMap[type] || (area === NOTIFICATION_AREAS.ADMIN ? "/admin" : "/dashboard");
};

export const getNotificationMeta = (item) => {
  const type = getNotificationType(item?.id);
  return TYPE_META[type] || TYPE_META.UNKNOWN;
};

export const formatNotificationTime = (at, nowMs = Date.now()) => {
  const ts = new Date(at).getTime();
  if (!Number.isFinite(ts)) return "Unknown time";

  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `${m}m ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `${h}h ago`;
  }
  if (diffSec < 604800) {
    const d = Math.floor(diffSec / 86400);
    return `${d}d ago`;
  }

  const dt = new Date(ts);
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

export const createReadMapStorageKey = (user) => `hms_notification_reads_${user?.id || "anon"}_${user?.role || "guest"}`;

const createNotificationCacheKey = (user) => `${user?.id || "anon"}_${user?.role || "guest"}`;

export const clearNotificationCache = (user) => {
  if (user) {
    notificationFeedCache.delete(createNotificationCacheKey(user));
    return;
  }

  notificationFeedCache.clear();
};

export const fetchNotifications = async (apiClient, user, { ttlMs = NOTIFICATION_CACHE_TTL_MS } = {}) => {
  const cacheKey = createNotificationCacheKey(user);
  const now = Date.now();
  const cached = notificationFeedCache.get(cacheKey);

  if (cached?.promise) {
    return cached.promise;
  }

  if (Array.isArray(cached?.items) && (now - (cached.fetchedAt || 0)) < ttlMs) {
    return cached.items;
  }

  const request = apiClient.get("/auth/notifications")
    .then((response) => (Array.isArray(response?.data) ? response.data : []))
    .catch(() => [])
    .then((items) => {
      notificationFeedCache.set(cacheKey, {
        items,
        fetchedAt: Date.now(),
      });
      return items;
    });

  notificationFeedCache.set(cacheKey, {
    items: Array.isArray(cached?.items) ? cached.items : [],
    fetchedAt: cached?.fetchedAt || 0,
    promise: request,
  });

  return request;
};

export const readNotificationState = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const persistNotificationState = (key, state) => {
  localStorage.setItem(key, JSON.stringify(state || {}));
};

export const markAsRead = (state, id) => ({
  ...(state || {}),
  [id]: true,
});

export const markAllAsRead = (notifications) =>
  notifications.reduce((acc, item) => {
    if (item?.id) acc[item.id] = true;
    return acc;
  }, {});

export const getUnreadCount = (notifications, readMap) =>
  notifications.filter((item) => item?.id && !readMap?.[item.id]).length;
