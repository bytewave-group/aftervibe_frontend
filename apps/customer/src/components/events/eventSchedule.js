const DEFAULT_EVENT_IMAGE = "/assets/image/home/speaker.png";

function parseDate(value) {
    if (!value) return null;

    const date = new Date(String(value).replace(" ", "T"));

    return Number.isNaN(date.getTime()) ? null : date;
}

// "EVERY FRIDAY 9 - 11PM" from the admin, else "AUG 1 9:00 PM" (+ end time / date)
export function formatEventSchedule(event) {
    if (event?.schedule_text) {
        return event.schedule_text;
    }

    const start = parseDate(event?.starts_at);
    const end = parseDate(event?.ends_at);

    if (!start) {
        return "";
    }

    const dateLabel = (date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
    const timeLabel = (date) => date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toUpperCase();

    if (!end) {
        return `${dateLabel(start)} ${timeLabel(start)}`;
    }

    return start.toDateString() === end.toDateString()
        ? `${dateLabel(start)} ${timeLabel(start)} - ${timeLabel(end)}`
        : `${dateLabel(start)} ${timeLabel(start)} - ${dateLabel(end)} ${timeLabel(end)}`;
}

export function eventImage(event) {
    return event?.image_url || DEFAULT_EVENT_IMAGE;
}
