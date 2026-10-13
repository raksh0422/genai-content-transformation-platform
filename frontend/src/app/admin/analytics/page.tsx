"use client";

import { useEffect, useState } from "react";
import {
  api,
  type OverviewKPI,
  type ChartsResponse,
} from "@/lib/api";
import {
  UserGrowthChart,
  DocumentUploadsChart,
  TransformationActivityChart,
  GenerationStatusChart,
  UserEngagementChart,
} from "@/components/admin/AdminCharts";

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "all", label: "All Time" },
];

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<string>("30d");
  const [overview, setOverview] = useState<OverviewKPI | null>(null);
  const [charts, setCharts] = useState<ChartsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (selectedRange: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, chartsData] = await Promise.all([
        api.admin.getOverview(selectedRange),
        api.admin.getCharts(selectedRange),
      ]);
      setOverview(overviewData);
      setCharts(chartsData);
    } catch (err: unknown) {
      console.error("Failed to load analytics deep-dive:", err);
      setError(err instanceof Error ? err.message : "Failed to load platform analytics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(range);
  }, [range]);

  const totalJobs =
    (overview?.successful_transformations ?? 0) +
    (overview?.failed_transformations ?? 0);
  const failureRate =
    totalJobs > 0
      ? (((overview?.failed_transformations ?? 0) / totalJobs) * 100).toFixed(1)
      : "0.0";
  const successRate =
    totalJobs > 0
      ? (((overview?.successful_transformations ?? 0) / totalJobs) * 100).toFixed(1)
      : "100.0";

  return (
    <div className="space-y-8 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E4E8E3]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202522] flex items-center gap-3">
            <span>Deep-Dive Platform Analytics</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EBF1ED] text-[#2E6A4F] border border-[#2E6A4F]/20">
              Aggregated Metrics
            </span>
          </h1>
          <p className="text-xs text-[#69736C] mt-1">
            System throughput, conversion funnels, job reliability, and user retention curves
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center p-1 bg-white border border-[#E4E8E3] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                id={`analytics-range-${opt.value}`}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  range === opt.value
                    ? "bg-[#315B46] text-white shadow-xs font-semibold"
                    : "text-[#69736C] hover:text-[#202522]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchData(range)}
            disabled={isLoading}
            className="p-2 bg-white hover:bg-[#F8F9F7] text-[#69736C] hover:text-[#202522] rounded-lg border border-[#E4E8E3] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors disabled:opacity-50"
            title="Refresh analytics"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? "animate-spin text-[#315B46]" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#A83232]/20 text-[#A83232] text-xs">
          {error}
        </div>
      )}

      {/* Performance & Quality Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E4E8E3] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-[10px] uppercase tracking-wider text-[#69736C] font-semibold">
            Success Rate
          </p>
          <p className="text-2xl font-bold text-[#2E6A4F] font-mono mt-2">
            {successRate}%
          </p>
          <p className="text-[10px] text-[#8C958E] mt-1 font-sans">
            {overview?.successful_transformations ?? 0} completed generations
          </p>
        </div>

        <div className="bg-white border border-[#E4E8E3] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-[10px] uppercase tracking-wider text-[#69736C] font-semibold">
            Error Frequency
          </p>
          <p className="text-2xl font-bold text-[#A83232] font-mono mt-2">
            {failureRate}%
          </p>
          <p className="text-[10px] text-[#8C958E] mt-1 font-sans">
            {overview?.failed_transformations ?? 0} failed generation tasks
          </p>
        </div>

        <div className="bg-white border border-[#E4E8E3] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-[10px] uppercase tracking-wider text-[#69736C] font-semibold">
            Upload Adoption
          </p>
          <p className="text-2xl font-bold text-[#202522] font-mono mt-2">
            {charts?.platform_usage.percentage_users_with_documents ?? 0}%
          </p>
          <p className="text-[10px] text-[#8C958E] mt-1 font-sans">
            Users with &ge; 1 ingested document
          </p>
        </div>

        <div className="bg-white border border-[#E4E8E3] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-[10px] uppercase tracking-wider text-[#69736C] font-semibold">
            Avg Inference Latency
          </p>
          <p className="text-2xl font-bold text-[#315B46] font-mono mt-2">
            {charts?.platform_usage.average_duration_seconds !== undefined
              ? `${charts.platform_usage.average_duration_seconds}s`
              : "instant"}
          </p>
          <p className="text-[10px] text-[#8C958E] mt-1 font-sans">
            End-to-end synthesis duration
          </p>
        </div>
      </div>

      {/* User Engagement (Daily/Monthly Active Users) */}
      <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#202522] flex items-center gap-2">
              <span>Active User Engagement Over Time</span>
              <span className="text-[10px] px-2 py-0.5 bg-[#EBF1ED] text-[#2E6A4F] rounded border border-[#2E6A4F]/20 font-medium">
                DAU / WAU Telemetry
              </span>
            </h2>
            <p className="text-[11px] text-[#69736C] mt-0.5">
              Unique authenticated users active during each time window interval
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="h-44 flex items-center justify-center text-xs text-[#8C958E] animate-pulse">
            Loading engagement timeline...
          </div>
        ) : (
          <UserEngagementChart data={charts?.user_engagement || []} />
        )}
      </div>

      {/* Grid: Growth & Ingestion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h2 className="text-sm font-bold text-[#202522]">Registration Trajectory</h2>
          <UserGrowthChart data={charts?.user_growth || []} />
        </div>

        <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h2 className="text-sm font-bold text-[#202522]">Document Ingestion Volume</h2>
          <DocumentUploadsChart data={charts?.document_uploads || []} />
        </div>
      </div>

      {/* Grid: Transformation Mix & Pipeline Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h2 className="text-sm font-bold text-[#202522]">Transformation Formats Mix</h2>
          <TransformationActivityChart data={charts?.transformation_activity || []} />
        </div>

        <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h2 className="text-sm font-bold text-[#202522]">Job Completion & Reliability</h2>
          <GenerationStatusChart data={charts?.generation_status || []} />
        </div>
      </div>

      {/* Detailed Type Breakdown Table */}
      <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div>
          <h2 className="text-sm font-bold text-[#202522]">Format Breakdown Detail</h2>
          <p className="text-[11px] text-[#69736C] mt-0.5">
            Volumetric usage by transformation output type
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E4E8E3] text-[10px] uppercase text-[#69736C] font-semibold tracking-wider">
                <th className="py-2.5 pl-2">Transformation Type</th>
                <th className="py-2.5">Key</th>
                <th className="py-2.5 text-right">Count</th>
                <th className="py-2.5 pr-2 text-right">Share of Platform Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8E3]">
              {(charts?.transformation_activity || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#8C958E]">
                    No transformation data recorded in this period.
                  </td>
                </tr>
              ) : (
                (charts?.transformation_activity || []).map((item) => (
                  <tr key={item.type} className="hover:bg-[#F8F9F7]/70 transition-colors">
                    <td className="py-3 pl-2 font-semibold text-[#202522]">{item.label}</td>
                    <td className="py-3 text-[#69736C] font-mono text-[11px]">{item.type}</td>
                    <td className="py-3 text-right font-bold text-[#202522] font-mono">{item.count}</td>
                    <td className="py-3 pr-2 text-right">
                      <span className="px-2 py-0.5 bg-[#F8F9F7] border border-[#E4E8E3] rounded text-[#202522] font-semibold font-mono text-[11px]">
                        {item.percentage}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
