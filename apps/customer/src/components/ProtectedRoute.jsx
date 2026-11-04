import { Navigate } from "react-router-dom";
import { hasCustomerSession } from "../config/bar";

export default function ProtectedRoute({ children }) {
    if (!hasCustomerSession()) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
