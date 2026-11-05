import { useNavigate } from "react-router-dom";
import { eventImage, formatEventSchedule } from "./eventSchedule";
import "../../css/Global.css";

function EventCard({ event }) {
    const navigate = useNavigate();

    return (
        <button
            type="button"
            className="home-event-card purple-pink-border"
            onClick={() => navigate(`/events/${event.id}`)}
        >
            <div className="home-event-icon">
                <img src={eventImage(event)} alt={event.title} />
            </div>

            <div className="home-event-info">
                <h3>{event.title}</h3>
                <p>{formatEventSchedule(event)}</p>
            </div>

            {event.is_hot && (
                <div className="home-event-decoration">
                    <img src="/assets/image/home/fire.png" alt="Hot" />
                </div>
            )}
        </button>
    );
}

export default EventCard;
