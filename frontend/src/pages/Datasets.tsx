import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { datasetApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import type { Dataset } from "../types";
import { ErrorState, LoadingState, EmptyState } from "../components/StateViews";
import { formatBytes, formatDate, statusBadgeClass } from "../utils/format";

const PAGE_SIZE = 10;

export default function Datasets() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<Dataset[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await datasetApi.list({ page, page_size: PAGE_SIZE, search: search || undefined });
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
  }, [page]);

  const handleSearchSubmit = () => {
    setPage(1);
    load();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleDelete = async (id: number) => {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Datasets</h1>
        <div>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-brand-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
          >
            {isUploading ? "Uploading..." : "Upload dataset"}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
          placeholder="Search by name..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button onClick={handleSearchSubmit} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-slate-50">
          Search
        </button>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState title="No datasets found" description="Try a different search, or upload a new dataset." />
      )}

      {!isLoading && !error && items.length > 0 && (
        <>
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Rows</th>
                  <th className="px-4 py-2 font-medium">Columns</th>
                  <th className="px-4 py-2 font-medium">Size</th>
                  <th className="px-4 py-2 font-medium">Uploaded</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((ds) => (
                  <tr key={ds.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/datasets/${ds.id}`)}>
                    <td className="px-4 py-2 font-medium">{ds.name}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadgeClass(ds.status)}`}>
                        {ds.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{ds.row_count ?? "-"}</td>
                    <td className="px-4 py-2">{ds.column_count ?? "-"}</td>
                    <td className="px-4 py-2">{formatBytes(ds.file_size_bytes)}</td>
                    <td className="px-4 py-2 text-slate-500">{formatDate(ds.created_at)}</td>
                    <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(ds.id)}
                        disabled={deletingId === ds.id}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        {deletingId === ds.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border rounded-md disabled:opacity-40"
            >
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
