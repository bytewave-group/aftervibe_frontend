import { useNavigate } from "react-router-dom";


export default function AnimationTypeButton({ title, path }) {

    const navigate = useNavigate();

    return (
        <button
            className="send-button my-3"
            onClick={() => navigate(path, {viewTransition: true,})}
        >
            {title}
        </button>
    );
}