import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { analysisApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { ErrorState, LoadingState } from "../components/StateViews";
import { formatDate, scoreColor } from "../utils/format";

export default function ReportComparison() {
  const [searchParams] = useSearchParams();
  const reportA = Number(searchParams.get("a"));
  const reportB = Number(searchParams.get("b"));

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Report Comparison</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportCard title={`Report #${data.report_a.id}`} date={data.report_a.created_at} score={data.report_a.quality_score} isOld={true} />
        <ReportCard title={`Report #${data.report_b.id}`} date={data.report_b.created_at} score={data.report_b.quality_score} isOld={false} />
      </div>

      <div className="glass-card p-8 text-center relative overflow-hidden">
        <div className={`absolute top-0 inset-x-0 h-1 ${data.improved ? "bg-emerald-500" : "bg-red-500"}`}></div>
        <p className="text-sm font-medium uppercase tracking-wider text-zinc-500 mb-2">Score Change</p>
        <p className={`text-5xl font-bold font-mono ${data.improved ? "text-emerald-500" : "text-red-500"} drop-shadow-md`}>
          {data.score_delta > 0 ? "+" : ""}
          {data.score_delta.toFixed(1)}
        </p>
        <p className="text-sm font-medium mt-3 text-zinc-400 bg-zinc-900/50 inline-block px-4 py-1.5 rounded-full border border-zinc-800">
          {data.improved ? (
            <span className="flex items-center gap-2"><svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg> Quality improved or stayed the same</span>
          ) : (
            <span className="flex items-center gap-2"><svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg> Quality deteriorated</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <IssueList 
          title="New issues" 
          issues={data.new_issues} 
          empty="No new issues introduced." 
          tone="text-red-400" 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          bg="bg-red-500/5"
          border="border-red-500/20"
        />
        <IssueList 
          title="Resolved issues" 
          issues={data.resolved_issues} 
          empty="No issues were resolved." 
          tone="text-emerald-400" 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
          bg="bg-emerald-500/5"
          border="border-emerald-500/20"
        />
      </div>
    </div>
  );
}

function ReportCard({ title, date, score, isOld }) {
  return (
    <div className={`glass-card p-6 relative overflow-hidden flex flex-col items-center border ${isOld ? 'border-zinc-800' : 'border-indigo-500/30'}`}>
      {!isOld && <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-bl-lg">NEWER</div>}
      <p className="font-semibold text-lg text-white mt-2">{title}</p>
      <p className="text-sm text-zinc-500 mb-4">{formatDate(date)}</p>
      <div className="w-full flex justify-center py-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
        <p className={`text-5xl font-bold font-mono ${scoreColor(score)} drop-shadow`}>{score.toFixed(0)}</p>
      </div>
    </div>
  );
}

function IssueList({
  title,
  issues,
  empty,
  tone,
  icon,
  bg,
  border
}) {
  return (
    <div className={`glass-card p-6 ${border}`}>
      <h2 className={`font-semibold text-lg flex items-center gap-2 mb-4 ${tone}`}>
        {icon}
        {title}
      </h2>
      {issues.length === 0 ? (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${bg} ${tone} border ${border}`}>
          <svg className="w-5 h-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <p className="text-sm font-medium">{empty}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {issues.map((issue) => (
            <li key={issue.code} className={`p-3 rounded-lg text-sm text-zinc-300 ${bg} border ${border} flex items-start gap-3`}>
              <span className="mt-0.5 shrink-0 opacity-70">{icon}</span>
              <span className="leading-relaxed">{issue.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
