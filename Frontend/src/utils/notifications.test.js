import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  NOTIFICATION_AREAS,
  clearNotificationCache,
  createReadMapStorageKey,
  formatNotificationTime,
  fetchNotifications,
  getNotificationMeta,
  getNotificationRoute,
  getNotificationType,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "./notifications";

describe("notifications utils", () => {
  beforeEach(() => {
    clearNotificationCache();
  });

  it("detects notification type from id", () => {
    expect(getNotificationType("APP-12")).toBe("APP");
    expect(getNotificationType("MRQ-8")).toBe("MRQ");
    expect(getNotificationType("")).toBe("UNKNOWN");
  });

  it("returns student routes for known types", () => {
    expect(getNotificationRoute({ id: "APP-123" }, NOTIFICATION_AREAS.STUDENT)).toBe("/dashboard/room/status");
    expect(getNotificationRoute({ id: "CMPU-22" }, NOTIFICATION_AREAS.STUDENT)).toBe("/dashboard/complaints");
    expect(getNotificationRoute({ id: "ANN-11" }, NOTIFICATION_AREAS.STUDENT)).toBe("/dashboard/mess");
  });

  it("returns admin routes for known types", () => {
    expect(getNotificationRoute({ id: "RAPP-1" }, NOTIFICATION_AREAS.ADMIN)).toBe("/admin/applications");
    expect(getNotificationRoute({ id: "RCMP-1" }, NOTIFICATION_AREAS.ADMIN)).toBe("/admin/complaints");
    expect(getNotificationRoute({ id: "MRQ-1" }, NOTIFICATION_AREAS.ADMIN)).toBe("/admin/orders");
  });

  it("returns fallback routes for unknown types", () => {
    expect(getNotificationRoute({ id: "X-9" }, NOTIFICATION_AREAS.STUDENT)).toBe("/dashboard");
    expect(getNotificationRoute({ id: "X-9" }, NOTIFICATION_AREAS.ADMIN)).toBe("/admin");
  });

  it("formats notification times in realistic relative format", () => {
    const now = new Date("2026-04-04T10:00:00.000Z").getTime();
    expect(formatNotificationTime("2026-04-04T09:59:40.000Z", now)).toBe("just now");
    expect(formatNotificationTime("2026-04-04T09:40:00.000Z", now)).toBe("20m ago");
    expect(formatNotificationTime("2026-04-04T08:00:00.000Z", now)).toBe("2h ago");
    expect(formatNotificationTime("2026-04-02T10:00:00.000Z", now)).toBe("2d ago");
  });

  it("handles invalid dates safely", () => {
    expect(formatNotificationTime("not-a-date")).toBe("Unknown time");
  });

  it("marks read state correctly", () => {
    const state = markAsRead({}, "APP-1");
    expect(state["APP-1"]).toBe(true);

    const all = markAllAsRead([{ id: "APP-1" }, { id: "CMPU-2" }]);
    expect(all).toEqual({ "APP-1": true, "CMPU-2": true });
  });

  it("returns zero unread for empty notifications", () => {
    expect(getUnreadCount([], {})).toBe(0);
  });

  it("calculates unread count", () => {
    const items = [{ id: "APP-1" }, { id: "CMPU-2" }, { id: "ANN-3" }];
    const readMap = { "CMPU-2": true };
    expect(getUnreadCount(items, readMap)).toBe(2);
  });

  it("creates scoped storage key", () => {
    expect(createReadMapStorageKey({ id: 8, role: "STUDENT" })).toBe("hms_notification_reads_8_STUDENT");
  });

  it("creates fallback storage key for anonymous user", () => {
    expect(createReadMapStorageKey(null)).toBe("hms_notification_reads_anon_guest");
  });

  it("returns safe defaults for meta", () => {
    expect(getNotificationMeta({ id: "APP-1" }).icon).toBe("room");
    expect(getNotificationMeta({ id: "NOPE-1" }).icon).toBe("notice");
  });

  it("ignores items without id when marking all read", () => {
    const readMap = markAllAsRead([{ id: "APP-1" }, {}, { id: null }]);
    expect(readMap).toEqual({ "APP-1": true });
  });

  it("deduplicates notification fetches while a request is in flight", async () => {
    let resolveRequest;
    const api = {
      get: vi.fn(() => new Promise((resolve) => {
        resolveRequest = resolve;
      })),
    };

    const user = { id: 1, role: "STUDENT" };
    const first = fetchNotifications(api, user, { ttlMs: 60000 });
    const second = fetchNotifications(api, user, { ttlMs: 60000 });

    expect(api.get).toHaveBeenCalledTimes(1);

    resolveRequest({ data: [{ id: "APP-1" }] });

    await expect(first).resolves.toEqual([{ id: "APP-1" }]);
    await expect(second).resolves.toEqual([{ id: "APP-1" }]);

    const third = await fetchNotifications(api, user, { ttlMs: 60000 });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(third).toEqual([{ id: "APP-1" }]);
  });
});
