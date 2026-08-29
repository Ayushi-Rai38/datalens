import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingState } from "./StateViews";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingState label="Checking your session..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
