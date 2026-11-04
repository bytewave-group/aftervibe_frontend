import { useNavigate } from "react-router-dom";
import "../../css/Global.css";

function HomeEvents() {
    const navigate = useNavigate();

    const events = [
        {
            key: "ladies-night",
            title: "LADIES NIGHT",
            date: "EVERY FRIDAY 9 - 11PM",
            image: "/assets/image/home/speaker.png",
            icon: "/assets/image/home/fire.png",
            path: "/events/ladies-night",
        },
        {
            key: "dance-all-night",
            title: "DANCE ALL NIGHT",
            date: "AUGUST 1 9PM",
            image: "/assets/image/home/speaker.png",
            icon: "",
            path: "/events/dance-all-night",
        },
        {
            key: "ladies-night",
            title: "LADIES NIGHT",
            date: "EVERY FRIDAY 9 - 11PM",
            image: "/assets/image/home/speaker.png",
            icon: "/assets/image/home/fire.png",
            path: "/events/ladies-night",
        },
        {
            key: "dance-all-night",
            title: "DANCE ALL NIGHT",
            date: "AUGUST 1 9PM",
            image: "/assets/image/home/speaker.png",
            icon: "",
            path: "/events/dance-all-night",
        },
    ];

    return (
        <section className="home-events ">

            <div className="home-events-header">
                <h2>UPCOMING EVENTS</h2>

                <button
                    type="button"
                    onClick={() => navigate("/events")}
                >
                    View All
                </button>
            </div>

            <div className="home-events-list">
                {events.map((event) => (
                    <button
                        key={event.key}
                        type="button"
                        className="home-event-card purple-pink-border"
                        onClick={() => navigate(event.path)}
                    >
                        <div className="home-event-icon">
                            <img
                                src={event.image}
                                alt={event.title}
                            />
                        </div>

                        <div className="home-event-info">
                            <h3>{event.title}</h3>
                            <p>{event.date}</p>
                        </div>

                        {event.icon && (
                            <div className="home-event-decoration">
                                <img src={event.icon}/>
                                
                            </div>
                        )}
                    </button>
                ))}
            </div>

        </section>
    );
}

export default HomeEvents;