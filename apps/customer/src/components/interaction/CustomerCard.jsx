import "../../css/Gift.css";

export default function CustomerCard({
    customer,
    selected,
    onClick
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`customer-list-item ${
                selected ? "selected" : ""
            }`}
        >
            <div className="customer-list-avatar">
                {customer.profile_image ? (
                    <img
                        src={customer.profile_image}
                        alt={customer.username}
                    />
                ) : (
                    "👤"
                )}
            </div>

            <div className="customer-list-name">
                {customer.username}
            </div>
        </button>
    );
}