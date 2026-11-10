import { Navigate, useLocation } from "react-router-dom";
import { hasCustomerSession, loginRoute } from "../config/bar";

export default function ProtectedRoute({ children }) {
    const location = useLocation();

    if (!hasCustomerSession()) {
        return <Navigate to={loginRoute(location.search)} replace />;
    }

    return children;
}
