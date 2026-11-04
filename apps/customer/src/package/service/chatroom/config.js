// ======================================================================
// SDK
// ======================================================================
export const CHAT_SDK_CSS = "https://sdk.chatgamer.chat/chat-sdk.css";
export const CHAT_SDK_SCRIPT = "https://sdk.chatgamer.chat/chat-sdk.umd.cjs";
export const DEFAULT_CHAT_API = "https://api.chatgamer.chat/api/v1";
// ======================================================================
// API
// ======================================================================
export const USER_TOKEN_API_PATH = "live_chat_2_user_token";
// ======================================================================
// ROUTE
// ======================================================================
export const LIVE_CHAT_ROUTE = "/live_chat";
// ======================================================================
// DOM
// ======================================================================
export const CONTAINER_ID = "chat-sdk-container";
export const GLOBAL_CONTAINER_ID = "chat-sdk-container-global";

export const PAGE_SELECTOR = "#view-home .page-current .page-content";

// ======================================================================
// CONTAINER BASE STYLE
// ======================================================================
export const GLOBAL_CONTAINER_STYLE = `
position:fixed;
left:0;
width:100vw;
visibility:hidden;
opacity:0;
pointer-events:none;
z-index:-1;
display:none;
transition:opacity 0.2s ease-in-out, visibility 0.2s ease-in-out;
background:transparent;
`;

export const INNER_CONTAINER_STYLE = `
width:100%;
height:100%;
overflow:hidden;
min-height:0;
`;

// ======================================================================
// CONTAINER STATE STYLE
// ======================================================================
export const CONTAINER_VISIBLE_STYLE = {
  display: "block",
  visibility: "visible",
  opacity: "1",
  pointerEvents: "auto",
  zIndex: "5000",
};

export const CONTAINER_HIDDEN_STYLE = {
  display: "none",
  visibility: "hidden",
  opacity: "0",
  pointerEvents: "none",
  zIndex: "-1",
};
