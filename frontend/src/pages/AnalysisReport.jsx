import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { analysisApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { ErrorState, LoadingState } from "../components/StateViews";
import ScoreGauge from "../components/ScoreGauge";
import { formatDate, formatNumber, formatPercent } from "../utils/format";

export default function AnalysisReport() {
  const { id } = useParams();
  const datasetId = Number(id);
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  // Interactive Section States
  const [showAllMissing, setShowAllMissing] = useState(false);
  const [selectedCorrCol, setSelectedCorrCol] = useState("");
  const [selectedDistCol, setSelectedDistCol] = useState("");
  const [numSearch, setNumSearch] = useState("");
  const [catSearch, setCatSearch] = useState("");
  const [showFullMatrix, setShowFullMatrix] = useState(false);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await analysisApi.latest(datasetId);
      setReport(resp.data);

      const numCols = Object.keys(resp.data.numerical_stats || {});
      if (numCols.length > 0) {
        setSelectedCorrCol(numCols[0]);
        setSelectedDistCol(numCols[0]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId]);

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      const resp = await analysisApi.run(datasetId);
      setReport(resp.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsReanalyzing(false);
    }
  };

  if (isLoading) return <LoadingState label="Analyzing dataset & generating report..." />;
  if (error) return <ErrorState message={error} />;
  if (!report) return null;

  // Missing Values Processing
  const missingColumns = report.profiling_result.columns
    .filter((c) => c.missing_count > 0 || c.missing_percentage > 0)
    .sort((a, b) => b.missing_percentage - a.missing_percentage);

  const displayedMissing = showAllMissing ? missingColumns : missingColumns.slice(0, 10);

  // Numerical & Categorical entries
  const numEntries = Object.entries(report.numerical_stats || {}).filter(([col]) =>
    col.toLowerCase().includes(numSearch.toLowerCase())
  );
  const catEntries = Object.entries(report.categorical_stats || {}).filter(([col]) =>
    col.toLowerCase().includes(catSearch.toLowerCase())
  );
  const outlierEntries = Object.entries(report.outliers || {}).filter(([, v]) => !v.insufficient_data);

  // Numerical column names array
  const numColNames = Object.keys(report.numerical_stats || {});

  // Correlation for selected column
  const corrMatrix = report.correlation?.matrix || {};
  const selectedCorrValues = [];

  if (selectedCorrCol && corrMatrix[selectedCorrCol]) {
    Object.entries(corrMatrix[selectedCorrCol]).forEach(([targetCol, val]) => {
      if (targetCol !== selectedCorrCol && val !== null && val !== undefined) {
        selectedCorrValues.push({ column: targetCol, value: val });
      }
    });
  }

  const positiveCorrs = [...selectedCorrValues]
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const negativeCorrs = [...selectedCorrValues]
    .filter((c) => c.value < 0)
    .sort((a, b) => a.value - b.value)
    .slice(0, 5);

  // Dynamic Key Insights Generation (4-8 Insights)
  const insights = [];

  // Insight 1: Dimensions
  insights.push({
    title: "Dataset Dimensions",
    desc: `Contains ${report.profiling_result.row_count.toLocaleString()} rows and ${report.profiling_result.column_count} columns (${numColNames.length} numerical, ${Object.keys(report.categorical_stats || {}).length} categorical).`,
    type: "info",
  });

  // Insight 2: Duplicate Rows
  if (report.profiling_result.duplicate_row_count > 0) {
    insights.push({
      title: "Duplicate Rows Found",
      desc: `${report.profiling_result.duplicate_row_count.toLocaleString()} duplicate rows detected (${formatPercent(report.profiling_result.duplicate_row_percentage)} of dataset).`,
      type: report.profiling_result.duplicate_row_percentage > 5 ? "warning" : "info",
    });
  } else {
    insights.push({
      title: "No Duplicate Rows",
      desc: "Dataset contains 0 duplicate rows across all recorded fields.",
      type: "success",
    });
  }

  // Insight 3: Missing Values
  if (missingColumns.length > 0) {
    const highestMissing = missingColumns[0];
    insights.push({
      title: "Missing Data Concentration",
      desc: `${missingColumns.length} columns contain missing values. Highest missingness is in '${highestMissing.name}' (${formatPercent(highestMissing.missing_percentage)}).`,
      type: highestMissing.missing_percentage > 20 ? "warning" : "info",
    });
  } else {
    insights.push({
      title: "Complete Dataset",
      desc: "100% data completeness detected. No missing values across any column.",
      type: "success",
    });
  }

  // Insight 4: Outliers
  const colsWithOutliers = outlierEntries.filter(([, v]) => v.outlier_count > 0);
  if (colsWithOutliers.length > 0) {
    const totalOutliers = colsWithOutliers.reduce((sum, [, v]) => sum + v.outlier_count, 0);
    insights.push({
      title: "Statistical Outliers Identified",
      desc: `Detected ${totalOutliers.toLocaleString()} statistical outliers across ${colsWithOutliers.length} numerical columns using IQR methodology.`,
      type: "info",
    });
  }

  // Insight 5: Correlations
  if (report.correlation?.strong_pairs && report.correlation.strong_pairs.length > 0) {
    const topPair = report.correlation.strong_pairs[0];
    insights.push({
      title: "Strong Feature Correlation",
      desc: `Strongest relationship found between '${topPair.column_a}' and '${topPair.column_b}' (r = ${topPair.correlation.toFixed(2)}).`,
      type: "info",
    });
  }

  // Selected distribution stats
  const selectedDistStats = selectedDistCol ? report.numerical_stats?.[selectedDistCol] : null;
  const selectedDistOutlier = selectedDistCol ? report.outliers?.[selectedDistCol] : null;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 border border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Automated EDA & Quality Report</h1>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            Report ID #{report.id} &bull; Dataset #{report.dataset_id} &bull; Generated {formatDate(report.created_at)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-xs font-semibold border border-zinc-700 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Export
          </button>
          <button
            onClick={() => navigate(`/datasets/${datasetId}/history`)}
            className="px-4 py-2 text-xs font-semibold border border-zinc-700 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View History
          </button>
          <button
            onClick={handleReanalyze}
            disabled={isReanalyzing}
            className="px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors shadow flex items-center gap-1.5 disabled:opacity-50"
          >
            {isReanalyzing ? "Analyzing..." : "Re-run Analysis"}
          </button>
        </div>
      </div>

      {/* Score Gauge & Deductions Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex flex-col items-center justify-center relative overflow-hidden border border-zinc-800">
          <ScoreGauge score={report.quality_score} />
          <p className="text-xs font-semibold text-zinc-400 mt-4 uppercase tracking-widest">Data Quality Score</p>
        </div>

        <div className="md:col-span-2 glass-card p-6 border border-zinc-800 flex flex-col justify-between">
          <div>
            <h2 className="font-semibold text-base text-white mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Score Breakdown & Deductions
            </h2>
            {report.quality_issues.length === 0 ? (
              <div className="flex items-center gap-3 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs font-medium">100% Quality Rating: No data-quality penalties or anomalies detected.</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {report.quality_issues.map((issue) => (
                  <li key={issue.code} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs">
                    <span className={`shrink-0 font-mono font-bold px-2 py-0.5 rounded border ${
                      issue.severity === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      issue.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      -{issue.penalty.toFixed(1)}
                    </span>
                    <span className="text-zinc-300 leading-relaxed mt-0.5">{issue.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-4 italic border-t border-zinc-800/60 pt-2">
            Quality score represents automated assessment based on completeness, uniqueness, and statistical variance.
          </p>
        </div>
      </div>

      {/* Dataset Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <OverviewStat label="Total Rows" value={report.profiling_result.row_count.toLocaleString()} />
        <OverviewStat label="Total Columns" value={report.profiling_result.column_count} />
        <OverviewStat label="Duplicate Rows" value={report.profiling_result.duplicate_row_count.toLocaleString()} />
        <OverviewStat 
          label="Duplicate Ratio" 
          value={formatPercent(report.profiling_result.duplicate_row_percentage)} 
          highlight={report.profiling_result.duplicate_row_percentage > 5 ? 'text-amber-400' : 'text-emerald-400'} 
        />
      </div>

      {/* Missing Values Section (Horizontal Bar Chart) */}
      <div className="glass-card p-6 border border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h2 className="font-semibold text-base text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Missing Values Analysis
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {missingColumns.length === 0 
                ? "No missing values found across all columns." 
                : `Showing ${displayedMissing.length} of ${missingColumns.length} columns containing missing data.`}
            </p>
          </div>

          {missingColumns.length > 10 && (
            <button
              onClick={() => setShowAllMissing(!showAllMissing)}
              className="text-xs text-brand-400 font-medium hover:text-brand-300 self-start sm:self-auto"
            >
              {showAllMissing ? "Show Top 10" : `Show All (${missingColumns.length})`}
            </button>
          )}
        </div>

        {missingColumns.length === 0 ? (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium text-center">
            All columns are 100% complete with zero missing cells.
          </div>
        ) : (
          <div className="space-y-3">
            {displayedMissing.map((col) => (
              <div key={col.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white truncate max-w-xs">{col.name}</span>
                  <span className="font-mono text-zinc-400">
                    {col.missing_count.toLocaleString()} missing ({formatPercent(col.missing_percentage)})
                  </span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      col.missing_percentage > 50 ? "bg-red-500" : col.missing_percentage > 10 ? "bg-amber-500" : "bg-brand-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, col.missing_percentage))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Correlation Section */}
      {report.correlation?.available ? (
        <div className="glass-card p-6 border border-zinc-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-base text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                Top Feature Correlations
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Select a numerical target variable to inspect correlation strength.</p>
            </div>

            {numColNames.length > 0 && (
              <select
                value={selectedCorrCol}
                onChange={(e) => setSelectedCorrCol(e.target.value)}
                className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 max-w-xs"
              >
                {numColNames.map((col) => (
                  <option key={col} value={col}>Target: {col}</option>
                ))}
              </select>
            )}
          </div>

          {/* Positive vs Negative Correlations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Positive */}
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
              <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                Strongest Positive (+r)
              </h3>
              {positiveCorrs.length === 0 ? (
                <p className="text-xs text-zinc-500">No positive correlation pairs found.</p>
              ) : (
                <div className="space-y-2">
                  {positiveCorrs.map((item) => (
                    <div key={item.column} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-medium truncate max-w-[200px]">{item.column}</span>
                      <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        +{item.value.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Negative */}
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
              <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-3">
                Strongest Negative (-r)
              </h3>
              {negativeCorrs.length === 0 ? (
                <p className="text-xs text-zinc-500">No negative correlation pairs found.</p>
              ) : (
                <div className="space-y-2">
                  {negativeCorrs.map((item) => (
                    <div key={item.column} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-medium truncate max-w-[200px]">{item.column}</span>
                      <span className="font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        {item.value.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Collapsible Full Matrix */}
          <div className="border-t border-zinc-800/80 pt-4">
            <button
              onClick={() => setShowFullMatrix(!showFullMatrix)}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${showFullMatrix ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showFullMatrix ? "Hide Full Correlation Heatmap" : "View Full Correlation Heatmap"}
            </button>

            {showFullMatrix && (
              <div className="overflow-x-auto mt-4">
                <table className="text-xs font-mono border-collapse w-full">
                  <thead>
                    <tr>
                      <th className="p-2 border-b border-r border-zinc-800 bg-zinc-900 text-zinc-400 font-sans font-medium text-left">Variable</th>
                      {report.correlation.columns.map((c) => (
                        <th key={c} className="p-2 border-b border-zinc-800 bg-zinc-900 text-zinc-400 font-sans font-medium text-center">
                          {c.substring(0, 8)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.correlation.columns.map((rowCol) => (
                      <tr key={rowCol}>
                        <td className="p-2 border-r border-zinc-800 bg-zinc-900 font-sans font-medium text-zinc-300 truncate max-w-[120px]">{rowCol}</td>
                        {report.correlation.columns.map((colCol) => {
                          const val = report.correlation.matrix[rowCol]?.[colCol];
                          const intensity = val === null || val === undefined ? 0 : Math.abs(val);
                          let bgColor = "transparent";
                          let textColor = "#71717a";
                          if (val !== null && val !== undefined) {
                            const alpha = intensity * 0.7;
                            bgColor = val > 0 ? `rgba(99, 102, 241, ${alpha})` : `rgba(244, 63, 94, ${alpha})`;
                            textColor = intensity > 0.4 ? "#ffffff" : "#a1a1aa";
                          }
                          return (
                            <td
                              key={colCol}
                              className="p-2 text-center border-t border-l border-zinc-800/40"
                              style={{ backgroundColor: bgColor, color: textColor }}
                              title={`${rowCol} & ${colCol}: ${val?.toFixed(3)}`}
                            >
                              {val === null || val === undefined ? "-" : val.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Distribution Analysis Section */}
      {numColNames.length > 0 && (
        <div className="glass-card p-6 border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-base text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Distribution & Quartile Analysis
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Inspect statistical spread and quantiles for numerical features.</p>
            </div>

            <select
              value={selectedDistCol}
              onChange={(e) => setSelectedDistCol(e.target.value)}
              className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 max-w-xs"
            >
              {numColNames.map((col) => (
                <option key={col} value={col}>Column: {col}</option>
              ))}
            </select>
          </div>

          {selectedDistStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              <QuantileCard label="Minimum" value={formatNumber(selectedDistStats.min)} />
              <QuantileCard label="Q1 (25%)" value={formatNumber(selectedDistStats.q1)} />
              <QuantileCard label="Median (Q2)" value={formatNumber(selectedDistStats.median)} highlight="text-brand-400" />
              <QuantileCard label="Mean" value={formatNumber(selectedDistStats.mean)} />
              <QuantileCard label="Q3 (75%)" value={formatNumber(selectedDistStats.q3)} />
              <QuantileCard label="Maximum" value={formatNumber(selectedDistStats.max)} />
            </div>
          )}

          {selectedDistOutlier && (
            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400 font-sans">IQR Normal Bounds:</span>
              <span className="text-zinc-200">
                [{formatNumber(selectedDistOutlier.lower_bound)}, {formatNumber(selectedDistOutlier.upper_bound)}] &bull;{" "}
                <span className="text-rose-400 font-semibold">{selectedDistOutlier.outlier_count} Outliers Detected</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Numerical Statistics Table */}
      {numEntries.length > 0 && (
        <div className="glass-card p-6 border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-semibold text-base text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Numerical Statistics ({numEntries.length})
            </h2>

            <input
              type="text"
              value={numSearch}
              onChange={(e) => setNumSearch(e.target.value)}
              placeholder="Search column..."
              className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 max-w-xs"
            />
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-medium bg-zinc-900">Column</th>
                  <th className="px-4 py-3 font-medium bg-zinc-900">Mean</th>
                  <th className="px-4 py-3 font-medium bg-zinc-900">Std Dev</th>
                  <th className="px-4 py-3 font-medium bg-zinc-900">Min</th>
                  <th className="px-4 py-3 font-medium bg-zinc-900">Q1</th>
                  <th className="px-4 py-3 font-medium bg-zinc-900">Median</th>
                  <th className="px-4 py-3 font-medium bg-zinc-900">Q3</th>
                  <th className="px-4 py-3 font-medium bg-zinc-900">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                {numEntries.map(([col, stats]) => (
                  <tr key={col} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-sans font-medium text-white">{col}</td>
                    <td className="px-4 py-3">{formatNumber(stats.mean)}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatNumber(stats.std)}</td>
                    <td className="px-4 py-3">{formatNumber(stats.min)}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatNumber(stats.q1)}</td>
                    <td className="px-4 py-3 text-brand-300 font-semibold">{formatNumber(stats.median)}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatNumber(stats.q3)}</td>
                    <td className="px-4 py-3">{formatNumber(stats.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categorical Statistics Section */}
      {catEntries.length > 0 && (
        <div className="glass-card p-6 border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-semibold text-base text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10M7 17h10" /></svg>
              Categorical Overview ({catEntries.length})
            </h2>

            <input
              type="text"
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              placeholder="Search column..."
              className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 max-w-xs"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Column</th>
                  <th className="px-4 py-3 font-medium">Unique Values</th>
                  <th className="px-4 py-3 font-medium">Most Frequent Value</th>
                  <th className="px-4 py-3 font-medium">Top Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {catEntries.map(([col, stats]) => {
                  const topVal = stats.top_values?.[0];
                  return (
                    <tr key={col} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{col}</td>
                      <td className="px-4 py-3 font-mono text-zinc-400">{stats.unique_count?.toLocaleString() ?? "-"}</td>
                      <td className="px-4 py-3 font-mono text-cyan-400 truncate max-w-xs">{topVal ? topVal.value : "-"}</td>
                      <td className="px-4 py-3 font-mono text-zinc-400">
                        {topVal ? `${topVal.count.toLocaleString()} (${formatPercent(topVal.percentage)})` : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Outliers Section with IQR Explanation Banner */}
      {outlierEntries.length > 0 && (
        <div className="glass-card p-6 border border-zinc-800 space-y-4">
          <div>
            <h2 className="font-semibold text-base text-white flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              Statistical Outliers (IQR Method)
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Outliers identified using Interquartile Range methodology: Values residing outside <code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-300">[Q1 - 1.5×IQR, Q3 + 1.5×IQR]</code>. Note: Statistical extremes reflect variance and do not necessarily imply data corruption.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {outlierEntries.map(([col, v]) => (
              <div key={col} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
                <p className="font-semibold text-white text-xs truncate mb-2" title={col}>{col}</p>
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xl font-bold font-mono text-rose-400">{v.outlier_count.toLocaleString()}</span>
                    <span className="text-xs text-zinc-400">outliers</span>
                    <span className="text-xs font-mono text-rose-500/80 bg-rose-500/10 px-1.5 py-0.5 rounded">
                      ({formatPercent(v.outlier_percentage)})
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono mt-1">
                    Bounds: [{formatNumber(v.lower_bound)}, {formatNumber(v.upper_bound)}]
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Key Insights Section */}
      <div className="glass-card p-6 border border-zinc-800 space-y-4">
        <h2 className="font-semibold text-base text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          Automated Key Insights
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((ins, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                ins.type === "warning" ? "bg-amber-400" : ins.type === "success" ? "bg-emerald-400" : "bg-brand-400"
              }`} />
              <div>
                <h4 className="text-xs font-semibold text-white">{ins.title}</h4>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{ins.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewStat({ label, value, highlight = "text-white" }) {
  return (
    <div className="glass-card p-4 border border-zinc-800">
      <p className="text-zinc-400 text-[11px] font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-bold text-xl ${highlight} font-mono`}>{value}</p>
    </div>
  );
}

function QuantileCard({ label, value, highlight = "text-zinc-200" }) {
  return (
    <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 text-center">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-medium">{label}</p>
      <p className={`font-mono text-sm font-semibold ${highlight}`}>{value}</p>
    </div>
  );
}
