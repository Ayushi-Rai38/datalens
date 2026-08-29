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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analysis History</h1>
        <button
          onClick={handleCompare}
          disabled={selected.length !== 2}
          className="bg-brand-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-40"
        >
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
          <div className="bg-white border rounded-xl divide-y">
            {items.map((report) => (
              <label key={report.id} className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selected.includes(report.id)}
                  onChange={() => toggleSelect(report.id)}
                  className="h-4 w-4"
                />
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Report #{report.id}</p>
                    <p className="text-xs text-slate-400">{formatDate(report.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-xs text-slate-500">{report.issue_count} issue(s)</span>
                    <span className={`text-lg font-bold ${scoreColor(report.quality_score)}`}>
                      {report.quality_score.toFixed(0)}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border rounded-md disabled:opacity-40">
              Previous
            </button>
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border rounded-md disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
