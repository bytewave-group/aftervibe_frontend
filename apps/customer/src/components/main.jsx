import { Navigate } from "react-router-dom";
import HomePage from "../pages/HomePage";
import { hasCustomerSession } from "../config/bar";

function Main() {
    if (!hasCustomerSession()) {
        return <Navigate to="/login" replace />;
    }

    return <HomePage />;
}

export default Main;
