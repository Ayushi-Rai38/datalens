import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analysisApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import type { QualityReport } from "../types";
import { ErrorState, LoadingState } from "../components/StateViews";
import ScoreGauge from "../components/ScoreGauge";
import { formatDate, formatNumber, formatPercent, severityBadgeClass } from "../utils/format";

export default function AnalysisReport() {
  const { id } = useParams();
  const datasetId = Number(id);
  const navigate = useNavigate();

  const [report, setReport] = useState<QualityReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await analysisApi.latest(datasetId);
        setReport(resp.data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [datasetId]);

  if (isLoading) return <LoadingState label="Loading report..." />;
  if (error) return <ErrorState message={error} />;
  if (!report) return null;

  const missingData = report.profiling_result.columns.map((c) => ({
    name: c.name,
    missing: c.missing_percentage,
  }));

  const outlierEntries = Object.entries(report.outliers).filter(([, v]) => !v.insufficient_data);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analysis Report</h1>
          <p className="text-sm text-slate-500 mt-1">Generated {formatDate(report.created_at)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/datasets/${datasetId}/history`)}
            className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-slate-50"
          >
            History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border rounded-xl p-6 flex flex-col items-center justify-center">
          <ScoreGauge score={report.quality_score} />
          <p className="text-sm text-slate-500 mt-3">Data Quality Score</p>
        </div>

        <div className="md:col-span-2 bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-3">Why this score?</h2>
          {report.quality_issues.length === 0 ? (
            <p className="text-sm text-emerald-600">No significant data-quality issues were detected.</p>
          ) : (
            <ul className="space-y-2">
              {report.quality_issues.map((issue) => (
                <li key={issue.code} className="flex items-start gap-3 text-sm">
                  <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${severityBadgeClass(issue.severity)}`}>
                    -{issue.penalty.toFixed(1)}
                  </span>
                  <span className="text-slate-700">{issue.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-1">Dataset Overview</h2>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <Stat label="Rows" value={report.profiling_result.row_count} />
            <Stat label="Columns" value={report.profiling_result.column_count} />
            <Stat label="Duplicate rows" value={report.profiling_result.duplicate_row_count} />
            <Stat label="Duplicate %" value={formatPercent(report.profiling_result.duplicate_row_percentage)} />
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-3">Missing Values by Column</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={missingData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Bar dataKey="missing" radius={[4, 4, 0, 0]}>
                {missingData.map((entry, i) => (
                  <Cell key={i} fill={entry.missing > 50 ? "#dc2626" : entry.missing > 10 ? "#d97706" : "#4f6df5"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {Object.keys(report.numerical_stats).length > 0 && (
        <div className="bg-white border rounded-xl p-6 overflow-x-auto">
          <h2 className="font-semibold mb-3">Numerical Statistics</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pr-4 py-1 font-medium">Column</th>
                <th className="pr-4 py-1 font-medium">Mean</th>
                <th className="pr-4 py-1 font-medium">Std</th>
                <th className="pr-4 py-1 font-medium">Min</th>
                <th className="pr-4 py-1 font-medium">Median</th>
                <th className="pr-4 py-1 font-medium">Max</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(report.numerical_stats).map(([col, stats]) => (
                <tr key={col}>
                  <td className="pr-4 py-1.5 font-medium">{col}</td>
                  <td className="pr-4 py-1.5">{formatNumber(stats.mean)}</td>
                  <td className="pr-4 py-1.5">{formatNumber(stats.std)}</td>
                  <td className="pr-4 py-1.5">{formatNumber(stats.min)}</td>
                  <td className="pr-4 py-1.5">{formatNumber(stats.median)}</td>
                  <td className="pr-4 py-1.5">{formatNumber(stats.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {outlierEntries.length > 0 && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-3">Outliers (IQR method)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {outlierEntries.map(([col, v]) => (
              <div key={col} className="border rounded-lg px-4 py-3 text-sm">
                <p className="font-medium">{col}</p>
                <p className="text-slate-500">
                  {v.outlier_count} outliers ({formatPercent(v.outlier_percentage)}) &middot; bounds [
                  {formatNumber(v.lower_bound)}, {formatNumber(v.upper_bound)}]
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.correlation.available ? (
        <div className="bg-white border rounded-xl p-6 overflow-x-auto">
          <h2 className="font-semibold mb-3">Correlation Matrix</h2>
          <table className="text-sm border-collapse">
            <thead>
              <tr>
                <th className="p-2"></th>
                {report.correlation.columns.map((c) => (
                  <th key={c} className="p-2 font-medium text-slate-500">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.correlation.columns.map((rowCol) => (
                <tr key={rowCol}>
                  <td className="p-2 font-medium text-slate-500">{rowCol}</td>
                  {report.correlation.columns.map((colCol) => {
                    const value = report.correlation.matrix[rowCol]?.[colCol];
                    const intensity = value === null || value === undefined ? 0 : Math.abs(value);
                    return (
                      <td
                        key={colCol}
                        className="p-2 text-center"
                        style={{ backgroundColor: `rgba(79, 109, 245, ${intensity})`, color: intensity > 0.5 ? "white" : "black" }}
                      >
                        {value === null || value === undefined ? "-" : value.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-6 text-sm text-slate-500">
          Correlation not available: {report.correlation.reason}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-slate-400 text-xs">{label}</p>
      <p className="font-semibold text-lg">{value}</p>
    </div>
  );
}
