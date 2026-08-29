import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { analysisApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import type { ReportComparisonResponse } from "../types";
import { ErrorState, LoadingState } from "../components/StateViews";
import { formatDate, scoreColor } from "../utils/format";

export default function ReportComparison() {
  const [searchParams] = useSearchParams();
  const reportA = Number(searchParams.get("a"));
  const reportB = Number(searchParams.get("b"));

  const [data, setData] = useState<ReportComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await analysisApi.compare(reportA, reportB);
        setData(resp.data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    if (reportA && reportB) load();
  }, [reportA, reportB]);

  if (isLoading) return <LoadingState label="Comparing reports..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Report Comparison</h1>

      <div className="grid grid-cols-2 gap-6">
        <ReportCard title={`Report #${data.report_a.id}`} date={data.report_a.created_at} score={data.report_a.quality_score} />
        <ReportCard title={`Report #${data.report_b.id}`} date={data.report_b.created_at} score={data.report_b.quality_score} />
      </div>

      <div className="bg-white border rounded-xl p-6 text-center">
        <p className="text-sm text-slate-500">Score change</p>
        <p className={`text-3xl font-bold mt-1 ${data.improved ? "text-emerald-600" : "text-red-600"}`}>
          {data.score_delta > 0 ? "+" : ""}
          {data.score_delta.toFixed(1)}
        </p>
        <p className="text-sm mt-1 text-slate-500">
          {data.improved ? "Quality improved or stayed the same" : "Quality deteriorated"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <IssueList title="New issues" issues={data.new_issues} empty="No new issues introduced." tone="text-red-600" />
        <IssueList title="Resolved issues" issues={data.resolved_issues} empty="No issues were resolved." tone="text-emerald-600" />
      </div>
    </div>
  );
}

function ReportCard({ title, date, score }: { title: string; date: string; score: number }) {
  return (
    <div className="bg-white border rounded-xl p-6 text-center">
      <p className="font-semibold">{title}</p>
      <p className="text-xs text-slate-400 mb-3">{formatDate(date)}</p>
      <p className={`text-4xl font-bold ${scoreColor(score)}`}>{score.toFixed(0)}</p>
    </div>
  );
}

function IssueList({
  title,
  issues,
  empty,
  tone,
}: {
  title: string;
  issues: { code: string; message: string }[];
  empty: string;
  tone: string;
}) {
  return (
    <div className="bg-white border rounded-xl p-6">
      <h2 className={`font-semibold mb-3 ${tone}`}>{title}</h2>
      {issues.length === 0 ? (
        <p className="text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {issues.map((issue) => (
            <li key={issue.code}>{issue.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
