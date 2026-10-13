"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

type SettingsTab = "profile" | "preferences" | "security" | "account";

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { showToast, ToastContainer } = useToast();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Preferences state
  const [defaultFormat, setDefaultFormat] = useState("pdf");
  const [defaultTone, setDefaultTone] = useState("professional");
  const [defaultType, setDefaultType] = useState("executive_summary");
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Security form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Logout dialog
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Initialize profile & preferences
  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
  }, [user]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedFormat = localStorage.getItem("contentai_pref_export_format");
      if (savedFormat) setDefaultFormat(savedFormat);

      const savedTone = localStorage.getItem("contentai_pref_tone");
      if (savedTone) setDefaultTone(savedTone);

      const savedType = localStorage.getItem("contentai_pref_transformation");
      if (savedType) setDefaultType(savedType);
    }
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast("Please enter your name", "error");
      return;
    }
    setSavingProfile(true);
    try {
      await api.updateProfile(fullName.trim());
      await refreshUser();
      showToast("Profile updated successfully", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      localStorage.setItem("contentai_pref_export_format", defaultFormat);
      localStorage.setItem("contentai_pref_tone", defaultTone);
      localStorage.setItem("contentai_pref_transformation", defaultType);
      showToast("Preferences saved", "success");
    } catch {
      showToast("Failed to save preferences", "error");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password updated successfully", "success");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Recently";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="max-w-4xl space-y-6">
      <ToastContainer />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#202522]">Settings</h1>
        <p className="text-sm text-[#69736C] mt-1">
          Manage your account profile, transformation preferences, and security settings.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-[#E4E8E3] pb-px">
        {[
          { id: "profile", label: "Profile" },
          { id: "preferences", label: "Preferences" },
          { id: "security", label: "Security" },
          { id: "account", label: "Account" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as SettingsTab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[#315B46] text-[#315B46] font-semibold"
                : "border-transparent text-[#69736C] hover:text-[#202522]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6 animate-fade-in">
          <div className="surface-card p-6 space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-[#E4E8E3]">
              <div className="h-16 w-16 rounded-full bg-[#EBF1ED] text-[#315B46] font-bold text-xl flex items-center justify-center border border-[#C5D7CC]">
                {getInitials(user?.full_name)}
              </div>
              <div>
                <h2 className="text-base font-bold text-[#202522]">{user?.full_name || "User"}</h2>
                <p className="text-xs text-[#69736C] mt-0.5">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EBF1ED] text-[#315B46] capitalize">
                    {user?.role === "admin" ? "Administrator" : "Standard Account"}
                  </span>
                  <span className="text-[11px] text-[#8C958F]">
                    Member since {formatDate(user?.created_at)}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
              <div>
                <label className="text-xs font-semibold text-[#69736C] uppercase tracking-wider block mb-1.5">
                  Display name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field text-sm"
                  placeholder="Your full name"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#69736C] uppercase tracking-wider block mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="input-field text-sm bg-[#F8F9F7] text-[#8C958F] cursor-not-allowed"
                />
                <p className="text-[11px] text-[#8C958F] mt-1">
                  Email address is used for authentication and cannot be changed directly.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn-primary text-sm"
                >
                  {savingProfile ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Preferences Tab */}
      {activeTab === "preferences" && (
        <div className="space-y-6 animate-fade-in">
          <form onSubmit={handleSavePreferences} className="surface-card p-6 space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-[#202522]">Document transformation defaults</h2>
              <p className="text-xs text-[#69736C] mt-0.5">
                Pre-select your preferred formats and tones whenever you open a document.
              </p>
            </div>

            <div className="space-y-4 max-w-lg">
              <div>
                <label className="text-xs font-semibold text-[#69736C] uppercase tracking-wider block mb-1.5">
                  Default Content Format
                </label>
                <select
                  value={defaultType}
                  onChange={(e) => setDefaultType(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="executive_summary">Executive Summary (Key insights & recommendations)</option>
                  <option value="short_summary">Short Summary (1-2 paragraph briefing)</option>
                  <option value="faq">Frequently Asked Questions (Q&A format)</option>
                  <option value="quiz">Knowledge Quiz (Verification questions)</option>
                  <option value="email">Professional Email (Actionable draft)</option>
                  <option value="social_post">Social Post (LinkedIn / Announcement)</option>
                  <option value="presentation_outline">Presentation Outline (Slide structure)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#69736C] uppercase tracking-wider block mb-1.5">
                  Default Writing Tone
                </label>
                <select
                  value={defaultTone}
                  onChange={(e) => setDefaultTone(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="professional">Professional (Balanced and objective)</option>
                  <option value="executive">Executive (High-level and concise)</option>
                  <option value="casual">Casual (Friendly and conversational)</option>
                  <option value="academic">Academic (Analytical and rigorous)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#69736C] uppercase tracking-wider block mb-1.5">
                  Default Export Format
                </label>
                <select
                  value={defaultFormat}
                  onChange={(e) => setDefaultFormat(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="pdf">PDF Document (.pdf)</option>
                  <option value="docx">Microsoft Word (.docx)</option>
                  <option value="md">Markdown (.md)</option>
                  <option value="txt">Plain Text (.txt)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E4E8E3]">
              <div className="flex items-center justify-between max-w-lg">
                <div>
                  <p className="text-sm font-medium text-[#202522]">Visual theme</p>
                  <p className="text-xs text-[#69736C]">Calibrated editorial warm surface</p>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#EBF1ED] text-[#315B46] border border-[#C5D7CC]">
                  Editorial Light (Active)
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPrefs}
                className="btn-primary text-sm"
              >
                {savingPrefs ? "Saving…" : "Save preferences"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Security Tab */}
      {activeTab === "security" && (
        <div className="space-y-6 animate-fade-in">
          <div className="surface-card p-6 space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-[#202522]">Change password</h2>
              <p className="text-xs text-[#69736C] mt-0.5">
                Update your account password. Choose a secure password of at least 8 characters.
              </p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
              {passwordError && (
                <div className="p-3 rounded-lg bg-[#FDF8F8] border border-[#F0D5D5] text-xs text-[#A83232]">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#69736C] uppercase tracking-wider block mb-1.5">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-field text-sm"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#69736C] uppercase tracking-wider block mb-1.5">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field text-sm"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#69736C] uppercase tracking-wider block mb-1.5">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field text-sm"
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="btn-primary text-sm"
                >
                  {savingPassword ? "Updating password…" : "Update password"}
                </button>
              </div>
            </form>

            <div className="pt-6 border-t border-[#E4E8E3] space-y-3">
              <h3 className="text-sm font-semibold text-[#202522]">Active session</h3>
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#F8F9F7] border border-[#E4E8E3]">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#EBF1ED] text-[#315B46] flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#202522]">Current browser session</p>
                    <p className="text-[11px] text-[#69736C]">Signed in with verified secure session token</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="btn-secondary text-xs text-[#A83232] hover:bg-[#FDF8F8] border-[#F0D5D5]"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Account Tab */}
      {activeTab === "account" && (
        <div className="space-y-6 animate-fade-in">
          {/* Account Role & Metrics */}
          <div className="surface-card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#202522]">Account overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-[#F8F9F7] border border-[#E4E8E3]">
                <p className="text-xs text-[#69736C]">Account role</p>
                <p className="text-base font-bold text-[#202522] mt-1 capitalize">
                  {user?.role === "admin" ? "Administrator" : "Standard User"}
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F8F9F7] border border-[#E4E8E3]">
                <p className="text-xs text-[#69736C]">Documents managed</p>
                <p className="text-base font-bold text-[#202522] mt-1">
                  {user?.document_count ?? 0}
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F8F9F7] border border-[#E4E8E3]">
                <p className="text-xs text-[#69736C]">Transformations created</p>
                <p className="text-base font-bold text-[#202522] mt-1">
                  {user?.transformation_count ?? 0}
                </p>
              </div>
            </div>
          </div>

          {/* Supported document formats */}
          <div className="surface-card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#202522]">Supported file formats</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { ext: "PDF", desc: "Adobe Acrobat documents" },
                { ext: "DOCX", desc: "Microsoft Word documents" },
                { ext: "TXT", desc: "Plain text files" },
              ].map((fmt) => (
                <div key={fmt.ext} className="p-3 rounded-lg bg-[#F8F9F7] border border-[#E4E8E3]">
                  <p className="text-sm font-bold text-[#202522]">{fmt.ext}</p>
                  <p className="text-xs text-[#69736C] mt-0.5">{fmt.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#8C958F]">
              Maximum file upload size is 50 MB per document.
            </p>
          </div>

          {/* Account Deactivation / Enterprise policy */}
          <div className="surface-card p-6 space-y-3 border-[#F0D5D5] bg-[#FDF8F8]">
            <h2 className="text-sm font-semibold text-[#A83232]">Account deactivation & data policy</h2>
            <p className="text-xs text-[#69736C] leading-relaxed max-w-xl">
              ContentAI maintains strict data boundary isolation between workspaces. To deactivate your account or request complete erasure of your uploaded documents and generated files, please submit a request to your system administrator.
            </p>
            <div className="pt-2">
              <span className="text-xs font-semibold text-[#69736C]">
                Workspace ID: <span className="font-mono text-[#202522]">{user?.id || "usr_active"}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="surface-card max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-[#202522]">Sign out of ContentAI?</h3>
            <p className="text-xs text-[#69736C] leading-relaxed">
              Your active session will be ended securely. You will need your email and password to log back in.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout();
                }}
                className="btn-primary text-xs bg-[#A83232] hover:bg-[#8F2929] border-[#A83232]"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
