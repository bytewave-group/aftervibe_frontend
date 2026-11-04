import RankPage from "./RankPage";
import VideoPlayer from "../animation/VideoPlayer";
import VisualEffect from "../home/VisualEffect";
import { useSearchParams } from "react-router-dom";

export default function Screen() {
    const [searchParams] = useSearchParams();
    const displayId = searchParams.get("display_id");

    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <VideoPlayer displayId={displayId} />
            <RankPage displayId={displayId} />
            <VisualEffect />
        </div>
    );
}