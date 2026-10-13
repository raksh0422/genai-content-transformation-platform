"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Forgot Password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please provide both email address and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({
        email: email.trim(),
        password: password.trim(),
        remember_me: rememberMe,
      });

      login(res.access_token, res.user);
      setSuccess(true);

      // Role-based redirects
      if (res.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError(err instanceof Error ? err.message : "Authentication failed.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const res = await api.forgotPassword(forgotEmail);
      setForgotMessage(res.message);
    } catch {
      setForgotMessage(
        "Automated password reset requires an SMTP provider. Please contact your system administrator."
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#202522]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="h-11 w-11 rounded-xl bg-[#315B46] text-white flex items-center justify-center font-bold text-base shadow-xs mb-3">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202522]">ContentAI</h1>
          <p className="mt-1 text-xs text-[#69736C]">
            Sign in to access your document transformation workspace
          </p>
        </div>

        {/* Card */}
        <div className="mt-7 surface-card rounded-2xl p-6 sm:p-8 shadow-xs border border-[#E4E8E3]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-[#FDF8F8] border border-[#F0D5D5] text-[#A83232] text-xs flex items-start gap-2 animate-fade-in"
              >
                <svg className="w-4 h-4 text-[#A83232] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-[#EBF1ED] border border-[#C5D7CC] text-[#2E6A4F] text-xs flex items-center gap-2">
                <svg className="w-4 h-4 text-[#2E6A4F] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span>Authentication successful. Opening workspace…</span>
              </div>
            )}

            {/* Quick-fill Expo demo accounts */}
            <div className="rounded-xl border border-[#E4E8E3] bg-[#F8F9F7] p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#69736C] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#315B46]" />
                  Expo Demo Accounts
                </span>
                <span className="text-[10px] text-[#8C958F]">Click card to autofill</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="fill-demo-admin"
                  onClick={() => {
                    setEmail("admin@contentai.internal");
                    setPassword("AdminPass123!");
                    setError(null);
                  }}
                  className="flex flex-col text-left p-2.5 rounded-lg bg-white border border-[#E4E8E3] hover:border-[#315B46] hover:bg-[#EBF1ED]/40 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-[#315B46] text-xs flex items-center gap-1">
                    <span>👑</span> Administrator
                  </span>
                  <span className="text-[11px] text-[#202522] font-mono mt-0.5 truncate">admin@contentai.internal</span>
                  <span className="text-[10px] text-[#69736C] font-mono">AdminPass123!</span>
                </button>
                <button
                  type="button"
                  id="fill-demo-user"
                  onClick={() => {
                    setEmail("jane@example.com");
                    setPassword("UserPass123!");
                    setError(null);
                  }}
                  className="flex flex-col text-left p-2.5 rounded-lg bg-white border border-[#E4E8E3] hover:border-[#315B46] hover:bg-[#EBF1ED]/40 transition-colors cursor-pointer"
                >
                  <span className="font-bold text-[#202522] text-xs flex items-center gap-1">
                    <span>👤</span> Regular User
                  </span>
                  <span className="text-[11px] text-[#202522] font-mono mt-0.5 truncate">jane@example.com</span>
                  <span className="text-[10px] text-[#69736C] font-mono">UserPass123!</span>
                </button>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-[#69736C] uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="input-field text-sm"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold text-[#69736C] uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotMessage(null);
                    setForgotModalOpen(true);
                  }}
                  className="text-xs text-[#69736C] hover:text-[#315B46] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field text-sm pr-10"
                />
                <button
                  type="button"
                  id="toggle-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C958F] hover:text-[#202522] transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-1">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-[#E4E8E3] text-[#315B46] focus:ring-[#315B46] cursor-pointer accent-[#315B46]"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs text-[#69736C] cursor-pointer select-none">
                Remember this device for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="login-submit-button"
                disabled={loading || success}
                className="w-full btn-primary justify-center py-2.5 text-sm font-semibold shadow-xs"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Authenticating…</span>
                  </>
                ) : success ? (
                  <>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <span>Opening workspace…</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>

          {/* Registration link */}
          <div className="mt-6 pt-5 border-t border-[#E4E8E3] text-center">
            <p className="text-xs text-[#69736C]">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                id="link-create-account"
                className="font-semibold text-[#315B46] hover:text-[#264936]"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md surface-card rounded-xl p-6 shadow-xl border border-[#E4E8E3] text-[#202522]">
            <button
              type="button"
              id="close-forgot-modal"
              onClick={() => setForgotModalOpen(false)}
              className="absolute top-4 right-4 text-[#8C958F] hover:text-[#202522] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-base font-bold text-[#202522] mb-1.5">Reset Your Password</h3>
            <p className="text-xs text-[#69736C] mb-4 leading-relaxed">
              Password resets are managed securely through your organization administrator or via server-side CLI provisioning.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#69736C] uppercase tracking-wider mb-1">
                  Registered email address
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="input-field text-sm"
                />
              </div>

              {forgotMessage && (
                <div className="p-3 rounded-lg bg-[#F8F9F7] border border-[#E4E8E3] text-xs text-[#69736C] leading-relaxed">
                  {forgotMessage}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="btn-primary text-xs"
                >
                  {forgotLoading ? "Sending request…" : "Request Instructions"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
