const roomUpdateClients = new Map();

const sendSse = (res, payload) => {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const subscribeRoomUpdates = (userId, res) => {
  if (!roomUpdateClients.has(userId)) {
    roomUpdateClients.set(userId, new Set());
  }

  const subscribers = roomUpdateClients.get(userId);
  subscribers.add(res);

  // Initial handshake event
  sendSse(res, { type: "connected", at: new Date().toISOString() });

  const heartbeat = setInterval(() => {
    sendSse(res, { type: "heartbeat", at: new Date().toISOString() });
  }, 25000);

  return () => {
    clearInterval(heartbeat);
    const set = roomUpdateClients.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) roomUpdateClients.delete(userId);
  };
};

const publishRoomUpdate = (userId, payload) => {
  const subscribers = roomUpdateClients.get(userId);
  if (!subscribers || subscribers.size === 0) return;

  for (const res of subscribers) {
    sendSse(res, {
      type: "room_application_updated",
      at: new Date().toISOString(),
      ...payload,
    });
  }
};

module.exports = {
  subscribeRoomUpdates,
  publishRoomUpdate,
};
