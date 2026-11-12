/* eslint-disable @next/next/no-img-element */
import { formatInteger } from "@/lib/format/datetime";
import type { RankEntry } from "./electron-bridge";

// Port of apps/customer/src/components/animation/RankBoard.jsx (non-fill mode used by the overlay).
const RANK_ICONS = [
  "/images/display/rank_crown.png",
  "/images/display/gem.png",
  "/images/display/star.png",
  "/images/display/star.png",
  "/images/display/star.png",
];

export function RankBoard({
  ranking,
  title = "TOP",
  fontSize = 16,
}: {
  ranking: RankEntry[];
  title?: string;
  fontSize?: number;
}) {
  const size = Number(fontSize) || 16;
  const bodySize = Math.round(size * 0.75);
  const iconSize = size;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        background: "rgba(0,0,0,.35)",
        borderRadius: 10,
        color: "#fff",
        padding: Math.max(8, Math.round(size * 0.5)),
        backdropFilter: "blur(6px)",
        fontSize: bodySize,
        lineHeight: 1.5,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h3
        style={{
          margin: `0 0 ${Math.round(size * 0.4)}px`,
          textAlign: "center",
          fontSize: size,
          fontWeight: "bold",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h3>

      {ranking.length === 0 ? (
        <div style={{ textAlign: "center" }}>No Ranking</div>
      ) : (
        ranking.slice(0, RANK_ICONS.length).map((user, index) => (
          <div
            key={`${index}-${user.name}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: `${Math.max(4, Math.round(size * 0.25))}px 0`,
              borderBottom: "1px solid rgba(255,255,255,.15)",
              fontSize: bodySize,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <img
                src={RANK_ICONS[index]}
                alt=""
                style={{ width: iconSize, height: iconSize, objectFit: "contain" }}
              />
              {user.name}
            </span>

            <strong style={{ display: "flex", alignItems: "center", gap: 3, fontWeight: "bolder" }}>
              {/* Was "RM {amount}" in the old app; the amount is diamonds. */}
              <img
                src="/images/diamond.png"
                alt=""
                style={{ width: bodySize, height: bodySize, objectFit: "contain" }}
              />
              {formatInteger(Number(user.amount) || 0)}
            </strong>
          </div>
        ))
      )}
    </div>
  );
}
