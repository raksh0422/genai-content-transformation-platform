"use client";

import { useState } from "react";
import type {
  DocumentUploadDataPoint,
  GenerationStatusBreakdown,
  TransformationTypeBreakdown,
  UserEngagementDataPoint,
  UserGrowthDataPoint,
} from "@/lib/api";

// ─── 1. User Growth Chart (Smooth Area + Line) ──────────────────────────────

export function UserGrowthChart({ data }: { data: UserGrowthDataPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#69736C]">
        No user growth data recorded in this period
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.cumulative), 1);
  const width = 600;
  const height = 200;
  const padding = 24;

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (d.cumulative / maxVal) * (height - padding * 2);
    return { x, y, ...d };
  });

  const linePath = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-56 select-none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#315B46" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#315B46" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((pct, idx) => {
          const y = height - padding - pct * (height - padding * 2);
          return (
            <g key={idx}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#E4E8E3"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding}
                y={y - 4}
                fill="#8C958F"
                fontSize="9"
                fontFamily="sans-serif"
                fontWeight="500"
              >
                {Math.round(maxVal * pct)}
              </text>
            </g>
          );
        })}

        {/* Area & Line */}
        <path d={areaPath} fill="url(#userGrowthGrad)" />
        <path d={linePath} fill="none" stroke="#315B46" strokeWidth="2.5" strokeLinecap="round" />

        {/* Interactive Data Points */}
        {points.map((p, i) => (
          <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredIdx === i ? "5" : "3.5"}
              fill={hoveredIdx === i ? "#315B46" : "#FFFFFF"}
              stroke="#315B46"
              strokeWidth="2"
              className="transition-all duration-150"
            />
          </g>
        ))}
      </svg>

      {/* Hover Info Tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div className="absolute top-2 right-2 bg-white border border-[#E4E8E3] px-3 py-1.5 rounded-lg text-xs shadow-md animate-fade-in pointer-events-none">
          <p className="text-[#8C958F] text-[10px]">{points[hoveredIdx].date}</p>
          <p className="font-bold text-[#202522]">
            {points[hoveredIdx].cumulative} users{" "}
            <span className="text-[#315B46] font-semibold">
              (+{points[hoveredIdx].count} new)
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── 2. Document Uploads Chart (Bar Chart) ──────────────────────────────────

export function DocumentUploadsChart({ data }: { data: DocumentUploadDataPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[#69736C]">
        No document uploads recorded in this period
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const width = 600;
  const height = 200;
  const padding = 24;
  const availableWidth = width - padding * 2;
  const barWidth = Math.max(4, Math.min(24, (availableWidth / data.length) * 0.7));

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-56 select-none"
        preserveAspectRatio="none"
      >
        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((pct, idx) => {
          const y = height - padding - pct * (height - padding * 2);
          return (
            <g key={idx}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#E4E8E3"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding}
                y={y - 4}
                fill="#8C958F"
                fontSize="9"
                fontFamily="sans-serif"
                fontWeight="500"
              >
                {Math.round(maxVal * pct)} docs
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2) - barWidth / 2;
          const barHeight = Math.max(2, (d.count / maxVal) * (height - padding * 2));
          const y = height - padding - barHeight;
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="3"
                fill={isHovered ? "#264936" : "#315B46"}
                className="transition-colors duration-150"
              />
            </g>
          );
        })}
      </svg>

      {hoveredIdx !== null && data[hoveredIdx] && (
        <div className="absolute top-2 right-2 bg-white border border-[#E4E8E3] px-3 py-1.5 rounded-lg text-xs shadow-md animate-fade-in pointer-events-none">
          <p className="text-[#8C958F] text-[10px]">{data[hoveredIdx].date}</p>
          <p className="font-bold text-[#202522]">
            {data[hoveredIdx].count} documents uploaded
          </p>
        </div>
      )}
    </div>
  );
}

// ─── 3. Transformation Activity by Type (Horizontal Distribution) ───────────

export function TransformationActivityChart({
  data,
}: {
  data: TransformationTypeBreakdown[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-[#69736C]">
        No transformations generated yet
      </div>
    );
  }

  const colors = [
    "bg-[#315B46]",
    "bg-[#52796F]",
    "bg-[#354F52]",
    "bg-[#2F3E46]",
    "bg-[#84A98C]",
    "bg-[#588157]",
    "bg-[#3A5A40]",
  ];

  return (
    <div className="space-y-3.5 py-1">
      {data.map((item, idx) => (
        <div key={item.type} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#202522]">{item.label}</span>
            <span className="text-[#69736C]">
              <span className="font-semibold text-[#202522]">{item.count}</span>{" "}
              <span className="text-[#8C958F]">({item.percentage}%)</span>
            </span>
          </div>
          <div className="h-2 w-full bg-[#F0F2EF] rounded-full overflow-hidden border border-[#E4E8E3] flex">
            <div
              className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-500`}
              style={{ width: `${Math.max(2, item.percentage)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 4. Generation Status Breakdown ─────────────────────────────────────────

export function GenerationStatusChart({
  data,
}: {
  data: GenerationStatusBreakdown[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-[#69736C]">
        No jobs recorded in this window
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return {
          bg: "bg-[#2E6A4F]",
          text: "text-[#2E6A4F]",
          border: "border-[#C5D7CC]",
          pill: "bg-[#EBF1ED]",
        };
      case "failed":
        return {
          bg: "bg-[#A83232]",
          text: "text-[#A83232]",
          border: "border-[#F0D5D5]",
          pill: "bg-[#FDF8F8]",
        };
      case "processing":
      case "pending":
        return {
          bg: "bg-[#9A6B1F]",
          text: "text-[#9A6B1F]",
          border: "border-[#EADBB8]",
          pill: "bg-[#FDF9F0]",
        };
      default:
        return {
          bg: "bg-[#69736C]",
          text: "text-[#69736C]",
          border: "border-[#E4E8E3]",
          pill: "bg-[#F8F9F7]",
        };
    }
  };

  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div className="space-y-4">
      {/* Multi-segment Progress Bar */}
      <div className="h-3.5 w-full bg-[#F0F2EF] rounded-full overflow-hidden flex p-0.5 border border-[#E4E8E3]">
        {data.map((item) => {
          const config = getStatusColor(item.status);
          const widthPct = Math.max(2, (item.count / total) * 100);
          return (
            <div
              key={item.status}
              className={`h-full ${config.bg} rounded-xs transition-all duration-500 mr-0.5`}
              style={{ width: `${widthPct}%` }}
              title={`${item.status}: ${item.count} (${item.percentage}%)`}
            />
          );
        })}
      </div>

      {/* Status Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {data.map((item) => {
          const config = getStatusColor(item.status);
          return (
            <div
              key={item.status}
              className={`p-3 rounded-lg border ${config.border} ${config.pill} flex flex-col justify-between`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`h-2 w-2 rounded-full ${config.bg}`} />
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#69736C]">
                  {item.status}
                </span>
              </div>
              <p className="text-lg font-bold text-[#202522]">
                {item.count}{" "}
                <span className="text-xs font-normal text-[#69736C]">
                  ({item.percentage}%)
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 5. User Engagement Chart ───────────────────────────────────────────────

export function UserEngagementChart({ data }: { data: UserEngagementDataPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-[#69736C]">
        No engagement logs recorded
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.active_users), 1);
  const width = 600;
  const height = 180;
  const padding = 20;

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (d.active_users / maxVal) * (height - padding * 2);
    return { x, y, ...d };
  });

  const linePath = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-44 select-none"
        preserveAspectRatio="none"
      >
        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((pct, idx) => {
          const y = height - padding - pct * (height - padding * 2);
          return (
            <line
              key={idx}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#E4E8E3"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}

        <path d={linePath} fill="none" stroke="#315B46" strokeWidth="2.5" strokeLinecap="round" />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="#FFFFFF"
            stroke="#315B46"
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
}
