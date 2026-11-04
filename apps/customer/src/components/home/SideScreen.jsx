import VideoPlayer from "../animation/VideoPlayer";

export default function SideScreen() {
    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <VideoPlayer />
        </div>
    );
}
