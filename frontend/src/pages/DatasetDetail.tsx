import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { analysisApi, datasetApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import type { Dataset, DatasetColumn, DatasetPreview } from "../types";
import { ErrorState, LoadingState } from "../components/StateViews";
import { formatBytes, formatDate, formatPercent, statusBadgeClass } from "../utils/format";

export default function DatasetDetail() {
  const { id } = useParams();
  const datasetId = Number(id);
  const navigate = useNavigate();

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [columns, setColumns] = useState<DatasetColumn[]>([]);
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dsResp = await datasetApi.get(datasetId);
      setDataset(dsResp.data);

      if (dsResp.data.status === "valid" || dsResp.data.status === "analyzed") {
        const [colsResp, previewResp] = await Promise.all([
          datasetApi.columns(datasetId),
          datasetApi.preview(datasetId, 20),
        ]);
        setColumns(colsResp.data);
        setPreview(previewResp.data);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      await analysisApi.run(datasetId);
      navigate(`/datasets/${datasetId}/report`);
    } catch (err) {
      setAnalyzeError(getApiErrorMessage(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!dataset) return null;

  const canAnalyze = dataset.status === "valid" || dataset.status === "analyzed";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{dataset.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {dataset.original_filename} &middot; {formatBytes(dataset.file_size_bytes)} &middot; Uploaded{" "}
            {formatDate(dataset.created_at)}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadgeClass(dataset.status)}`}>
          {dataset.status}
        </span>
      </div>

      {dataset.status === "invalid" && (
        <ErrorState message={dataset.validation_error || "This dataset failed validation."} />
      )}

      {canAnalyze && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-brand-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {isAnalyzing ? "Running analysis..." : dataset.status === "analyzed" ? "Re-run analysis" : "Run analysis"}
          </button>
          {dataset.status === "analyzed" && (
            <>
              <button
                onClick={() => navigate(`/datasets/${datasetId}/report`)}
                className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-slate-50"
              >
                View latest report
              </button>
              <button
                onClick={() => navigate(`/datasets/${datasetId}/history`)}
                className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-slate-50"
              >
                View history
              </button>
            </>
          )}
        </div>
      )}
      {analyzeError && <ErrorState message={analyzeError} />}

      {columns.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Columns</h2>
          <div className="bg-white border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Missing</th>
                  <th className="px-4 py-2 font-medium">Unique</th>
                  <th className="px-4 py-2 font-medium">Constant</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {columns.map((col) => (
                  <tr key={col.name}>
                    <td className="px-4 py-2 font-medium">{col.name}</td>
                    <td className="px-4 py-2 text-slate-500">{col.detected_type}</td>
                    <td className="px-4 py-2">
                      {col.missing_count} ({formatPercent(col.missing_percentage)})
                    </td>
                    <td className="px-4 py-2">{col.unique_count}</td>
                    <td className="px-4 py-2">{col.is_constant ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview && (
        <div>
          <h2 className="text-lg font-semibold mb-3">
            Preview <span className="text-sm font-normal text-slate-400">({preview.total_rows} total rows)</span>
          </h2>
          <div className="bg-white border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  {preview.columns.map((c) => (
                    <th key={c} className="px-4 py-2 font-medium whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    {preview.columns.map((c) => (
                      <td key={c} className="px-4 py-2 whitespace-nowrap">
                        {row[c] === null || row[c] === undefined ? (
                          <span className="text-slate-300 italic">null</span>
                        ) : (
                          String(row[c])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
