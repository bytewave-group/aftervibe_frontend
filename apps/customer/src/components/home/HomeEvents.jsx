import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "../events/EventCard";
import { customerFetch } from "../../config/customerApi";
import "../../css/Global.css";

const HOME_EVENT_LIMIT = 4;

function HomeEvents() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem("customer_token")) {
            return;
        }

        const load = async () => {
            try {
                const { ok, data } = await customerFetch("/customer/events");

                if (ok) {
                    setEvents((data.events || []).slice(0, HOME_EVENT_LIMIT));
                }
            } catch (error) {
                console.error("HOME EVENTS ERROR =", error);
            } finally {
                setLoaded(true);
            }
        };

        load();
    }, []);

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
                    <EventCard key={event.id} event={event} />
                ))}

                {loaded && events.length === 0 && (
                    <div className="mall-empty">No upcoming events.</div>
                )}
            </div>

        </section>
    );
}

export default HomeEvents;
