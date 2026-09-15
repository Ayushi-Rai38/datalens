import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { analysisApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import type { QualityReportSummary } from "../types";
import { ErrorState, LoadingState, EmptyState } from "../components/StateViews";
import { formatDate, scoreColor } from "../utils/format";

export default function AnalysisHistory() {
  const { id } = useParams();
  const datasetId = Number(id);
  const navigate = useNavigate();

  const [items, setItems] = useState<QualityReportSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await analysisApi.history(datasetId, page, 10);
        setItems(resp.data.items);
        setTotalPages(resp.data.total_pages || 1);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [datasetId, page]);

  const toggleSelect = (reportId: number) => {
    setSelected((prev) => {
      if (prev.includes(reportId)) return prev.filter((id) => id !== reportId);
      if (prev.length >= 2) return [prev[1], reportId];
      return [...prev, reportId];
    });
  };

  const handleCompare = () => {
    if (selected.length === 2) {
      navigate(`/datasets/${datasetId}/compare?a=${selected[0]}&b=${selected[1]}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            Analysis History
          </h1>
          <p className="text-sm text-zinc-400 mt-2">Compare past reports to track data quality over time.</p>
        </div>
        <button
          onClick={handleCompare}
          disabled={selected.length !== 2}
          className="bg-brand-600 text-white rounded-lg px-5 py-2.5 text-sm font-semibold hover:bg-brand-500 disabled:opacity-40 transition-all shadow-lg flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Compare selected ({selected.length}/2)
        </button>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState title="No analysis runs yet" description="Run an analysis from the dataset detail page." />
      )}

      {!isLoading && !error && items.length > 0 && (
        <>
          <div className="glass-card divide-y divide-zinc-800">
            {items.map((report) => {
              const isSelected = selected.includes(report.id);
              return (
                <label 
                  key={report.id} 
                  className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-brand-500/10' : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="relative flex items-center justify-center w-5 h-5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(report.id)}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-zinc-600 bg-zinc-900/50 checked:border-brand-500 checked:bg-brand-500 transition-all"
                    />
                    <svg className="absolute w-3.5 h-3.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className={`font-semibold text-sm ${isSelected ? 'text-brand-400' : 'text-white'}`}>Report #{report.id}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{formatDate(report.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 block">Issues</span>
                        <span className="text-zinc-300 font-mono text-xs">{report.issue_count}</span>
                      </div>
                      <div className="text-right w-16">
                        <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 block">Score</span>
                        <span className={`text-base font-bold font-mono ${scoreColor(report.quality_score)}`}>
                          {report.quality_score.toFixed(0)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/datasets/${datasetId}/report`);
                        }}
                        className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                      >
                        View Report
                      </button>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-sm py-4">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage((p) => p - 1)} 
              className="px-4 py-2 border border-zinc-700 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-zinc-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 border border-zinc-700 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
