"use client";

import Link from "next/link";
import { Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-55 dark:bg-zinc-950 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl p-8 md:p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Shield size={24} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Privacy Policy</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Effective Date: July 3, 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">
          <p className="font-semibold text-gray-900 dark:text-white">
            At Isoko, your privacy is our priority. We design our features with security in mind.
          </p>

          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">1. Information Collection</h2>
            <p>We collect your verified phone number to generate deterministic credentials for your account. This ensures a passwordless and secure login experience.</p>
          </div>

          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">2. Data Usage</h2>
            <p>We use your profile details, online/offline last-seen indicators, and messages to deliver the core chat features of the app and connect you with others.</p>
          </div>

          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">3. Data Management</h2>
            <p>You can access, manage, and delete your profile details, settings, or your entire account at any time in the app settings.</p>
          </div>
        </div>

        <div className="h-[1px] bg-gray-150 dark:bg-zinc-800 my-8" />

        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400 dark:text-zinc-500">© 2026 Isoko App</span>
          <Link href="/login" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
            Go back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
