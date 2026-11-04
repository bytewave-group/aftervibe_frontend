import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "../../config/api";
import AnimationSendButton from "../../components/animation/AnimationSendButton";

function FullScreenPage() {
    const navigate = useNavigate();
    const [animations, setAnimations] = useState([]);

    useEffect(() => {
        fetch(`${getApiUrl()}/api/animations/fullscreen`)
            .then((response) => response.json())
            .then((data) => {
                setAnimations(data.animations);
            });
    }, []);
    


    return (
        <div className="home-page py-5">
            <div className="back-button">
                <img
                    src="/assets/icons/back_white.png"
                    alt="Back"
                    onClick={() => navigate("/")}
                />
            </div>

            <div className="animation_title col-md-10 col-lg-6 text-start">FullScreen Page</div>

            <div className="mt-5 d-flex justify-content-center align-item-center flex-wrap">
                {animations.map((animation) => (
                        <AnimationSendButton
                            key={animation.id}
                            title={animation.name}
                        />
                    ))}
            </div>
        </div>

    );
}

export default FullScreenPage;