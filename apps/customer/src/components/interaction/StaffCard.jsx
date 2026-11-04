import "../../css/Gift.css";

export default function StaffCard({
    staff,
    selected,
    onClick
}) {
    return (
        <div className="d-flex justify-content-center">
            <button
                type="button"
                onClick={onClick}
                className={`staff-card ${selected ? "selected" : ""}`}
            >
                {/* Staff Avatar */}
                <div className="staff-card-avatar">
                    {staff.profile_image ? (
                        <img
                            src={staff.profile_image}
                            alt={staff.username}
                        />
                    ) : (
                        "👤"
                    )}
                </div>

                {/* Staff Name */}
                <div className="staff-card-name">
                    {staff.username}
                </div>
            </button>
        </div>
    );
}