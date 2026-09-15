import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { analysisApi, datasetApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import type { Dataset, DatasetColumn, DatasetPreview } from "../types";
import { ErrorState, LoadingState } from "../components/StateViews";
import { formatBytes, formatDate, formatPercent } from "../utils/format";

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
  const [columnSearch, setColumnSearch] = useState("");

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

  const filteredPreviewColumns = preview
    ? preview.columns.filter((c) => c.toLowerCase().includes(columnSearch.toLowerCase()))
    : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 glass-card p-6 border border-zinc-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{dataset.name}</h1>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
              dataset.status === 'valid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
              dataset.status === 'analyzed' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' :
              dataset.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
              'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {dataset.status.toUpperCase()}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400 font-mono">
            <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>{dataset.original_filename}</span>
            <span>&bull;</span>
            <span>{formatBytes(dataset.file_size_bytes)}</span>
            <span>&bull;</span>
            <span>{formatDate(dataset.created_at)}</span>
          </div>
        </div>

        {canAnalyze && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {dataset.status === "analyzed" && (
              <>
                <button
                  onClick={() => navigate(`/datasets/${datasetId}/report`)}
                  className="px-4 py-2.5 text-sm font-semibold border border-zinc-700 bg-zinc-800/50 text-white rounded-lg hover:bg-zinc-700 hover:border-zinc-600 transition-colors"
                >
                  View latest report
                </button>
                <button
                  onClick={() => navigate(`/datasets/${datasetId}/history`)}
                  className="px-4 py-2.5 text-sm font-semibold border border-zinc-700 bg-zinc-800/50 text-white rounded-lg hover:bg-zinc-700 hover:border-zinc-600 transition-colors"
                >
                  View history
                </button>
              </>
            )}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-brand-600 hover:bg-brand-500 text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {dataset.status === "analyzed" ? "Re-run analysis" : "Run analysis"}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {dataset.status === "invalid" && (
        <ErrorState message={dataset.validation_error || "This dataset failed validation."} />
      )}
      {analyzeError && <ErrorState message={analyzeError} />}

      {columns.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Columns Overview
          </h2>
          <div className="glass-card overflow-hidden border border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">Missing</th>
                    <th className="px-6 py-3 font-medium">Unique</th>
                    <th className="px-6 py-3 font-medium">Constant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {columns.map((col) => (
                    <tr key={col.name} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-white">{col.name}</td>
                      <td className="px-6 py-3.5 text-brand-400 font-mono text-xs">{col.detected_type}</td>
                      <td className="px-6 py-3.5 text-zinc-300">
                        {col.missing_count > 0 ? (
                          <span className="text-amber-400 font-mono text-xs">{col.missing_count} <span className="opacity-60">({formatPercent(col.missing_percentage)})</span></span>
                        ) : (
                          <span className="text-zinc-500 font-mono text-xs">0</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-zinc-300 font-mono text-xs">{col.unique_count.toLocaleString()}</td>
                      <td className="px-6 py-3.5">
                        {col.is_constant ? (
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs font-semibold">Yes</span>
                        ) : (
                          <span className="text-zinc-500 text-xs">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Data Preview
              <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                {preview.previewed_rows} of {preview.total_rows.toLocaleString()} rows
              </span>
            </h2>

            <div className="relative max-w-xs">
              <input
                type="text"
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                placeholder="Filter columns..."
                className="w-full rounded-lg bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          </div>

          <div className="glass-card overflow-hidden border border-zinc-800">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm text-left relative">
                <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 sticky top-0 z-10 shadow">
                  <tr>
                    {filteredPreviewColumns.map((c) => (
                      <th key={c} className="px-5 py-3 font-medium text-xs uppercase tracking-wider whitespace-nowrap bg-zinc-900">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-800/30 transition-colors font-mono text-xs text-zinc-300">
                      {filteredPreviewColumns.map((c) => (
                        <td key={c} className="px-5 py-2.5 whitespace-nowrap">
                          {row[c] === null || row[c] === undefined ? (
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-500 text-[10px] font-sans">&lt;null&gt;</span>
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
        </div>
      )}
    </div>
  );
}
