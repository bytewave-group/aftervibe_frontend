/**
 * Live floor plan socket (per-bar websocket node, /floor channel).
 *
 * 1. Ask Laravel for a short-lived ticket (floor_ws_ticket). data.enabled === false -> realtime not configured.
 * 2. Connect to `${ws_url}?ticket=...`. The node sends {type: "floor-hello"} and then {type: "floor-event", event, data}.
 * 3. On close / error: reconnect with exponential backoff (1s .. 30s) and a fresh ticket.
 *
 * The page keeps refreshing every 30s while the status is not "live" (see floorPlan.jsx).
 */
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const DISABLED_RETRY_MS = 5 * 60 * 1000;
const PING_MS = 25000;

export const FLOOR_SOCKET_STATUS = Object.freeze({
  CONNECTING: "connecting",
  LIVE: "live",
  OFFLINE: "offline",
  DISABLED: "disabled",
});

export function createFloorSocket({ getTicket, onEvent, onStatus }) {
  let ws = null;
  let stopped = false;
  let attempt = 0;
  let retryTimer = null;
  let pingTimer = null;

  const setStatus = (status) => {
    if (!stopped && onStatus) {
      onStatus(status);
    }
  };

  const clearTimers = () => {
    clearTimeout(retryTimer);
    clearInterval(pingTimer);
    retryTimer = null;
    pingTimer = null;
  };

  const scheduleRetry = (delayMs) => {
    if (stopped) {
      return;
    }
    const delay = delayMs ?? Math.min(MAX_DELAY_MS, MIN_DELAY_MS * 2 ** attempt) + Math.floor(Math.random() * 500);
    attempt += 1;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(connect, delay);
  };

  async function connect() {
    if (stopped || ws) {
      return;
    }
    setStatus(FLOOR_SOCKET_STATUS.CONNECTING);

    let response = null;
    try {
      response = await getTicket();
    } catch (error) {
      response = null;
    }
    if (stopped) {
      return;
    }

    const data = response && response.status ? response.data : null;
    if (!data) {
      setStatus(FLOOR_SOCKET_STATUS.OFFLINE);
      scheduleRetry();
      return;
    }
    if (!data.enabled || !data.ws_url || !data.ticket) {
      setStatus(FLOOR_SOCKET_STATUS.DISABLED);
      scheduleRetry(DISABLED_RETRY_MS);
      return;
    }

    const separator = data.ws_url.includes("?") ? "&" : "?";
    let socket;
    try {
      socket = new WebSocket(`${data.ws_url}${separator}ticket=${encodeURIComponent(data.ticket)}`);
    } catch (error) {
      setStatus(FLOOR_SOCKET_STATUS.OFFLINE);
      scheduleRetry();
      return;
    }
    ws = socket;

    socket.onopen = () => {
      attempt = 0;
      setStatus(FLOOR_SOCKET_STATUS.LIVE);
      clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        try {
          socket.send(JSON.stringify({ type: "ping" }));
        } catch (error) {
          // ignore, onclose handles reconnects
        }
      }, PING_MS);
      // Catch up on anything missed while disconnected.
      if (onEvent) {
        onEvent({ event: "connected", data: {} });
      }
    };

    socket.onmessage = (message) => {
      let payload = null;
      try {
        payload = JSON.parse(message.data);
      } catch (error) {
        return;
      }
      if (payload && payload.type === "floor-event" && onEvent) {
        onEvent(payload);
      }
    };

    socket.onerror = () => {
      try {
        socket.close();
      } catch (error) {
        // ignore
      }
    };

    socket.onclose = (event) => {
      clearInterval(pingTimer);
      if (ws === socket) {
        ws = null;
      }
      if (stopped) {
        return;
      }
      if (event && event.code === 4403) {
        setStatus(FLOOR_SOCKET_STATUS.DISABLED);
        scheduleRetry(DISABLED_RETRY_MS);
        return;
      }
      setStatus(FLOOR_SOCKET_STATUS.OFFLINE);
      scheduleRetry();
    };
  }

  connect();

  return {
    stop() {
      stopped = true;
      clearTimers();
      if (ws) {
        ws.onclose = null;
        try {
          ws.close();
        } catch (error) {
          // ignore
        }
        ws = null;
      }
    },
    /** Reconnect right away (e.g. when the app comes back to the foreground). */
    reconnectNow() {
      if (stopped || ws) {
        return;
      }
      attempt = 0;
      clearTimeout(retryTimer);
      connect();
    },
  };
}
