import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import RankPage from "./RankPage";

export default function OverlayScreen() {
    const [searchParams] = useSearchParams();
    const displayId = searchParams.get("display_id");

    useEffect(() => {
        const nodes = [
            document.documentElement,
            document.body,
            document.getElementById("app"),
        ].filter(Boolean);

        const previous = nodes.map((node) => ({
            background: node.style.background,
            backgroundColor: node.style.backgroundColor,
        }));

        nodes.forEach((node) => {
            node.style.background = "transparent";
            node.style.backgroundColor = "transparent";
        });

        return () => {
            nodes.forEach((node, index) => {
                node.style.background = previous[index].background;
                node.style.backgroundColor = previous[index].backgroundColor;
            });
        };
    }, []);

    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                position: "relative",
                overflow: "hidden",
                background: "transparent",
            }}
        >
            <RankPage displayId={displayId} />
        </div>
    );
}
