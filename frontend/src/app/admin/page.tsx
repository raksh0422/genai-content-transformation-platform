"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  type OverviewKPI,
  type ChartsResponse,
  type ActivityLogItem,
} from "@/lib/api";
import {
  UserGrowthChart,
  DocumentUploadsChart,
  TransformationActivityChart,
  GenerationStatusChart,
} from "@/components/admin/AdminCharts";

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "all", label: "All Time" },
];

export default function AdminOverviewPage() {
  const [range, setRange] = useState<string>("30d");
  const [overview, setOverview] = useState<OverviewKPI | null>(null);
  const [charts, setCharts] = useState<ChartsResponse | null>(null);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [activityTotal, setActivityTotal] = useState<number>(0);
  const [activityOffset, setActivityOffset] = useState<number>(0);
  const [activityLoading, setActivityLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (selectedRange: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [overviewData, chartsData, activityData] = await Promise.all([
        api.admin.getOverview(selectedRange),
        api.admin.getCharts(selectedRange),
        api.admin.getActivity({ limit: 10, offset: 0 }),
      ]);
      setOverview(overviewData);
      setCharts(chartsData);
      setActivities(activityData.items);
      setActivityTotal(activityData.total);
      setActivityOffset(0);
    } catch (err: unknown) {
      console.error("Failed to load admin overview:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load admin overview metrics. Please ensure server is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreActivity = async (newOffset: number) => {
    setActivityLoading(true);
    try {
      const res = await api.admin.getActivity({ limit: 10, offset: newOffset });
      setActivities(res.items);
      setActivityOffset(newOffset);
      setActivityTotal(res.total);
    } catch (err) {
      console.error("Failed to load activities:", err);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    fetchData(range);
  }, [range]);

  return (
    <div className="space-y-8 animate-fade-in pb-12 font-sans">
      {/* Page Header & Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E4E8E3]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202522] flex items-center gap-3">
            <span>Platform Overview</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EBF1ED] text-[#2E6A4F] border border-[#2E6A4F]/20">
              Live Telemetry
            </span>
          </h1>
          <p className="text-xs text-[#69736C] mt-1">
            Real-time multi-tenant analytics, system health, and processing throughput
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <div className="inline-flex items-center p-1 bg-white border border-[#E4E8E3] rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRange(opt.value)}
                id={`range-filter-${opt.value}`}
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

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchData(range)}
            disabled={isLoading}
            id="refresh-overview-btn"
            title="Refresh metrics"
            className="p-2 bg-white hover:bg-[#F8F9F7] text-[#69736C] hover:text-[#202522] rounded-lg border border-[#E4E8E3] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? "animate-spin text-[#315B46]" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-[#FDF2F2] border border-[#A83232]/20 text-[#A83232] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#A83232] shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1-9a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchData(range)}
            className="px-2.5 py-1 bg-[#A83232]/10 hover:bg-[#A83232]/20 text-[#A83232] rounded font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 1. KPI Cards Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Users"
          icon="user"
          value={overview?.total_users ?? 0}
          changePercent={overview?.users_change_percent}
          isLoading={isLoading}
        />
        <KPICard
          title="Active Users"
          icon="activity"
          value={overview?.active_users ?? 0}
          changePercent={overview?.active_users_change_percent}
          subtitle="Last 30 days"
          isLoading={isLoading}
        />
        <KPICard
          title="Total Documents"
          icon="document"
          value={overview?.total_documents ?? 0}
          changePercent={overview?.documents_change_percent}
          isLoading={isLoading}
        />
        <KPICard
          title="Total Transforms"
          icon="sparkles"
          value={overview?.total_transformations ?? 0}
          changePercent={overview?.transformations_change_percent}
          isLoading={isLoading}
        />
        <KPICard
          title="Successful"
          icon="check"
          value={overview?.successful_transformations ?? 0}
          changePercent={overview?.successful_change_percent}
          highlight="success"
          isLoading={isLoading}
        />
        <KPICard
          title="Failed"
          icon="cross"
          value={overview?.failed_transformations ?? 0}
          changePercent={overview?.failed_change_percent}
          highlight="danger"
          isLoading={isLoading}
        />
      </div>

      {/* ── 2. Platform Utilization Ratios ─────────────────────────────────── */}
      {charts?.platform_usage && (
        <div className="bg-white border border-[#E4E8E3] rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
            <p className="text-[#69736C] text-[10px] uppercase font-semibold tracking-wider">Avg Transforms / User</p>
            <p className="text-xl font-bold font-mono text-[#202522] mt-1">
              {charts.platform_usage.average_transformations_per_user}
            </p>
          </div>
          <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
            <p className="text-[#69736C] text-[10px] uppercase font-semibold tracking-wider">User Upload Adoption</p>
            <p className="text-xl font-bold font-mono text-[#202522] mt-1">
              {charts.platform_usage.percentage_users_with_documents}%
            </p>
          </div>
          <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
            <p className="text-[#69736C] text-[10px] uppercase font-semibold tracking-wider">Avg Processing Time</p>
            <p className="text-xl font-bold font-mono text-[#202522] mt-1">
              {charts.platform_usage.average_duration_seconds > 0
                ? `${charts.platform_usage.average_duration_seconds}s`
                : "instant"}
            </p>
          </div>
          <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
            <p className="text-[#69736C] text-[10px] uppercase font-semibold tracking-wider">Top Transformation</p>
            <p className="text-sm font-bold text-[#315B46] mt-2 capitalize truncate">
              {charts.platform_usage.top_transformation_type?.replace(/_/g, " ") || "None"}
            </p>
          </div>
        </div>
      )}

      {/* ── 3. Visual Analytics Charts Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#202522] flex items-center gap-2">
                <span>User Registrations</span>
                <span className="text-[10px] text-[#69736C] font-normal px-1.5 py-0.5 bg-[#F8F9F7] border border-[#E4E8E3] rounded">Cumulative</span>
              </h2>
              <p className="text-[11px] text-[#69736C] mt-0.5">
                New account onboarding trajectory across {range}
              </p>
            </div>
            <Link
              href="/admin/users"
              className="text-[11px] font-medium text-[#315B46] hover:text-[#264936] transition-colors"
            >
              View users &rarr;
            </Link>
          </div>
          {isLoading ? (
            <div className="h-56 flex items-center justify-center text-xs text-[#8C958E] animate-pulse">
              Loading user growth metrics...
            </div>
          ) : (
            <UserGrowthChart data={charts?.user_growth || []} />
          )}
        </div>

        {/* Document Uploads Chart */}
        <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#202522] flex items-center gap-2">
                <span>Document Ingestion</span>
                <span className="text-[10px] text-[#69736C] font-normal px-1.5 py-0.5 bg-[#F8F9F7] border border-[#E4E8E3] rounded">Over time</span>
              </h2>
              <p className="text-[11px] text-[#69736C] mt-0.5">
                Volume of source files parsed and indexed
              </p>
            </div>
            <Link
              href="/admin/documents"
              className="text-[11px] font-medium text-[#315B46] hover:text-[#264936] transition-colors"
            >
              View documents &rarr;
            </Link>
          </div>
          {isLoading ? (
            <div className="h-56 flex items-center justify-center text-xs text-[#8C958E] animate-pulse">
              Loading document uploads...
            </div>
          ) : (
            <DocumentUploadsChart data={charts?.document_uploads || []} />
          )}
        </div>

        {/* Transformation Activity by Type */}
        <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#202522]">Transformations by Type</h2>
              <p className="text-[11px] text-[#69736C] mt-0.5">
                Distribution across Summaries, FAQs, Quizzes, Emails, and Outlines
              </p>
            </div>
            <Link
              href="/admin/transformations"
              className="text-[11px] font-medium text-[#315B46] hover:text-[#264936] transition-colors"
            >
              View transformations &rarr;
            </Link>
          </div>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-xs text-[#8C958E] animate-pulse">
              Loading transformation breakdown...
            </div>
          ) : (
            <TransformationActivityChart data={charts?.transformation_activity || []} />
          )}
        </div>

        {/* Generation Status Breakdown */}
        <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div>
            <h2 className="text-sm font-bold text-[#202522]">Execution Health</h2>
            <p className="text-[11px] text-[#69736C] mt-0.5">
              Completed, failed, and pending generation tasks
            </p>
          </div>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-xs text-[#8C958E] animate-pulse">
              Loading status breakdown...
            </div>
          ) : (
            <GenerationStatusChart data={charts?.generation_status || []} />
          )}
        </div>
      </div>

      {/* ── 4. Recent Platform Activity ──────────────────────────────────── */}
      <div className="bg-white border border-[#E4E8E3] rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4E8E3]">
          <div>
            <h2 className="text-sm font-bold text-[#202522] flex items-center gap-2">
              <span>Recent Activity & Audit Log</span>
              <span className="text-[11px] px-2 py-0.5 bg-[#F8F9F7] border border-[#E4E8E3] rounded text-[#69736C] font-mono">
                {activityTotal} total recorded
              </span>
            </h2>
            <p className="text-[11px] text-[#69736C] mt-0.5">
              Live audit events: user registrations, document uploads, transformations, and admin actions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={activityOffset === 0 || activityLoading}
              onClick={() => loadMoreActivity(Math.max(0, activityOffset - 10))}
              className="px-2.5 py-1 text-xs bg-white hover:bg-[#F8F9F7] disabled:opacity-40 rounded border border-[#E4E8E3] text-[#202522] transition-colors"
            >
              &larr; Prev
            </button>
            <span className="text-[11px] font-mono text-[#69736C]">
              {Math.min(activityTotal, activityOffset + 1)} -{" "}
              {Math.min(activityTotal, activityOffset + activities.length)} of {activityTotal}
            </span>
            <button
              type="button"
              disabled={activityOffset + 10 >= activityTotal || activityLoading}
              onClick={() => loadMoreActivity(activityOffset + 10)}
              className="px-2.5 py-1 text-xs bg-white hover:bg-[#F8F9F7] disabled:opacity-40 rounded border border-[#E4E8E3] text-[#202522] transition-colors"
            >
              Next &rarr;
            </button>
          </div>
        </div>

        {/* Activity Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E4E8E3] text-[10px] uppercase text-[#69736C] font-semibold tracking-wider">
                <th className="pb-3 pl-2">Event</th>
                <th className="pb-3">User</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-2 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8E3]">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#8C958E] text-xs">
                    No platform events logged in database yet.
                  </td>
                </tr>
              ) : (
                activities.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8F9F7]/70 transition-colors">
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#315B46]" />
                        <span className="font-semibold text-[#202522] uppercase text-[11px]">
                          {item.event_type.replace(/_/g, " ")}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-[#202522]">
                      <p className="text-[11px] truncate max-w-[180px] font-medium">{item.user_email || "System / Anonymous"}</p>
                    </td>
                    <td className="py-3 text-[#69736C] max-w-xs truncate">
                      <span className="text-[#202522]">{item.description}</span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          item.status === "completed" || item.status === "success"
                            ? "bg-[#EBF1ED] text-[#2E6A4F] border border-[#2E6A4F]/20"
                            : item.status === "failed" || item.status === "error"
                            ? "bg-[#FDF2F2] text-[#A83232] border border-[#A83232]/20"
                            : "bg-[#F8F9F7] text-[#69736C] border border-[#E4E8E3]"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-right text-[11px] font-mono text-[#8C958E] whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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

// ── KPI Card Component ──────────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  icon: "user" | "activity" | "document" | "sparkles" | "check" | "cross";
  value: number;
  changePercent?: number | null;
  subtitle?: string;
  highlight?: "success" | "danger";
  isLoading?: boolean;
}

function KPICard({ title, icon, value, changePercent, subtitle, highlight, isLoading }: KPICardProps) {
  const getIcon = () => {
    switch (icon) {
      case "user":
        return (
          <svg className="w-4 h-4 text-[#315B46]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Z" />
          </svg>
        );
      case "activity":
        return (
          <svg className="w-4 h-4 text-[#315B46]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
        );
      case "document":
        return (
          <svg className="w-4 h-4 text-[#315B46]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        );
      case "sparkles":
        return (
          <svg className="w-4 h-4 text-[#9A6B1F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
        );
      case "check":
        return (
          <svg className="w-4 h-4 text-[#2E6A4F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        );
      case "cross":
        return (
          <svg className="w-4 h-4 text-[#A83232]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        );
    }
  };

  const isPositive = typeof changePercent === "number" && changePercent > 0;
  const isNegative = typeof changePercent === "number" && changePercent < 0;

  return (
    <div className="bg-white border border-[#E4E8E3] rounded-xl p-4 flex flex-col justify-between hover:border-[#315B46]/40 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-[#69736C] font-semibold truncate">
          {title}
        </span>
        <div className="p-1.5 rounded-lg bg-[#F8F9F7] border border-[#E4E8E3] shrink-0">
          {getIcon()}
        </div>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="h-8 w-16 bg-[#E4E8E3] rounded animate-pulse" />
        ) : (
          <p
            className={`text-2xl font-bold font-mono tracking-tight ${
              highlight === "success"
                ? "text-[#2E6A4F]"
                : highlight === "danger"
                ? "text-[#A83232]"
                : "text-[#202522]"
            }`}
          >
            {value}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between text-[10px]">
          {isLoading ? (
            <div className="h-3 w-20 bg-[#E4E8E3] rounded animate-pulse" />
          ) : typeof changePercent === "number" ? (
            <span
              className={`inline-flex items-center gap-0.5 font-bold font-mono ${
                isPositive
                  ? "text-[#2E6A4F]"
                  : isNegative
                  ? "text-[#A83232]"
                  : "text-[#69736C]"
              }`}
            >
              {isPositive ? "↑" : isNegative ? "↓" : "•"} {Math.abs(changePercent)}%
              <span className="text-[#8C958E] font-normal ml-0.5 font-sans">vs prev</span>
            </span>
          ) : (
            <span className="text-[#8C958E]">baseline</span>
          )}

          {subtitle && <span className="text-[#8C958E]">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}
