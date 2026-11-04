export default function RankBoard({ ranking, title = "TOP", fill = false, fontSize = 16 }) {

    const size = Number(fontSize) || 16;
    const bodySize = fill ? "2.4vh" : Math.round(size * 0.75);
    const titleSize = fill ? "4vh" : size;
    const iconSize = fill ? "3vh" : size;

    const rankIcons = [
        "./assets/icons/rank_crown.png",
        "./assets/icons/gem.png",
        "./assets/icons/star.png",
        "./assets/icons/star.png",
        "./assets/icons/star.png",
    ];

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                background: fill ? "transparent" : "rgba(0,0,0,.35)",
                borderRadius: fill ? 0 : 10,
                color: "#fff",
                padding: fill ? "4vh 6vh" : Math.max(8, Math.round(size * 0.5)),
                backdropFilter: fill ? "none" : "blur(6px)",
                fontSize: bodySize,
                display: "flex",
                flexDirection: "column",
            }}
        >
            <h3
                style={{
                    margin: fill ? "0 0 10px" : `0 0 ${Math.round(size * 0.4)}px`,
                    textAlign: "center",
                    fontSize: titleSize,
                    fontWeight: "bold",
                }}
            >
                {title}
            </h3>

            {ranking.length === 0 ? (
                <div style={{ textAlign: "center" }}>
                    No Ranking
                </div>
            ) : (
                ranking.map((user, index) => (
                    <div
                        key={index}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: fill ? "1.4vh 0" : `${Math.max(4, Math.round(size * 0.25))}px 0`,
                            borderBottom: "1px solid rgba(255,255,255,.15)",
                            fontSize: bodySize,
                        }}
                    >
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                            }}
                        >
                            <img
                                src={rankIcons[index]}
                                alt=""
                                style={{
                                    width: iconSize,
                                    height: iconSize,
                                    objectFit: "contain",
                                }}
                            />

                            {user.name}
                        </span>

                        <strong>
                            RM {user.amount}
                        </strong>
                    </div>
                ))
            )}
        </div>
    );

}