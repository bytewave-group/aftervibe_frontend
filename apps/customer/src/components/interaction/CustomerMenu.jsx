import CustomerCard from "./CustomerCard";

export default function CustomerMenu({
    customers,
    selectedCustomer,
    onSelectCustomer,
    giftMenuOpen,
}) {
    return (
        <section>

            <div className="text-white text-center mb-3">
                <h5 className="mb-1">
                    Select Customer
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
                className={`customer-list-container ${
                    giftMenuOpen ? "gift-open" : ""
                }`}
            >

                {customers.map((customer) => (
                    <CustomerCard
                        key={customer.id}
                        customer={customer}
                        selected={
                            selectedCustomer?.id === customer.id
                        }
                        onClick={() =>
                            onSelectCustomer(customer)
                        }
                    />
                ))}

            </div>

        </section>
    );
}