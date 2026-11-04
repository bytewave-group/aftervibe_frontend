import { useTabChannelMessage } from "@my-common-tool/tool/tab-channel-message";

export function useTawkChatControl() {
  const { send } = useTabChannelMessage("control-iframe-page");

  const open_support_chat = () => {
    send({ type: "TRIGGER_LIVE_CHAT_OPEN" });
  };

  const close_support_chat = () => {
    send({ type: "TRIGGER_LIVE_CHAT_CLOSE" });
  };

  return { open_support_chat, close_support_chat };
}
