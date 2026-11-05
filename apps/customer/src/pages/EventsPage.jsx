import { useEffect, useState } from "react";

import Header from "../components/header/header";
import Background from "../components/common/Background";
import NavigationBar from "../components/common/NavigationBar";
import EventCard from "../components/events/EventCard";
import { customerFetch } from "../config/customerApi";

import "../css/Global.css";
import "../css/Main.css";

function EventsPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const { ok, data } = await customerFetch("/customer/events");

                if (ok) {
                    setEvents(data.events || []);
                }
            } catch (error) {
                console.error("EVENTS ERROR =", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    return (
        <div className="home-page">
            <Background />

            <div className="home-content">
                <Header showBack />

                <div className="spinwheel-title mb-4">EVENTS</div>

                <section className="home-events events-page-list">
                    <div className="home-events-list">
                        {loading && <div className="mall-empty">Loading...</div>}

                        {!loading && events.length === 0 && (
                            <div className="mall-empty">No upcoming events.</div>
                        )}

                        {events.map((event) => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                </section>
            </div>

            <NavigationBar active="events" />
        </div>
    );
}

export default EventsPage;
