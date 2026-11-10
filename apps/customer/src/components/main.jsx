import { Navigate, useLocation } from "react-router-dom";
import HomePage from "../pages/HomePage";
import { hasCustomerSession, loginRoute } from "../config/bar";

function Main() {
    const location = useLocation();

    if (!hasCustomerSession()) {
        return <Navigate to={loginRoute(location.search)} replace />;
    }

    return <HomePage />;
}

export default Main;
