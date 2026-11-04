import { useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

/**
 * Message shape:
 * {
 *   id: string,
 *   type: string,
 *   data: any
 * }
 *
 */
export default function useTabChannelMessage(channelName, options = {}) {
  const {
    ignoreSelf = false,
    debug = false,
    namespace,
    crossOrigin = false,
    handlePostMessageToIframe,
  } = options;

  const instanceIdRef = useRef(uuidv4());

  const PREFIX = crossOrigin ? "__cross_origin__" : "__bc__";
  const fullChannelName = `${PREFIX}${channelName}`;

  const bcRef = useRef(null);
  const listenersRef = useRef(new Map()); // type => Set<fn>

  // ===== send =====
  const send = (msg) => {
    if (!msg?.type) return;

    const payload = {
      ...msg,
      __from: instanceIdRef.current,
      channel: fullChannelName,
    };

    //! CROSS ORIGIN MODE
    const isIframe = window.parent !== window;
    if (crossOrigin) {
      if (payload?.sendToIframe) {
        handlePostMessageToIframe(payload);
        return;
      }
      //? iframe → parent
      if (isIframe) {
        window.parent?.postMessage(payload, "*");
      } else {
        //? normal
        window?.postMessage(payload, "*");
      }
      return;
    } else {
      if (bcRef.current?.postMessage) {
        bcRef.current.postMessage(payload);
      } else {
        // fallback: localStorage
        localStorage.setItem(
          fullChannelName,
          JSON.stringify({ ...payload, __ts: Date.now() }),
        );
      }
    }
  };

  const sendToIframe = (msg) => {
    send({ ...msg, sendToIframe: true });
  };

  // ===== subscribe =====
  const subscribe = (type, handler) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }

    const set = listenersRef.current.get(type);
    set.add(handler);

    // unsubscribe
    return () => {
      set.delete(handler);
      if (set.size === 0) {
        listenersRef.current.delete(type);
      }
    };
  };

  const subscribeOnce = (type, handler) => {
    const off = subscribe(type, (data, msg) => {
      handler(data, msg);
      off();
    });

    return off;
  };

  useEffect(() => {
    let handleStorage;
    let handleMessage;
    let bc;

    const dispatch = (msg) => {
      if (!msg?.type) return;

      if (ignoreSelf && msg.__from === instanceIdRef.current) {
        return;
      }

      const handlers = listenersRef.current.get(msg.type);
      if (!handlers) return;

      handlers.forEach((fn) => fn(msg.data, msg));
    };

    if (crossOrigin) {
      handleMessage = (msg) => {
        const payload = msg.data || {};

        if (payload?.channel !== fullChannelName) return;

        dispatch(payload);
      };

      window.addEventListener("message", handleMessage);
    } else {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel(fullChannelName);
        bc.onmessage = (e) => dispatch(e.data);
        bcRef.current = bc;
      } else {
        // fallback: localStorage + storage event
        handleStorage = (e) => {
          if (e.key === fullChannelName && e.newValue) {
            dispatch(JSON.parse(e.newValue));
          }
        };
        window.addEventListener("storage", handleStorage);
      }
    }

    return () => {
      if (crossOrigin && handleMessage) {
        window.removeEventListener("message", handleMessage);
      } else {
        bcRef.current?.close();
        if (handleStorage) window.removeEventListener("storage", handleStorage);
      }

      bc?.onmessage && (bc.onmessage = null);
      listenersRef.current.clear();
    };
  }, [crossOrigin, fullChannelName]);

  return {
    send,
    sendToIframe,
    subscribe,
    subscribeOnce,
    channelName: fullChannelName,
  };
}
