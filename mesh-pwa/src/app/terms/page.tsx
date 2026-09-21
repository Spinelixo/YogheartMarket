"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-55 dark:bg-zinc-950 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl p-8 md:p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <FileText size={24} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Terms of Service</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Effective Date: July 3, 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-gray-700 dark:text-zinc-300 leading-relaxed">
          <p className="font-semibold text-gray-900 dark:text-white">
            Welcome to Isoko. By accessing or using our services, you agree to be bound by these Terms.
          </p>

          <p>
            We use your information to create your account, deliver our services, and help keep Isoko safe and secure. In settings, you can access, manage, and delete your account information.
          </p>

          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">1. Use of Service</h2>
            <p>You must be at least 18 years old to use Isoko. You agree to provide accurate, truthful, and complete registration information during account creation.</p>
          </div>

          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">2. Account Safety</h2>
            <p>You are responsible for maintaining the confidentiality of your session token and verification access. Do not share your login verification codes with others.</p>
          </div>

          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">3. Content Policy</h2>
            <p>You agree not to send abusive, offensive, harassing, or unsolicited messages to other users of our platform. We reserve the right to suspend accounts violating this policy.</p>
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
