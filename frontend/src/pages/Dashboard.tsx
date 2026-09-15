import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { datasetApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Dataset } from "../types";
import { ErrorState, LoadingState, EmptyState } from "../components/StateViews";
import { formatBytes, formatDate } from "../utils/format";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recentDatasets, setRecentDatasets] = useState<Dataset[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadRecent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await datasetApi.list({ page: 1, page_size: 10 });
      setRecentDatasets(resp.data.items);
      setTotalCount(resp.data.total);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    try {
      const resp = await datasetApi.upload(file, undefined, setUploadProgress);
      navigate(`/datasets/${resp.data.id}`);
    } catch (err) {
      setUploadError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const analyzedCount = recentDatasets.filter((d) => d.status === "analyzed").length;
  const lastAnalyzed = recentDatasets.find((d) => d.status === "analyzed");
  const totalRowsProcessed = recentDatasets.reduce((sum, d) => sum + (d.row_count || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Welcome back{user?.full_name ? `, ${user.full_name}` : ""}
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Automated Exploratory Data Analysis & Quality Assessment Platform</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-brand-600 hover:bg-brand-500 text-white rounded-lg px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 self-start md:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload New Dataset
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Total Datasets</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-white">{totalCount}</p>
        </div>

        <div className="glass-card p-5 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Analyses Completed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-white">{analyzedCount}</p>
        </div>

        <div className="glass-card p-5 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Total Rows Processed</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-white">{totalRowsProcessed.toLocaleString()}</p>
        </div>

        <div className="glass-card p-5 border border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Last Analyzed Dataset</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <p className="text-sm font-semibold text-white truncate" title={lastAnalyzed?.name || "None"}>
            {lastAnalyzed ? lastAnalyzed.name : "No analysis yet"}
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="glass-card p-1">
        <div className="border border-dashed border-zinc-700 hover:border-brand-500/50 rounded-xl p-8 text-center transition-all duration-300 bg-zinc-900/30 group">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:scale-105 group-hover:border-brand-500/30 transition-all duration-300">
            {isUploading ? (
              <svg className="animate-spin w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-6 h-6 text-zinc-400 group-hover:text-brand-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-white mb-1">
            {isUploading ? "Uploading & Processing..." : "Drop dataset here or browse"}
          </h3>
          <p className="text-xs text-zinc-400 mb-4 max-w-sm mx-auto">
            {isUploading 
              ? "Validating schema and storing dataset for automated profiling."
              : "Upload CSV or Excel files up to 25MB for instant quality scoring & EDA."}
          </p>
          
          {isUploading && (
            <div className="max-w-xs mx-auto w-full bg-zinc-800 rounded-full h-1.5 mb-4 overflow-hidden">
              <div 
                className="bg-brand-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-zinc-100 text-zinc-900 hover:bg-white rounded-lg px-6 py-2 text-xs font-semibold disabled:opacity-50 transition-all shadow"
          >
            {isUploading ? `${uploadProgress}% Complete` : "Choose File"}
          </button>
          
          {uploadError && (
            <div className="mt-4 text-left max-w-lg mx-auto">
              <ErrorState message={uploadError} />
            </div>
          )}
        </div>
      </div>

      {/* Recent Datasets Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Datasets
          </h2>
          <button onClick={() => navigate("/datasets")} className="text-xs text-brand-400 font-medium hover:text-brand-300 flex items-center gap-1 transition-colors">
            View All Datasets ({totalCount}) &rarr;
          </button>
        </div>

        {isLoading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!isLoading && !error && recentDatasets.length === 0 && (
          <EmptyState title="No datasets yet" description="Upload your first CSV or Excel file to get started." />
        )}
        {!isLoading && !error && recentDatasets.length > 0 && (
          <div className="glass-card overflow-hidden border border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 font-medium">Dataset Name</th>
                    <th className="px-5 py-3 font-medium">Size</th>
                    <th className="px-5 py-3 font-medium">Dimensions</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Uploaded</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {recentDatasets.map((ds) => (
                    <tr key={ds.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-zinc-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="truncate max-w-xs">{ds.name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono text-zinc-400">{formatBytes(ds.file_size_bytes)}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-zinc-400">
                        {ds.row_count != null && ds.column_count != null ? (
                          `${ds.row_count.toLocaleString()} rows × ${ds.column_count} cols`
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                          ds.status === 'analyzed' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 
                          ds.status === 'valid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          ds.status === 'failed' || ds.status === 'invalid' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {ds.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-400">{formatDate(ds.created_at)}</td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => navigate(`/datasets/${ds.id}`)}
                          className="text-xs px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                          View Data
                        </button>
                        {ds.status === "analyzed" && (
                          <button
                            onClick={() => navigate(`/datasets/${ds.id}/report`)}
                            className="text-xs px-3 py-1 rounded bg-brand-600/20 border border-brand-500/30 text-brand-300 hover:bg-brand-600/30 transition-colors"
                          >
                            View Report
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Quick Workflow Guide (only shown if datasets count is low) */}
      {recentDatasets.length <= 2 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-800/80 pt-6">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-brand-500/10 text-brand-400 font-bold text-xs flex items-center justify-center border border-brand-500/20 shrink-0">1</div>
            <div>
              <h4 className="text-sm font-medium text-white">Upload Dataset</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Drop CSV or Excel files for automatic validation and column parsing.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/20 shrink-0">2</div>
            <div>
              <h4 className="text-sm font-medium text-white">Automated Profiling</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Computes statistics, correlations, outliers, and data-quality scores.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-purple-500/10 text-purple-400 font-bold text-xs flex items-center justify-center border border-purple-500/20 shrink-0">3</div>
            <div>
              <h4 className="text-sm font-medium text-white">Interactive Insights</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Explore distributions, missingness, and compare historical reports.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
