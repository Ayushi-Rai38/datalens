import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Datasets from "./pages/Datasets";
import DatasetDetail from "./pages/DatasetDetail";
import AnalysisReport from "./pages/AnalysisReport";
import AnalysisHistory from "./pages/AnalysisHistory";
import ReportComparison from "./pages/ReportComparison";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/datasets" element={<Datasets />} />
        <Route path="/datasets/:id" element={<DatasetDetail />} />
        <Route path="/datasets/:id/report" element={<AnalysisReport />} />
        <Route path="/datasets/:id/history" element={<AnalysisHistory />} />
        <Route path="/datasets/:id/compare" element={<ReportComparison />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
