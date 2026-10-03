"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage(
        "Supabase configuration is missing. Please contact the administrator."
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      const signedInEmail = data.user.email?.toLowerCase();
      const accountType = data.user.user_metadata?.account_type;

      if (signedInEmail === ADMIN_EMAIL.toLowerCase()) {
        router.replace("/admin");
      } else if (accountType === "affiliate") {
        router.replace("/affiliate");
      } else {
        await supabase.auth.signOut();
        setMessage(
          "Your account role is not set. Please contact the administrator."
        );
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          {/* Network Growth Logo */}
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 border border-white/20 shadow-2xl backdrop-blur">
            <svg
              width="52"
              height="52"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 44L27 33L36 40L49 20"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M39 20H49V30"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="16" cy="44" r="5" fill="white" />
              <circle cx="27" cy="33" r="5" fill="white" />
              <circle cx="36" cy="40" r="5" fill="white" />
              <circle cx="49" cy="20" r="5" fill="white" />
            </svg>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            UpNetwork Cpa
          </h1>

          <p className="mt-2 text-sm text-blue-200">
            Performance • Growth • Network
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome Back
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Login to your UpNetwork Cpa account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Email Address
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Password
              </label>

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* Error */}
            {message && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p role="alert" className="text-sm text-red-600">
                  {message}
                </p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login to Account"}
            </button>
          </form>

          {/* Signup */}
          <div className="mt-7 border-t border-gray-100 pt-6 text-center">
            <p className="text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-blue-200/70">
          © {new Date().getFullYear()} UpNetwork Cpa. All rights reserved.
        </p>
      </div>
    </main>
  );
}
