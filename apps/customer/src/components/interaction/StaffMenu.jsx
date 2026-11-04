import StaffCard from "./StaffCard";

export default function StaffMenu({
    staffs,
    selectedStaff,
    onSelectStaff,
    giftMenuOpen,
}) {
    const enabledStaffs = staffs.filter(
        (staff) => staff.status === "enable"
    );

    return (
        <section>
            <div className="text-white text-center mb-3">
                <h5 className="mb-1">
                    Select Staff
                </h5>

                <div
                    style={{
                        fontSize: "13px",
                        color: "rgba(255,255,255,0.6)",
                    }}
                >
                    Choose who you want to send a gift to
                </div>
            </div>

            <div
                className={`staff-menu-container ${
                    giftMenuOpen ? "gift-open" : ""
                }`}
            >
                {enabledStaffs.map((staff) => (
                    <StaffCard
                        key={staff.id}
                        staff={staff}
                        selected={selectedStaff?.id === staff.id}
                        onClick={() => onSelectStaff(staff)}
                    />
                ))}
            </div>
        </section>
    );
}