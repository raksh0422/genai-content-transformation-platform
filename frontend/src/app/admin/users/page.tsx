"use client";

import { useEffect, useState, useCallback } from "react";
import {
  api,
  type AdminUserItem,
  type AdminUserDetailResponse,
} from "@/lib/api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [limit] = useState<number>(10);
  const [offset, setOffset] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // User Detail modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUserDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Status toggle confirmation modal state
  const [targetUser, setTargetUser] = useState<AdminUserItem | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.admin.getUsers({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit,
        offset,
      });
      setUsers(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      console.error("Failed to fetch users:", err);
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, statusFilter, sortBy, sortOrder, limit, offset]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const viewUserDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setDetailLoading(true);
    try {
      const detail = await api.admin.getUser(userId);
      setUserDetail(detail);
    } catch (err) {
      console.error("Failed to load user details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!targetUser) return;
    setActionLoading(true);
    try {
      const nextStatus = !targetUser.is_active;
      const updated = await api.admin.updateUserStatus(targetUser.id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: updated.is_active } : u))
      );
      if (userDetail && userDetail.user.id === targetUser.id) {
        setUserDetail({
          ...userDetail,
          user: { ...userDetail.user, is_active: updated.is_active },
        });
      }
      setTargetUser(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update account status");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E4E8E3]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202522] flex items-center gap-3">
            <span>User Management</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EBF1ED] text-[#2E6A4F] border border-[#2E6A4F]/20">
              {total} registered
            </span>
          </h1>
          <p className="text-xs text-[#69736C] mt-1">
            Directory of platform accounts, authentication credentials, and utilization
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchUsers()}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-[#F8F9F7] text-[#69736C] hover:text-[#202522] rounded-lg border border-[#E4E8E3] text-xs font-medium shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors self-start sm:self-auto"
        >
          <svg className={`w-3.5 h-3.5 text-[#315B46] ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="relative sm:col-span-2">
          <input
            type="text"
            placeholder="Search by full name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            id="admin-users-search"
            className="w-full bg-white border border-[#E4E8E3] rounded-lg pl-9 pr-3 py-2 text-xs text-[#202522] placeholder-[#8C958E] focus:outline-none focus:border-[#315B46] focus:ring-1 focus:ring-[#315B46] transition-colors"
          />
          <svg
            className="w-4 h-4 text-[#8C958E] absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>

        {/* Role Filter */}
        <div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setOffset(0);
            }}
            id="admin-users-role-filter"
            aria-label="Filter by account role"
            className="w-full bg-white border border-[#E4E8E3] rounded-lg px-3 py-2 text-xs text-[#202522] focus:outline-none focus:border-[#315B46] focus:ring-1 focus:ring-[#315B46] transition-colors"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            id="admin-users-status-filter"
            aria-label="Filter by account status"
            className="w-full bg-white border border-[#E4E8E3] rounded-lg px-3 py-2 text-xs text-[#202522] focus:outline-none focus:border-[#315B46] focus:ring-1 focus:ring-[#315B46] transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split("-");
              setSortBy(field);
              setSortOrder(order);
              setOffset(0);
            }}
            id="admin-users-sort-by"
            aria-label="Sort users by"
            className="w-full bg-white border border-[#E4E8E3] rounded-lg px-3 py-2 text-xs text-[#202522] focus:outline-none focus:border-[#315B46] focus:ring-1 focus:ring-[#315B46] transition-colors"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="documents_count-desc">Most Documents</option>
            <option value="transformations_count-desc">Most Transforms</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#A83232]/20 text-[#A83232] text-xs">
          {error}
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white border border-[#E4E8E3] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E4E8E3] bg-[#F8F9F7] text-[10px] uppercase text-[#69736C] font-semibold tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-center">Documents</th>
                <th className="py-3 px-3 text-center">Transforms</th>
                <th className="py-3 px-3">Registered</th>
                <th className="py-3 px-3">Last Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E8E3]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="py-4 px-4">
                      <div className="h-4 bg-[#E4E8E3] rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8C958E] text-xs">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8F9F7]/70 transition-colors">
                    {/* User */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#EBF1ED] border border-[#315B46]/20 flex items-center justify-center font-bold text-[#315B46] shrink-0 text-xs">
                          {u.full_name?.charAt(0) || "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#202522] truncate">{u.full_name}</p>
                          <p className="text-[11px] text-[#69736C] truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          u.role === "admin"
                            ? "bg-[#FEF7EC] text-[#9A6B1F] border border-[#9A6B1F]/30"
                            : "bg-[#F8F9F7] text-[#69736C] border border-[#E4E8E3]"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.is_active
                            ? "bg-[#EBF1ED] text-[#2E6A4F] border border-[#2E6A4F]/20"
                            : "bg-[#FDF2F2] text-[#A83232] border border-[#A83232]/20"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-[#2E6A4F]" : "bg-[#A83232]"}`} />
                        <span>{u.is_active ? "Active" : "Deactivated"}</span>
                      </span>
                    </td>

                    {/* Docs count */}
                    <td className="py-3.5 px-3 text-center text-[#202522] font-semibold font-mono">
                      {u.document_count}
                    </td>

                    {/* Transforms count */}
                    <td className="py-3.5 px-3 text-center text-[#202522] font-semibold font-mono">
                      {u.transformation_count}
                    </td>

                    {/* Registered Date */}
                    <td className="py-3.5 px-3 text-[#69736C] text-[11px] whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString([], {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Last Active */}
                    <td className="py-3.5 px-3 text-[#8C958E] text-[11px] whitespace-nowrap font-mono">
                      {u.last_active_at
                        ? new Date(u.last_active_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Never"}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => viewUserDetail(u.id)}
                          className="px-2 py-1 text-[11px] bg-white hover:bg-[#F8F9F7] text-[#202522] rounded border border-[#E4E8E3] transition-colors font-medium shadow-2xs"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetUser(u)}
                          className={`px-2 py-1 text-[11px] rounded border transition-colors font-medium ${
                            u.is_active
                              ? "bg-[#FDF2F2] hover:bg-[#FDF2F2]/80 text-[#A83232] border-[#A83232]/20"
                              : "bg-[#EBF1ED] hover:bg-[#EBF1ED]/80 text-[#2E6A4F] border-[#2E6A4F]/20"
                          }`}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-[#E4E8E3] bg-[#F8F9F7] flex items-center justify-between text-xs">
          <p className="text-[#69736C]">
            Showing {Math.min(total, offset + 1)} - {Math.min(total, offset + users.length)} of {total} accounts
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={offset === 0 || isLoading}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="px-3 py-1 bg-white hover:bg-[#F8F9F7] disabled:opacity-40 rounded border border-[#E4E8E3] text-[#202522] transition-colors font-medium"
            >
              &larr; Previous
            </button>
            <button
              type="button"
              disabled={offset + limit >= total || isLoading}
              onClick={() => setOffset(offset + limit)}
              className="px-3 py-1 bg-white hover:bg-[#F8F9F7] disabled:opacity-40 rounded border border-[#E4E8E3] text-[#202522] transition-colors font-medium"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ── User Detail Slideover / Modal ──────────────────────────────────── */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-end animate-fade-in">
          <div className="w-full max-w-xl h-full bg-white border-l border-[#E4E8E3] p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div className="space-y-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E4E8E3]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#EBF1ED] border border-[#315B46]/20 flex items-center justify-center font-bold text-[#315B46] text-base">
                    {userDetail?.user.full_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#202522]">{userDetail?.user.full_name || "Loading..."}</h2>
                    <p className="text-xs text-[#69736C]">{userDetail?.user.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  className="p-1 rounded-lg text-[#69736C] hover:text-[#202522] hover:bg-[#F8F9F7] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {detailLoading ? (
                <div className="py-12 text-center text-xs text-[#8C958E] animate-pulse">
                  Loading user records...
                </div>
              ) : userDetail ? (
                <>
                  {/* Account Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
                      <span className="text-[10px] text-[#69736C] uppercase font-semibold">Role</span>
                      <p className="font-bold text-[#202522] capitalize mt-0.5">{userDetail.user.role}</p>
                    </div>
                    <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
                      <span className="text-[10px] text-[#69736C] uppercase font-semibold">Account Status</span>
                      <p className={`font-bold mt-0.5 ${userDetail.user.is_active ? "text-[#2E6A4F]" : "text-[#A83232]"}`}>
                        {userDetail.user.is_active ? "Active" : "Deactivated"}
                      </p>
                    </div>
                    <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
                      <span className="text-[10px] text-[#69736C] uppercase font-semibold">Total Uploads</span>
                      <p className="font-bold text-[#202522] mt-0.5">{userDetail.user.document_count} documents</p>
                    </div>
                    <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3]">
                      <span className="text-[10px] text-[#69736C] uppercase font-semibold">Total Generations</span>
                      <p className="font-bold text-[#202522] mt-0.5">{userDetail.user.transformation_count} completed</p>
                    </div>
                  </div>

                  {/* Recent Documents */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#69736C]">
                      Uploaded Documents ({userDetail.documents.length})
                    </h3>
                    {userDetail.documents.length === 0 ? (
                      <p className="text-xs text-[#8C958E] italic">No documents uploaded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {userDetail.documents.map((d) => (
                          <div key={d.id} className="p-3 bg-white border border-[#E4E8E3] rounded-lg text-xs flex items-center justify-between shadow-2xs">
                            <div className="min-w-0 pr-3">
                              <p className="font-semibold text-[#202522] truncate">{d.filename}</p>
                              <p className="text-[10px] text-[#69736C] mt-0.5">
                                {d.file_extension.toUpperCase()} • {Math.round(d.file_size_bytes / 1024)} KB • {d.chunk_count ?? 0} passages
                              </p>
                            </div>
                            <span className="text-[10px] text-[#8C958E] whitespace-nowrap">
                              {new Date(d.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Transformations */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#69736C]">
                      Recent Transformations ({userDetail.recent_transformations.length})
                    </h3>
                    {userDetail.recent_transformations.length === 0 ? (
                      <p className="text-xs text-[#8C958E] italic">No transformation jobs executed yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {userDetail.recent_transformations.map((t) => (
                          <div key={t.id} className="p-3 bg-white border border-[#E4E8E3] rounded-lg text-xs flex items-center justify-between shadow-2xs">
                            <div className="min-w-0 pr-3">
                              <p className="font-semibold text-[#202522] truncate">{t.title || t.transformation_type}</p>
                              <p className="text-[10px] text-[#69736C] mt-0.5">
                                {t.transformation_type.replace(/_/g, " ")} • {t.duration_seconds ? `${t.duration_seconds}s` : "instant"}
                              </p>
                            </div>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                                t.status === "completed"
                                  ? "bg-[#EBF1ED] text-[#2E6A4F]"
                                  : t.status === "failed"
                                  ? "bg-[#FDF2F2] text-[#A83232]"
                                  : "bg-[#FEF7EC] text-[#9A6B1F]"
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="pt-6 border-t border-[#E4E8E3] mt-6">
              <button
                type="button"
                onClick={() => setSelectedUserId(null)}
                className="w-full py-2 bg-white hover:bg-[#F8F9F7] text-[#202522] font-medium text-xs rounded-lg border border-[#E4E8E3] transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Change Confirmation Modal ───────────────────────────────── */}
      {targetUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-[#E4E8E3] rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-[#9A6B1F]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-base font-bold text-[#202522]">
                {targetUser.is_active ? "Deactivate User Account?" : "Reactivate User Account?"}
              </h2>
            </div>

            <p className="text-xs text-[#69736C] leading-relaxed">
              {targetUser.is_active
                ? `Deactivating ${targetUser.email} will immediately revoke their ability to log in or invoke any document transformation actions.`
                : `Reactivating ${targetUser.email} will restore their access to the ContentAI platform.`}
            </p>

            <div className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E4E8E3] text-[11px] text-[#69736C] space-y-1">
              <p>User: <span className="text-[#202522] font-semibold">{targetUser.full_name}</span></p>
              <p>Email: <span className="text-[#202522]">{targetUser.email}</span></p>
              <p>Audit Event: <span className="text-[#9A6B1F] font-semibold">Recorded in Admin Audit Log</span></p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTargetUser(null)}
                disabled={actionLoading}
                className="px-4 py-2 bg-white hover:bg-[#F8F9F7] text-[#202522] text-xs font-medium rounded-lg border border-[#E4E8E3] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmToggleStatus}
                disabled={actionLoading}
                className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors ${
                  targetUser.is_active
                    ? "bg-[#A83232] hover:bg-[#8F2B2B]"
                    : "bg-[#315B46] hover:bg-[#264936]"
                }`}
              >
                {actionLoading ? "Updating..." : targetUser.is_active ? "Confirm Deactivation" : "Confirm Reactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
