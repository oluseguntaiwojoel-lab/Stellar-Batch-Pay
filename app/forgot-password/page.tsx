"use client";

import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { ConnectWalletButton } from "@/components/connect-wallet-button";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#030712] via-[#111827] to-[#030712] flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-900/60 p-8 text-center shadow-xl backdrop-blur-sm">
        <Link href="/sign-in" className="mb-8 inline-flex items-center text-sm text-gray-400 transition-colors hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to wallet access
        </Link>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
          <Wallet className="h-7 w-7" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-white">No password to reset</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">
          Stellar BatchPay uses wallet-based access instead of email/password
          accounts. Connect the Stellar wallet you used to create the batch.
        </p>

        <div className="mt-8 flex justify-center">
          <ConnectWalletButton />
        </div>
      </section>
    </main>
  );
}
