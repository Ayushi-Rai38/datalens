import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { datasetApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { ErrorState, LoadingState, EmptyState } from "../components/StateViews";
import { formatBytes, formatDate } from "../utils/format";

const PAGE_SIZE = 10;

export default function Datasets() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statusParam = statusFilter !== "all" ? statusFilter : undefined;
      const resp = await datasetApi.list({ page, page_size: PAGE_SIZE, search: search || undefined, status: statusParam });
      setItems(resp.data.items);
      setTotalPages(resp.data.total_pages || 1);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleSearchSubmit = () => {
    setPage(1);
    load();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const resp = await datasetApi.upload(file);
      navigate(`/datasets/${resp.data.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await datasetApi.remove(id);
      setItems((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Datasets</h1>
          <p className="text-zinc-400 mt-1">Manage and inspect your uploaded files and automated reports.</p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-brand-600 hover:bg-brand-500 text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            {isUploading ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
            {isUploading ? "Uploading..." : "Upload Dataset"}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
            placeholder="Search dataset name..."
            className="w-full rounded-lg bg-zinc-900/60 border border-zinc-800 pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg bg-zinc-900/60 border border-zinc-800 px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          >
            <option value="all">All Statuses</option>
            <option value="analyzed">Analyzed</option>
            <option value="valid">Valid</option>
            <option value="uploaded">Uploaded</option>
            <option value="failed">Failed</option>
          </select>

          <button 
            onClick={handleSearchSubmit} 
            className="px-4 py-2 text-sm font-semibold border border-zinc-700 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition-all shadow-sm"
          >
            Search
          </button>
        </div>
      </div>

      {isLoading && <LoadingState label="Loading datasets..." />}
      {error && <ErrorState message={error} />}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState title="No datasets found" description="Try adjusting your search filter or upload a new CSV or Excel file." />
      )}

      {!isLoading && !error && items.length > 0 && (
        <>
          <div className="glass-card overflow-hidden border border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-medium">Dataset Name</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Rows</th>
                    <th className="px-6 py-3 font-medium">Cols</th>
                    <th className="px-6 py-3 font-medium">File Size</th>
                    <th className="px-6 py-3 font-medium">Uploaded</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {items.map((ds) => (
                    <tr 
                      key={ds.id} 
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td 
                        className="px-6 py-3.5 font-medium text-white group-hover:text-brand-400 cursor-pointer transition-colors max-w-xs truncate"
                        onClick={() => navigate(`/datasets/${ds.id}`)}
                      >
                        {ds.name}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                          ds.status === 'analyzed' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : 
                          ds.status === 'valid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          ds.status === 'failed' || ds.status === 'invalid' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {ds.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-zinc-400 font-mono text-xs">{ds.row_count != null ? ds.row_count.toLocaleString() : "-"}</td>
                      <td className="px-6 py-3.5 text-zinc-400 font-mono text-xs">{ds.column_count ?? "-"}</td>
                      <td className="px-6 py-3.5 text-zinc-400 font-mono text-xs">{formatBytes(ds.file_size_bytes)}</td>
                      <td className="px-6 py-3.5 text-zinc-400 text-xs">{formatDate(ds.created_at)}</td>
                      <td className="px-6 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => navigate(`/datasets/${ds.id}`)}
                          className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                          View Data
                        </button>
                        {ds.status === "analyzed" && (
                          <button
                            onClick={() => navigate(`/datasets/${ds.id}/report`)}
                            className="text-xs px-2.5 py-1 rounded bg-brand-600/20 border border-brand-500/30 text-brand-300 hover:bg-brand-600/30 transition-colors"
                          >
                            View Report
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(ds.id)}
                          disabled={deletingId === ds.id}
                          className="text-xs px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete dataset"
                        >
                          {deletingId === ds.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs py-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3.5 py-1.5 border border-zinc-700 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-zinc-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3.5 py-1.5 border border-zinc-700 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
