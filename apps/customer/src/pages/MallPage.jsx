import Header from "../components/header/header";

import Background from "../components/common/background";

import NavigationBar from "../components/common/NavigationBar";

import "../css/Global.css";

import "../css/Main.css";

const products = [
    {
        name: "IPHONE 17 PRO MAX",
        points: "5,000 pts",
        image: "/assets/image/mall/iphone17pm.png",
        category: "VIP",
    },
    {
        name: "GLACIER FUSION COCKTAIL",
        points: "2,000 pts",
        image: "/assets/image/mall/cocktail.png",
        category: "BEVERAGE",
    },
    {
        name: "HEINEKEN",
        points: "1,000 pts",
        image: "/assets/image/mall/heineken.png",
        category: "BEVERAGE",
        type: "heineken",
    },
];

function MallPage() {

    return (

        <div className="home-page">

            <Background />

            <div className="home-content">

                <Header showBack />

                {/* Title */}
                <div className="spinwheel-title mall-title mb-4">
                    MALL
                </div>

                {/* My Points */}
                <section className="mall-points mx-4">

                    <div className="mall-points-info">
                        <div className="infotitle">MY POINTS</div>
                        <div className="info">1,000 pts</div>
                    </div>

                    <img
                        src="/assets/image/daily_checkin/coin.png"
                        alt="Points"
                    />

                </section>

                {/* Category */}
                <div className="mall-categories d-flex justify-content-center mx-4">

                    <button className="mall-category active">
                        ALL
                    </button>

                    <button className="mall-category">
                        VIP
                    </button>

                    <button className="mall-category">
                        BEVERAGE
                    </button>

                </div>

                {/* Products */}
                <section className="mall-products mx-4">

                    {products.map((product) => (

                        <div
                            className="mall-product "
                            key={product.name}
                        >

                            <div className="mall-product-image-wrapper mb-2">
                                <div className="mall-product-glow"></div>
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className={`mall-product-image ${product.type || ""}`}
                                />
                                {product.name === "HEINEKEN" && (
                                    <img
                                        src="/assets/image/mall/hot.png"
                                        alt="Hot"
                                        className="mall-product-hot"
                                    />
                                )}
                                
                            </div>

                            <div className="gradient-label-red w-75">
                                <div className="mall-product-name text-nowrap py-2">
                                    {product.name}
                                </div>

                                <div className="mall-product-points">
                                    {product.points}
                                </div>
                            </div>
                            
                            <button className="mall-redeem-button w-75">
                                REDEEM THIS
                            </button>

                        </div>

                    ))}

                </section>
          

            </div>

            <NavigationBar active="mall" />

        </div>

    );

}

export default MallPage;