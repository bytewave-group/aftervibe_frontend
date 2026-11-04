import { atom } from "recoil";
import { getRecoil, setRecoil } from "recoil-nexus";

const PostMessageChannelState = atom({
  key: "PostMessageChannelState",
  default: {
    allowed_parent_origin: "",
    message_channel_name: "",
  },
});

export function loadTawk(propertyId, widgetId) {
  window.Tawk_API = window.Tawk_API || {};

  window.Tawk_API.onLoad = function () {
    window.Tawk_API.maximize();
  };

  document.querySelector("#tawk-iframe-overlay").onclick = function () {
    send({
      type: "HIDE_IFRAME",
    });
  };

  window.Tawk_API.onChatMinimized = function () {
    send({
      type: "HIDE_IFRAME",
    });
  };

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
  s.onerror = (e) => {
    console.error(e?.message);
  };
  document.body.appendChild(s);
}

export const dispatch = (msg) => {
  switch (msg.type) {
    case "INIT_TAWK": {
      const data = msg?.data;
      if (!data?.propertyId || !data?.widgetId) return;
      loadTawk(data.propertyId, data.widgetId);
      break;
    }

    case "TRIGGER_maximize": {
      window.Tawk_API?.maximize?.();
      break;
    }

    case "TRIGGER_minimize": {
      window.Tawk_API?.minimize?.();
      break;
    }
  }
};

export const send = (msg) => {
  const {
    allowed_parent_origin: allowedParentOrigin,
    message_channel_name: messageChannelName,
  } = getRecoil(PostMessageChannelState);

  if (!msg?.type || !messageChannelName || !allowedParentOrigin) return;
  const payload = {
    ...msg,
    channel: messageChannelName,
  };
  window?.parent?.postMessage(payload, allowedParentOrigin);
};

export const handleMessage = (event) => {
  const payload = event.data || {};

  const {
    allowed_parent_origin: allowedParentOrigin,
    message_channel_name: messageChannelName,
  } = getRecoil(PostMessageChannelState);

  if (payload?.type === "INIT_MESSAGE_CHANNEL") {
    if (allowedParentOrigin) return;

    setRecoil(PostMessageChannelState, (prev) => ({
      ...prev,
      allowed_parent_origin: event.origin,
      message_channel_name: payload?.data?.channelName,
    }));

    setTimeout(() => {
      send({ type: "CHANNEL_READY" });
    }, 200);

    return;
  }

  if (event.origin !== allowedParentOrigin) return;

  if (payload?.channel !== messageChannelName) return;

  dispatch(payload);
};
