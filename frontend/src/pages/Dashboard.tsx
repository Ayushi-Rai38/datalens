import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { datasetApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Dataset } from "../types";
import { ErrorState, LoadingState, EmptyState } from "../components/StateViews";
import { formatBytes, formatDate, statusBadgeClass } from "../utils/format";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recentDatasets, setRecentDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadRecent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await datasetApi.list({ page: 1, page_size: 5 });
      setRecentDatasets(resp.data.items);
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome{user?.full_name ? `, ${user.full_name}` : ""}</h1>
        <p className="text-slate-500 mt-1">Upload a dataset to get an automated data-quality report.</p>
      </div>

      <div className="bg-white border rounded-xl p-8 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-brand-600 text-white rounded-md px-6 py-3 text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {isUploading ? `Uploading... ${uploadProgress}%` : "Upload CSV or Excel dataset"}
        </button>
        <p className="text-xs text-slate-400 mt-3">Supported formats: .csv, .xlsx, .xls (max 25MB)</p>
        {uploadError && (
          <div className="mt-4 text-left">
            <ErrorState message={uploadError} />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent datasets</h2>
          <button onClick={() => navigate("/datasets")} className="text-sm text-brand-600 font-medium">
            View all
          </button>
        </div>

        {isLoading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!isLoading && !error && recentDatasets.length === 0 && (
          <EmptyState title="No datasets yet" description="Upload your first CSV or Excel file to get started." />
        )}
        {!isLoading && !error && recentDatasets.length > 0 && (
          <div className="bg-white border rounded-xl divide-y">
            {recentDatasets.map((ds) => (
              <button
                key={ds.id}
                onClick={() => navigate(`/datasets/${ds.id}`)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-sm">{ds.name}</p>
                  <p className="text-xs text-slate-400">
                    {ds.row_count ?? "-"} rows &middot; {ds.column_count ?? "-"} cols &middot; {formatBytes(ds.file_size_bytes)} &middot;{" "}
                    {formatDate(ds.created_at)}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadgeClass(ds.status)}`}>
                  {ds.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
