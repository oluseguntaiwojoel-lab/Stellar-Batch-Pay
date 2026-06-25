"use client";

import Link from "next/link";
import { ShieldCheck, Wallet, History, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#030712] via-[#111827] to-[#030712] flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <section className="w-full max-w-3xl rounded-2xl border border-gray-700/50 bg-gray-900/60 p-8 shadow-xl backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
            <Wallet className="h-8 w-8" />
          </div>

          <div className="mt-6 space-y-3 text-center">
            <h1 className="text-3xl font-bold text-white md:text-4xl">
              Connect your Stellar wallet
            </h1>
            <p className="mx-auto max-w-2xl text-sm leading-6 text-gray-400 md:text-base">
              Stellar BatchPay does not use email/password accounts. Your wallet
              is your access key for building batches, viewing scoped history,
              and signing transactions.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <ConnectWalletButton />
            <Button asChild variant="outline" className="border-gray-700 bg-gray-800/60 text-gray-100 hover:bg-gray-800">
              <Link href="/dashboard/new-batch">
                Go to batch dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              <h2 className="mt-3 text-sm font-semibold text-white">No fake credentials</h2>
              <p className="mt-2 text-xs leading-5 text-gray-500">
                There is no password reset or social login backend to imply account security that does not exist.
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
              <Wallet className="h-5 w-5 text-emerald-300" />
              <h2 className="mt-3 text-sm font-semibold text-white">Wallet-scoped access</h2>
              <p className="mt-2 text-xs leading-5 text-gray-500">
                Batch jobs and history are tied to the connected Stellar public key.
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-4">
              <History className="h-5 w-5 text-emerald-300" />
              <h2 className="mt-3 text-sm font-semibold text-white">Real batch history</h2>
              <p className="mt-2 text-xs leading-5 text-gray-500">
                Connect the same wallet to review only the batches created by that wallet.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
