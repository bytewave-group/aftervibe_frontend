/** Background tokens from Figma file stm3TO2yUu0pG2vTp0jbDK, canvas Voxx (29:987). */

const RED_RADIAL = (alpha: number) =>
  `radial-gradient(ellipse 191.29% 138.89% at 50.59% 100%, rgba(208, 31, 37, ${alpha}) 0%, rgba(208, 31, 37, 0) 50%)`;

/** Shared full-page shell: black + 15% black-to-#d01f25 wash (e.g. 29:988 主页). */
export const FIGMA_SHELL_BG =
  "linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(208, 31, 37, 0.15) 100%), linear-gradient(90deg, #000 0%, #000 100%)";

/** Flat screens without the glow image (库存 106:1782, 充值 29:1429, 历史记录 190:239). */
export const FIGMA_SOLID_PAGE_BG = "#1F1F1F";

/** Gift sheets / confirm / check-in panel: #1F1F1F + red radial at 50% (29:1585, 29:1704, 29:1781, 29:1797). */
export const FIGMA_SHEET_BG = `${RED_RADIAL(0.5)}, ${FIGMA_SOLID_PAGE_BG}`;

/** Auth modals: #1F1F1F + red radial at 25% (178:47 登录, 178:121 注册). */
export const FIGMA_AUTH_BG = `${RED_RADIAL(0.25)}, ${FIGMA_SOLID_PAGE_BG}`;

export function isSolidPageBg(pathname: string): boolean {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return (
    path === "/recharge" ||
    path === "/inventory" ||
    path === "/profile/history" ||
    path === "/gifts" ||
    path.startsWith("/gifts/")
  );
}
