import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Header from "../components/header/header";
import Background from "../components/common/Background";
import NavigationBar from "../components/common/NavigationBar";
import { eventImage, formatEventSchedule } from "../components/events/eventSchedule";
import { customerFetch } from "../config/customerApi";

import "../css/Global.css";
import "../css/Main.css";

function EventDetailPage() {
    const { eventId } = useParams();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const { ok, data } = await customerFetch(`/customer/events/${encodeURIComponent(eventId)}`);

                setEvent(ok ? data.event : null);
            } catch (error) {
                console.error("EVENT DETAIL ERROR =", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [eventId]);

    return (
        <div className="home-page">
            <Background />

            <div className="home-content">
                <Header showBack backTo="/events" />

                {loading ? (
                    <div className="mall-empty">Loading...</div>
                ) : !event ? (
                    <div className="mall-empty">This event is no longer available.</div>
                ) : (
                    <section className="event-detail mx-4">
                        <div className="event-detail-image purple-pink-border">
                            <img src={eventImage(event)} alt={event.title} />
                            {event.is_hot && (
                                <img src="/assets/image/home/fire.png" alt="Hot" className="event-detail-hot" />
                            )}
                        </div>

                        <h1 className="event-detail-title">{event.title}</h1>

                        {formatEventSchedule(event) && (
                            <div className="event-detail-row">
                                <i className="fa-regular fa-calendar"></i>
                                <span>{formatEventSchedule(event)}</span>
                            </div>
                        )}

                        {event.location && (
                            <div className="event-detail-row">
                                <i className="fa-solid fa-location-dot"></i>
                                <span>{event.location}</span>
                            </div>
                        )}

                        {event.description && (
                            <p className="event-detail-description">{event.description}</p>
                        )}
                    </section>
                )}
            </div>

            <NavigationBar active="events" />
        </div>
    );
}

export default EventDetailPage;
