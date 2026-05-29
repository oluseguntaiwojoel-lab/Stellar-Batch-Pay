"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Wallet } from "lucide-react";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { Button } from "@/components/ui/button";

export default function RegistrationForm() {
  return (
    <section className="flex flex-col gap-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#00D4AA]/30 bg-[#00D4AA]/10 text-[#00D4AA]">
        <Wallet className="h-8 w-8" />
      </div>

      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-white">Start with your Stellar wallet</h1>
        <p className="text-sm leading-6 text-gray-400">
          BatchPay does not create password accounts. Connect Freighter or
          Ledger to scope your batches to your Stellar public key and sign
          payments from your own wallet.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <ConnectWalletButton />
        <Button asChild variant="outline" className="border-gray-700 bg-[#111827] text-gray-100 hover:bg-[#172033]">
          <Link href="/dashboard/new-batch">
            Open dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#0b1220] p-4 text-left">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <ShieldCheck className="h-4 w-4 text-[#00D4AA]" />
          Wallet-based access model
        </div>
        <p className="mt-2 text-xs leading-5 text-gray-500">
          Your connected public key is used to scope batch jobs, history, and
          progress reads. There are no inert social buttons or password forms.
        </p>
      </div>

      <p className="text-sm text-gray-400">
        Returning user?{" "}
        <Link href="/sign-in" className="font-semibold text-white transition-colors hover:text-[#00D4AA]">
          Connect the same wallet
        </Link>
      </p>
    </section>
  );
}
