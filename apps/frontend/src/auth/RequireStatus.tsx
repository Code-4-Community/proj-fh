import { Navigate, Outlet } from "react-router-dom";
import { Status } from "../types";
import { useAuth } from "./authProvider";

function Forbidden() {
   return (
     <div>
        <h1>Forbidden</h1>
        <p>You don't have permission to view this page.</p>
     </div>
   )
}

export function RequireStatus( { allowed }: { allowed: Status[] }) {
    const { authState, user } = useAuth();

    if (authState === 'loading') {
        return <p>Loading...</p>;
    } else if (authState === 'error') {
        return <p>An error occurred while checking your account. Please try again later.</p>;
    } else if (authState === 'unauthenticated') {
        return <Navigate to="/login" replace />;
    } else if (authState === 'forbidden') {
        return <Forbidden />;
    }

    if (user && allowed.includes(user.status)) {
        return <Outlet />;
    }

    return <Forbidden />;
}