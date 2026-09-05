"use client";

import { useEffect, useState } from "react";
import { api, type VerificationReportResponse } from "@/lib/api";

interface VerificationReportProps {
  transformationId: string;
}

export function VerificationReport({ transformationId }: VerificationReportProps) {
  const [report, setReport] = useState<VerificationReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        try {
          const existing = await api.getVerificationReport(transformationId);
          if (!cancelled) {
            setReport(existing);
            setLoading(false);
          }
          return;
        } catch {
          /* if not found, trigger verification */
        }

        const newReport = await api.verifyTransformation(transformationId);
        if (!cancelled) {
          setReport(newReport);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Verification failed.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transformationId]);

  if (loading) {
    return (
      <div className="saas-card-flat p-5 text-center space-y-2 bg-slate-50 border-slate-200">
        <p className="text-xs font-semibold text-slate-600">Running Factuality Verification Audit…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-center justify-between">
        <p className="text-xs font-medium text-red-700">{error}</p>
        <button
          type="button"
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const res = await api.verifyTransformation(transformationId);
              setReport(res);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Verification failed.");
            } finally {
              setLoading(false);
            }
          }}
          className="btn-secondary py-1 px-2.5 text-xs"
        >
          Retry Audit
        </button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6 pt-5 border-t border-slate-200">
      {/* Verification Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Factuality & Claim Verification Report
        </h4>
        <span
          className={`saas-badge border uppercase text-[10px] ${
            report.groundedness_score >= 80.0
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : report.groundedness_score >= 50.0
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          Groundedness: {report.groundedness_score.toFixed(1)}%
        </span>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="saas-card-flat p-3.5 space-y-1 bg-slate-50">
          <p className="text-[11px] font-semibold text-slate-500">Groundedness</p>
          <p className="text-xl font-bold text-slate-900">{report.groundedness_score.toFixed(1)}%</p>
        </div>
        <div className="saas-card-flat p-3.5 space-y-1 bg-slate-50">
          <p className="text-[11px] font-semibold text-slate-500">Citation Coverage</p>
          <p className="text-xl font-bold text-slate-900">{report.citation_coverage.toFixed(1)}%</p>
        </div>
        <div className="saas-card-flat p-3.5 space-y-1 bg-slate-50">
          <p className="text-[11px] font-semibold text-slate-500">Supported Claims</p>
          <p className="text-xl font-bold text-emerald-700">
            {report.supported_claims_count} / {report.total_claims}
          </p>
        </div>
        <div className="saas-card-flat p-3.5 space-y-1 bg-slate-50">
          <p className="text-[11px] font-semibold text-slate-500">Unsupported Claims</p>
          <p className="text-xl font-bold text-red-600">{report.unsupported_claims_count}</p>
        </div>
      </div>

      {/* Claims Analysis Breakdown */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-700">
          Claims Analysis ({report.claims.length} Proved Statements)
        </h4>

        <div className="space-y-2">
          {report.claims.map((claim, idx) => {
            const isSupported = claim.classification === "SUPPORTED";
            const isPartial = claim.classification === "PARTIALLY_SUPPORTED";
            const badgeStyle = isSupported
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : isPartial
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-red-50 text-red-700 border-red-200";

            return (
              <div
                key={claim.id || idx}
                className="saas-card-flat p-3.5 space-y-1.5 bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-900">
                    Claim #{idx + 1}: &quot;{claim.claim_text}&quot;
                  </p>
                  <span className={`saas-badge uppercase text-[9px] border shrink-0 ${badgeStyle}`}>
                    {claim.classification.replace("_", " ")}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600">{claim.reasoning}</p>

                {claim.evidence_snippet && (
                  <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[11px] space-y-0.5">
                    <span className="font-semibold text-slate-700">Evidence Match:</span>
                    <p className="text-slate-600 italic">&quot;{claim.evidence_snippet}&quot;</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
