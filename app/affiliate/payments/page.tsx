"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  DollarSign,
  Clock3,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  Send,
  AlertCircle,
  Sun,
  Moon,
  History,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAffiliateTheme } from "../theme-context";

type Payment = {
  id: string;
  amount: number;
  withdrawalFee: number;
  totalDebit: number;
  currency: string;
  paymentMethod: string;
  paymentAddress: string;
  status: string;
  adminNote: string | null;
  requestedAt: string;
  processedAt: string | null;
};

type PaymentStats = {
  totalEarnings: number;
  conversions: number;
  eligibleConversions: number;
  firstWithdrawalCompleted: boolean;
  reservedFees: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  rejectedAmount: number;
  reservedAmount: number;
  availableBalance: number;
  totalRequests: number;
};

type PaymentsResponse = {
  success: boolean;
  error?: string;
  affiliateId?: string;
  currency?: string;
  stats?: PaymentStats;
  payments?: Payment[];
  withdrawalEnabled?: boolean;
  minimumWithdrawal?: number;
  paymentMethods?: string[];
};

const PAYMENT_METHODS = [
  "Payoneer",
  "Skrill",
  "Binance Pay",
  "USDT (TRC20)",
  "USDT (ERC20)",
  "Bitcoin (BTC)",
  "Bank Wire Transfer",
];

const MINIMUM_WITHDRAWAL = 50;
const MINIMUM_CONVERSIONS = 30;

function withdrawalQuote(value: number) {
  const cents = Math.round(value * 100);
  if (!Number.isFinite(value) || cents < 5000 || cents > 100000000) return null;
  const feeCents = cents < 10000 ? 500 : Math.floor((cents * 3 + 50) / 100);
  return { amount: cents / 100, fee: feeCents / 100, total: (cents + feeCents) / 100 };
}

const emptyStats: PaymentStats = {
  totalEarnings: 0,
  conversions: 0,
  eligibleConversions: 0,
  firstWithdrawalCompleted: false,
  reservedFees: 0,
  pendingAmount: 0,
  approvedAmount: 0,
  paidAmount: 0,
  rejectedAmount: 0,
  reservedAmount: 0,
  availableBalance: 0,
  totalRequests: 0,
};

function money(value: number): string {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value: string): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

function statusStyle(status: string): string {
  switch (status.toLowerCase()) {
    case "paid":
      return "bg-emerald-500/10 text-emerald-400";
    case "approved":
      return "bg-blue-500/10 text-blue-400";
    case "rejected":
      return "bg-red-500/10 text-red-400";
    default:
      return "bg-amber-500/10 text-amber-400";
  }
}

function addressPlaceholder(method: string): string {
  switch (method) {
    case "Payoneer":
    case "Skrill":
      return "Enter your payment account email";
    case "Binance Pay":
      return "Enter your Binance Pay ID";
    case "USDT (TRC20)":
      return "Enter your TRC20 wallet address";
    case "USDT (ERC20)":
      return "Enter your ERC20 wallet address";
    case "Bitcoin (BTC)":
      return "Enter your Bitcoin wallet address";
    case "Bank Wire Transfer":
      return "Enter your bank account details";
    default:
      return "Enter your payment details";
  }
}

type SavedPaymentDetails = { id: string; method: string; address: string; label: string };

function savedAccountChoices(settings: Record<string, unknown> | undefined): SavedPaymentDetails[] {
  const rows = Array.isArray(settings?.paymentAccounts) ? settings.paymentAccounts : [];
  const choices: SavedPaymentDetails[] = [];
  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const label = typeof row.paymentMethod === "string" ? row.paymentMethod.trim() : "";
    const address = typeof row.paymentAddress === "string" ? row.paymentAddress.trim() : "";
    const method = label === "Bank Transfer" ? "Bank Wire Transfer" : label;
    if (typeof row.id === "string" && address) choices.push({ id: row.id, method: PAYMENT_METHODS.includes(method) ? method : "", address, label });
  }
  // Retain compatibility with an existing single saved address during rollout.
  if (!choices.length && typeof settings?.paymentAddress === "string" && settings.paymentAddress.trim()) {
    const label = typeof settings.paymentMethod === "string" ? settings.paymentMethod.trim() : "";
    const method = label === "Bank Transfer" ? "Bank Wire Transfer" : label;
    choices.push({ id: "previous-default", method: PAYMENT_METHODS.includes(method) ? method : "", address: settings.paymentAddress.trim(), label });
  }
  return choices;
}

export default function AffiliatePaymentsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useAffiliateTheme();

  const dark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [affiliateId, setAffiliateId] = useState("");
  const [stats, setStats] = useState<PaymentStats>(
    emptyStats
  );
  const [payments, setPayments] = useState<Payment[]>(
    []
  );

  const [withdrawalEnabled, setWithdrawalEnabled] =
    useState(false);

  const [minimumWithdrawal, setMinimumWithdrawal] =
    useState(MINIMUM_WITHDRAWAL);

  const [paymentMethods, setPaymentMethods] =
    useState<string[]>(PAYMENT_METHODS);

  const [withdrawAmount, setWithdrawAmount] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("");

  const [paymentAddress, setPaymentAddress] =
    useState("");

  const paymentDetailsEditedRef = useRef(false);
  const savedPaymentDefaultsRef = useRef({ method: "", address: "" });
  const newPaymentDraftRef = useRef({ method: "", address: "" });
  const [paymentDetailsMode, setPaymentDetailsMode] = useState<"saved" | "new">("new");
  const [saveNewPaymentDefault, setSaveNewPaymentDefault] = useState(false);
  const [savedPaymentDetails, setSavedPaymentDetails] = useState<SavedPaymentDetails | null>(null);
  const [paymentAccounts, setPaymentAccounts] = useState<SavedPaymentDetails[]>([]);
  const firstSavedAccountRef = useRef<SavedPaymentDetails | null>(null);
  const [savedDetailsNotice, setSavedDetailsNotice] = useState("");

  const quote = withdrawalQuote(Number(withdrawAmount));
  const eligibleConversions = Number(stats.eligibleConversions) || 0;
  const firstWithdrawalCompleted = stats.firstWithdrawalCompleted === true;
  const missingConversions = firstWithdrawalCompleted ? 0 : Math.max(0, MINIMUM_CONVERSIONS - eligibleConversions);

  const pageBg = dark
    ? "bg-[#05070c] text-white"
    : "bg-slate-50 text-slate-900";

  const cardBg = dark
    ? "border-white/10 bg-[#0b1020]"
    : "border-slate-200 bg-white";

  const inputBg = dark
    ? "border-white/10 bg-[#080c17] text-white"
    : "border-slate-200 bg-white text-slate-900";

  const muted = dark
    ? "text-slate-400"
    : "text-slate-500";

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      const token =
        sessionData.session?.access_token;

      if (sessionError || !token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/affiliate/payments",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const result: PaymentsResponse =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          "Unable to load payments."
        );
      }

      setAffiliateId(result.affiliateId || "");
      setStats(result.stats || emptyStats);

      setPayments(
        Array.isArray(result.payments)
          ? result.payments
          : []
      );

      setWithdrawalEnabled(
        result.withdrawalEnabled === true
      );

      setMinimumWithdrawal(
        Math.max(
          MINIMUM_WITHDRAWAL,
          Number(result.minimumWithdrawal) ||
            MINIMUM_WITHDRAWAL
        )
      );

      const allowedMethods =
        Array.isArray(result.paymentMethods)
          ? result.paymentMethods.filter(
              (method) =>
                PAYMENT_METHODS.includes(method)
            )
          : PAYMENT_METHODS;

      setPaymentMethods(allowedMethods);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load payments."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  // Load saved defaults once. Refreshing payment history must not erase a draft.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function loadSavedPaymentDetails() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (cancelled || sessionError || !token) return;
        const response = await fetch("/api/affiliate/settings", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error("Saved details unavailable");
        if (cancelled) return;
        const choices = savedAccountChoices(result.settings);
        const first = choices[0] || null;
        setPaymentAccounts(choices);
        firstSavedAccountRef.current = first;
        savedPaymentDefaultsRef.current = { method: first?.method || "", address: first?.address || "" };
        setSavedPaymentDetails(first);
        if (paymentDetailsEditedRef.current) return;
        setPaymentDetailsMode(first ? "saved" : "new");
        setPaymentAddress(first?.address || "");
        setPaymentMethod(first?.method || "");
        if (first?.method) {
          setSavedDetailsNotice("Your first saved account is selected by default. Choose another saved account or enter a new address.");
        } else if (first?.label) {
          setSavedDetailsNotice(`Saved method: ${first.label}. Select a supported payment method and check that the saved address matches it.`);
        }
      } catch {
        if (!cancelled && !paymentDetailsEditedRef.current) {
          setSavedDetailsNotice("Saved payment details could not be loaded. You can enter them manually below.");
        }
      }
    }
    void loadSavedPaymentDetails();
    return () => { cancelled = true; controller.abort(); };
  }, []);

  function choosePaymentDetails(mode: "saved" | "new") {
    paymentDetailsEditedRef.current = true;
    if (paymentDetailsMode === "new") {
      newPaymentDraftRef.current = { method: paymentMethod, address: paymentAddress };
    }
    if (mode === "saved" && savedPaymentDetails) {
      setPaymentMethod(savedPaymentDetails.method);
      setPaymentAddress(savedPaymentDetails.address);
    } else {
      setPaymentMethod(newPaymentDraftRef.current.method);
      setPaymentAddress(newPaymentDraftRef.current.address);
    }
    setPaymentDetailsMode(mode);
  }

  async function submitWithdrawal(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting || !withdrawalEnabled) return;

    setError("");
    setSuccess("");

    const requestedAmount =
      Number(withdrawAmount);

    if (
      !withdrawAmount.trim() ||
      !Number.isFinite(requestedAmount) ||
      requestedAmount < minimumWithdrawal ||
      requestedAmount > 1000000 ||
      Math.round(requestedAmount * 100) / 100 !==
        requestedAmount
    ) {
      setError(
        `Enter a valid amount of at least ${money(minimumWithdrawal)} with at most 2 decimal places.`
      );
      return;
    }

    if (missingConversions > 0) {
      setError(`At least 30 approved conversions are required for your first withdrawal. You need ${missingConversions} more.`);
      return;
    }
    const requestedQuote = withdrawalQuote(requestedAmount);
    if (!requestedQuote || Math.round(requestedQuote.total * 100) > Math.round(stats.availableBalance * 100)) {
      setError(`Insufficient available balance including fee. Required: ${money(requestedQuote?.total || 0)}.`);
      return;
    }

    if (!paymentMethods.includes(paymentMethod)) {
      setError(
        "Select a valid payment method."
      );
      return;
    }

    if (
      paymentAddress.trim().length < 3 ||
      paymentAddress.trim().length > 500
    ) {
      setError(
        "Enter valid payment details."
      );
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      const token =
        sessionData.session?.access_token;

      if (sessionError || !token) {
        router.replace("/login");
        return;
      }

      if (paymentDetailsMode === "new" && saveNewPaymentDefault) {
        const saveResponse = await fetch("/api/affiliate/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ paymentMethod, paymentAddress: paymentAddress.trim() }),
        });
        const savedResult = await saveResponse.json();
        if (!saveResponse.ok || !savedResult.success) {
          throw new Error(savedResult.error || "Payment details could not be saved. No withdrawal was submitted.");
        }
        const choices = savedAccountChoices(savedResult.settings);
        const first = choices[0] || { id: "just-saved", method: paymentMethod, address: paymentAddress.trim(), label: paymentMethod };
        firstSavedAccountRef.current = first;
        savedPaymentDefaultsRef.current = { method: first.method, address: first.address };
        setPaymentAccounts(choices.length ? choices : [first]);
        setSavedPaymentDetails(first);
        setSavedDetailsNotice("The account has been added to your saved withdrawal accounts. Your first account remains the default.");
      }

      const response = await fetch(
        "/api/affiliate/payments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: requestedAmount,
            paymentMethod,
            paymentAddress:
              paymentAddress.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          "Withdrawal request failed."
        );
      }

      setWithdrawAmount("");
      newPaymentDraftRef.current = { method: "", address: "" };
      setSaveNewPaymentDefault(false);
      setPaymentDetailsMode(savedPaymentDefaultsRef.current.address ? "saved" : "new");
      setSavedPaymentDetails(firstSavedAccountRef.current);
      setPaymentMethod(savedPaymentDefaultsRef.current.method);
      setPaymentAddress(savedPaymentDefaultsRef.current.address);

      await loadPayments();

      setSuccess(
        "Withdrawal request submitted successfully. Your request is pending admin review."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Withdrawal request failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`min-h-screen ${pageBg}`}>
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
          dark
            ? "border-white/10 bg-[#05070c]/95"
            : "border-slate-200 bg-white/95"
        }`}
      >
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                router.push("/affiliate")
              }
              aria-label="Back to dashboard"
              className={`flex h-10 w-10 items-center justify-center rounded-xl border ${inputBg}`}
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="text-xl font-black sm:text-2xl">
                Payments
              </h1>
              <p className={`text-xs ${muted}`}>
                UpNetwork CPA Affiliate Panel
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${inputBg}`}
          >
            {dark ? (
              <Sun size={18} />
            ) : (
              <Moon size={18} />
            )}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        <section
          className={`mb-7 rounded-3xl border p-6 sm:p-8 ${cardBg}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
              <Wallet size={25} />
            </div>

            <div>
              <h2 className="text-2xl font-black">
                Payment Center
              </h2>
              <p className={`mt-1 text-sm ${muted}`}>
                Affiliate ID:{" "}
                {affiliateId || "Loading..."}
              </p>
            </div>
          </div>

          <p className={`mt-4 text-sm ${muted}`}>
            Manage international withdrawals,
            check your USD balance and
            track payment history.
          </p>
        </section>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle
              size={19}
              className="shrink-0"
            />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            <CheckCircle2
              size={19}
              className="shrink-0"
            />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <RefreshCw
                size={32}
                className="mx-auto mb-4 animate-spin text-cyan-400"
              />
              <p className={muted}>
                Loading payments...
              </p>
            </div>
          </div>
        ) : (
          <>
            <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                <div className="mb-3 flex items-center justify-between text-emerald-400">
                  <span className="text-sm font-semibold">
                    Available Balance
                  </span>
                  <Wallet size={20} />
                </div>

                <p className="text-3xl font-black">
                  {money(stats.availableBalance)}
                </p>

                <p className={`mt-2 text-xs ${muted}`}>
                  Estimated balance available
                  for withdrawal
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
                <div className="mb-3 flex items-center justify-between text-blue-400">
                  <span className="text-sm font-semibold">
                    Total Earnings
                  </span>
                  <DollarSign size={20} />
                </div>

                <p className="text-3xl font-black">
                  {money(stats.totalEarnings)}
                </p>

                <p className={`mt-2 text-xs ${muted}`}>
                  Recorded affiliate earnings
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                <div className="mb-3 flex items-center justify-between text-amber-400">
                  <span className="text-sm font-semibold">
                    Pending Payments
                  </span>
                  <Clock3 size={20} />
                </div>

                <p className="text-3xl font-black">
                  {money(stats.pendingAmount)}
                </p>

                <p className={`mt-2 text-xs ${muted}`}>
                  Awaiting admin review
                </p>
              </div>

              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5">
                <div className="mb-3 flex items-center justify-between text-purple-400">
                  <span className="text-sm font-semibold">
                    Total Paid
                  </span>
                  <CreditCard size={20} />
                </div>

                <p className="text-3xl font-black">
                  {money(stats.paidAmount)}
                </p>

                <p className={`mt-2 text-xs ${muted}`}>
                  Marked paid by admin
                </p>
              </div>
            </section>

            <section className="mb-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div
                className={`rounded-2xl border p-6 ${cardBg}`}
              >
                <div className="mb-5 flex items-center gap-2">
                  <Send
                    size={20}
                    className="text-cyan-400"
                  />
                  <h3 className="text-lg font-bold">
                    Request Withdrawal
                  </h3>
                </div>

                <div className="mb-5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    Minimum Withdrawal
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {money(minimumWithdrawal)} USD
                  </p>
                </div>

                <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-sm font-bold">
                    {firstWithdrawalCompleted ? "First withdrawal completed — no further lead minimum" : `First withdrawal: ${eligibleConversions}/30 approved conversions`}
                  </p>
                  <p className={`mt-2 text-xs ${muted}`}>
                    {firstWithdrawalCompleted
                      ? "You can withdraw with any number of new conversions once your available balance covers $50 or more plus the fee."
                      : missingConversions > 0
                        ? `${missingConversions} more approved conversions required for your first withdrawal.`
                        : "Conversion requirement met for your first withdrawal."}
                    {" "}The 30-conversion rule applies only until your first payment is marked Paid.
                  </p>
                  <p className={`mt-3 text-xs ${muted}`}>All payment methods: $50–$99.99 adds a $5 fee; $100 or more adds a 3% fee. Fees are charged on top.</p>
                </div>

                {savedDetailsNotice && <p className={`mb-4 text-sm ${muted}`} role="status">{savedDetailsNotice}</p>}

                <form
                  onSubmit={submitWithdrawal}
                  className="space-y-4"
                >
                  <div>
                    <label className={`mb-2 block text-sm ${muted}`}>
                      Withdrawal Amount (USD)
                    </label>

                    <input
                      type="number"
                      min={minimumWithdrawal}
                      max={Math.min(
                        stats.availableBalance,
                        1000000
                      )}
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(event) =>
                        setWithdrawAmount(
                          event.target.value
                        )
                      }
                      placeholder="Enter amount in USD"
                      required
                      className={`w-full rounded-xl border px-4 py-3 outline-none focus:border-cyan-500 ${inputBg}`}
                    />

                    <p className={`mt-2 text-xs ${muted}`}>
                      Minimum:{" "}
                      {money(minimumWithdrawal)}
                    </p>
                  </div>

                  <fieldset className="space-y-3">
                    <legend className="mb-2 text-sm font-bold">Choose payment address</legend>
                    <label className={`block rounded-xl border p-4 ${inputBg} ${!savedPaymentDetails ? "opacity-60" : "cursor-pointer"}`}>
                      <span className="flex items-center gap-3">
                        <input type="radio" name="payment-address-source" value="saved" checked={paymentDetailsMode === "saved"} disabled={!savedPaymentDetails} onChange={() => choosePaymentDetails("saved")} />
                        <span className="font-semibold">Use saved payment address</span>
                      </span>
                      {savedPaymentDetails ? (
                        <span className={`mt-2 block text-xs ${muted}`}>{paymentAccounts.length} saved account{paymentAccounts.length === 1 ? "" : "s"}. Choose an account from the dropdown below.</span>
                      ) : <span className={`mt-2 block text-xs ${muted}`}>No saved address loaded. You can enter a new address below or save one in Settings.</span>}
                    </label>
                    <label className={`block cursor-pointer rounded-xl border p-4 ${inputBg}`}>
                      <span className="flex items-center gap-3">
                        <input type="radio" name="payment-address-source" value="new" checked={paymentDetailsMode === "new"} onChange={() => choosePaymentDetails("new")} />
                        <span className="font-semibold">Use a new payment address / ID</span>
                      </span>
                      <span className={`mt-2 block text-xs ${muted}`}>Enter different details for this withdrawal only.</span>
                    </label>
                  </fieldset>

                  {paymentDetailsMode === "saved" && paymentAccounts.length > 0 && (
                    <div>
                      <label className={`mb-2 block text-sm ${muted}`}>Select saved payment account</label>
                      <select aria-label="Saved withdrawal account" value={savedPaymentDetails?.id || ""}
                        onChange={(event) => {
                          const account = paymentAccounts.find((item) => item.id === event.target.value);
                          if (!account) return;
                          paymentDetailsEditedRef.current = true;
                          setSavedPaymentDetails(account);
                          setPaymentMethod(account.method);
                          setPaymentAddress(account.address);
                        }}
                        className={`w-full min-w-0 rounded-xl border px-4 py-3 ${inputBg}`}>
                        {paymentAccounts.map((account, index) => (
                          <option key={account.id} value={account.id}>Account {index + 1}{index === 0 ? " (Default)" : ""} — {account.label} — {account.address}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className={`mb-2 block text-sm ${muted}`}>
                      Payment Method
                    </label>

                    <select
                      value={paymentMethod}
                      aria-label="Payment method"
                      disabled={paymentDetailsMode === "saved" && Boolean(savedPaymentDetails?.method)}
                      onChange={(event) => {
                        paymentDetailsEditedRef.current = true;
                        setPaymentMethod(event.target.value);
                        // Preserve initial legacy address until a method is chosen;
                        // clear it when switching between selected methods/networks.
                        if (paymentDetailsMode === "new" && paymentMethod && paymentMethod !== event.target.value) {
                          setPaymentAddress("");
                        }
                      }}
                      required
                      className={`w-full rounded-xl border px-4 py-3 outline-none focus:border-cyan-500 ${inputBg}`}
                    >
                      <option value="">
                        Select payment method
                      </option>

                      {paymentMethods.map((method) => (
                        <option
                          key={method}
                          value={method}
                        >
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`mb-2 block text-sm ${muted}`}>
                      Payment Address / Account
                    </label>

                    <textarea
                      value={paymentAddress}
                      readOnly={paymentDetailsMode === "saved"}
                      onChange={(event) => {
                        paymentDetailsEditedRef.current = true;
                        setPaymentAddress(event.target.value);
                      }}
                      placeholder={addressPlaceholder(
                        paymentMethod
                      )}
                      rows={3}
                      maxLength={500}
                      required
                      className={`w-full rounded-xl border px-4 py-3 outline-none focus:border-cyan-500 ${inputBg}`}
                    />

                    {(paymentMethod === "USDT (TRC20)" ||
                      paymentMethod === "USDT (ERC20)" ||
                      paymentMethod === "Bitcoin (BTC)") && (
                      <p className="mt-2 text-xs text-amber-400">
                        Check the selected network
                        and wallet address carefully.
                        Transfers to an incorrect
                        network or address may be
                        irreversible.
                      </p>
                    )}
                  </div>

                  {paymentDetailsMode === "new" && (
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm ${inputBg}`}>
                      <input type="checkbox" checked={saveNewPaymentDefault} onChange={(event) => setSaveNewPaymentDefault(event.target.checked)} className="mt-1" />
                      <span>
                        <strong>Save this address for future withdrawals</strong>
                        <span className={`mt-1 block text-xs ${muted}`}>When you submit, add this account to your saved accounts. Existing accounts stay saved. If saving fails, no withdrawal request will be submitted.</span>
                      </span>
                    </label>
                  )}

                  <p className={`text-xs ${muted}`}>
                    {paymentDetailsMode === "saved" ? "Your saved address will be used. Choose the new-address option to use a different account." : saveNewPaymentDefault ? "This account will be added to your saved list. The first saved account remains the default." : "The new address is used for this withdrawal only. Your saved Settings will stay unchanged."}
                  </p>

                  {quote && (
                    <div className={`rounded-xl border p-4 text-sm ${inputBg}`} aria-live="polite">
                      <div className="flex justify-between gap-3"><span>You receive</span><strong>{money(quote.amount)}</strong></div>
                      <div className="mt-2 flex justify-between gap-3"><span>Additional fee</span><strong>{money(quote.fee)}</strong></div>
                      <div className="mt-3 flex justify-between gap-3 border-t border-slate-500/20 pt-3"><span>Total balance deduction</span><strong>{money(quote.total)}</strong></div>
                      {Math.round(quote.total * 100) > Math.round(stats.availableBalance * 100) && <p className="mt-3 text-amber-500">You need {money(quote.total - stats.availableBalance)} more available balance, including fee.</p>}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      !withdrawalEnabled ||
                      missingConversions > 0 ||
                      !quote ||
                      Math.round((quote?.total || 0) * 100) > Math.round(stats.availableBalance * 100)
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw
                          size={18}
                          className="animate-spin"
                        />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Submit Withdrawal Request
                      </>
                    )}
                  </button>

                  {!withdrawalEnabled && (
                    <p className="text-sm text-amber-400">
                      Withdrawals are currently
                      unavailable.
                    </p>
                  )}

                  {withdrawalEnabled &&
                    stats.availableBalance <
                      minimumWithdrawal + 5 && (
                      <p className={`text-sm ${muted}`}>
                        You need at least{" "}
                        {money(minimumWithdrawal + 5)}
                        {" "}in available balance (including the $5 fee)
                        to request a withdrawal.
                      </p>
                    )}
                </form>
              </div>

              <div
                className={`rounded-2xl border p-6 ${cardBg}`}
              >
                <div className="mb-5 flex items-center gap-2">
                  <ShieldCheck
                    size={21}
                    className="text-emerald-400"
                  />
                  <h3 className="text-lg font-bold">
                    Payment Information
                  </h3>
                </div>

                <div className="space-y-4">
                  <div
                    className={`rounded-xl border p-4 ${inputBg}`}
                  >
                    <p className={`text-xs ${muted}`}>
                      Approved Payments
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {money(stats.approvedAmount)}
                    </p>
                  </div>

                  <div
                    className={`rounded-xl border p-4 ${inputBg}`}
                  >
                    <p className={`text-xs ${muted}`}>
                      Reserved Balance
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {money(stats.reservedAmount)}
                    </p>
                  </div>

                  <div
                    className={`rounded-xl border p-4 ${inputBg}`}
                  >
                    <p className={`text-xs ${muted}`}>
                      Total Requests
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {stats.totalRequests}
                    </p>
                  </div>

                  <p className={`text-sm ${muted}`}>
                    Reserved balance includes fees on pending, approved and paid requests. Rejected requests release both amount and fee.
                    All withdrawals are
                    denominated in USD.
                    Crypto payouts require
                    manual verification by
                    the admin. Submitting
                    a request does not mean
                    payment has been sent.
                  </p>
                </div>
              </div>
            </section>

            <section
              className={`overflow-hidden rounded-2xl border ${cardBg}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <History
                      size={20}
                      className="text-cyan-400"
                    />
                    <h3 className="text-lg font-bold">
                      Payment History
                    </h3>
                  </div>

                  <p className={`mt-1 text-xs ${muted}`}>
                    Your withdrawal requests
                    and their current status
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void loadPayments()
                  }
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm ${inputBg}`}
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead
                    className={
                      dark
                        ? "bg-white/5 text-slate-400"
                        : "bg-slate-50 text-slate-600"
                    }
                  >
                    <tr>
                      <th className="px-5 py-4">
                        Date
                      </th>
                      <th className="px-5 py-4">
                        Amount
                      </th>
                      <th className="px-5 py-4">
                        Method
                      </th>
                      <th className="px-5 py-4">
                        Status
                      </th>
                      <th className="px-5 py-4">
                        Admin Note
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className={
                          dark
                            ? "border-t border-white/10"
                            : "border-t border-slate-200"
                        }
                      >
                        <td className="px-5 py-4">
                          {formatDate(
                            payment.requestedAt
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold">
                          {money(payment.amount)}
                          <p className={`mt-1 text-xs font-normal ${muted}`}>Fee: {money(payment.withdrawalFee)}</p>
                          <p className={`mt-1 text-xs font-normal ${muted}`}>Total debit: {money(payment.totalDebit ?? payment.amount)}</p>
                        </td>

                        <td className="px-5 py-4">
                          {payment.paymentMethod}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${statusStyle(payment.status)}`}
                          >
                            {payment.status}
                          </span>
                        </td>

                        <td className={`px-5 py-4 ${muted}`}>
                          {payment.adminNote || "-"}
                        </td>
                      </tr>
                    ))}

                    {payments.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className={`px-5 py-12 text-center ${muted}`}
                        >
                          No payment requests yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}