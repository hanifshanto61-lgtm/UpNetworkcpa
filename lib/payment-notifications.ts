import "server-only";

import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPaidPaymentEmail } from "@/lib/send-payment-email";

const TABLE = "affiliate_payment_notifications";
const MAX_ATTEMPTS = 8;
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;

type EmailStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "skipped";

type PaymentNotice = {
  id: string;
  user_id: string;
  affiliate_id: string;
  amount: number | string;
  currency: string;
  payment_method: string;
  created_at: string;
  email_status: EmailStatus;
  email_attempts: number;
  email_locked_until: string | null;
  email_next_attempt_at: string;
};

export type PaymentEmailOutcome = {
  status: EmailStatus | "missing";
  error?: string;
};

export async function processPaymentEmail(
  client: SupabaseClient,
  paymentId: string
): Promise<PaymentEmailOutcome> {
  try {
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();

    if (error) {
      return {
        status: "failed",
        error: "Unable to read payment notification.",
      };
    }

    if (!data) {
      return {
        status: "missing",
        error: "Payment notification was not found.",
      };
    }

    const notice = data as PaymentNotice;

    if (
      notice.email_status === "sent" ||
      notice.email_status === "skipped"
    ) {
      return {
        status: notice.email_status,
      };
    }

    const now = Date.now();

    if (notice.email_attempts >= MAX_ATTEMPTS) {
      return {
        status: "failed",
        error:
          "Email retry limit reached; administrator review required.",
      };
    }

    // Stop automatic retries before the provider key expires.
    if (
      notice.email_attempts > 0 &&
      now - Date.parse(notice.created_at) >=
        RETRY_WINDOW_MS
    ) {
      return {
        status: "failed",
        error:
          "Email retry window expired; verify Resend logs before resending.",
      };
    }

    if (
      notice.email_status === "processing" &&
      notice.email_locked_until &&
      Date.parse(notice.email_locked_until) > now
    ) {
      return {
        status: "processing",
      };
    }

    if (
      Date.parse(notice.email_next_attempt_at) > now
    ) {
      return {
        status: notice.email_status,
      };
    }

    const claimToken = randomUUID();
    const nowIso = new Date(now).toISOString();

    // Only one request can claim the current attempt.
    let claim = client
      .from(TABLE)
      .update({
        email_status: "processing",
        email_attempts: notice.email_attempts + 1,
        email_claim_token: claimToken,
        email_locked_until: new Date(
          now + 120000
        ).toISOString(),
      })
      .eq("id", paymentId)
      .eq("email_status", notice.email_status)
      .eq("email_attempts", notice.email_attempts)
      .lte("email_next_attempt_at", nowIso);

    if (notice.email_status === "processing") {
      if (notice.email_locked_until) {
        claim = claim.lte(
          "email_locked_until",
          nowIso
        );
      } else {
        claim = claim.is(
          "email_locked_until",
          null
        );
      }
    }

    const {
      data: claimed,
      error: claimError,
    } = await claim
      .select("id")
      .maybeSingle();

    if (claimError) {
      return {
        status: "failed",
        error: "Unable to claim payment email.",
      };
    }

    if (!claimed) {
      return {
        status: "processing",
      };
    }

    let accepted = false;
    let failure = "";

    try {
      // Use the recipient's Auth user ID to resolve their email.
      const {
        data: authData,
        error: userError,
      } = await client.auth.admin.getUserById(
        notice.user_id
      );

      if (
        userError ||
        !authData?.user?.email
      ) {
        failure =
          "Payment recipient email could not be verified.";
      } else {
        const result = await sendPaidPaymentEmail({
          to: authData.user.email,
          paymentId: notice.id,
          affiliateId: notice.affiliate_id,
          amount: Number(notice.amount),
          currency: notice.currency,
          paymentMethod: notice.payment_method,
          paidAt: notice.created_at,
        });

        accepted = result.accepted;
        failure = result.error || "";
      }
    } catch {
      failure = "Payment email processing failed.";
    }

    const retryDelay = Math.min(
      3600000,
      30000 * Math.pow(2, notice.email_attempts)
    );

    const {
      data: saved,
      error: saveError,
    } = await client
      .from(TABLE)
      .update({
        email_status: accepted ? "sent" : "failed",
        email_sent_at: accepted
          ? new Date().toISOString()
          : null,
        email_last_error: accepted
          ? null
          : failure.slice(0, 500),
        email_locked_until: null,
        email_claim_token: null,
        email_next_attempt_at: new Date(
          Date.now() + retryDelay
        ).toISOString(),
      })
      .eq("id", paymentId)
      .eq("email_claim_token", claimToken)
      .select("id")
      .maybeSingle();

    if (saveError || !saved) {
      return {
        status: "processing",
        error: accepted
          ? "Email accepted by Resend; its saved status could not be confirmed."
          : "Unable to save email failure details.",
      };
    }

    return accepted
      ? {
          status: "sent",
        }
      : {
          status: "failed",
          error: failure,
        };
  } catch {
    return {
      status: "failed",
      error: "Payment email processing unavailable.",
    };
  }
}

export async function processPendingPaymentEmails(
  client: SupabaseClient,
  userId?: string
): Promise<PaymentEmailOutcome[]> {
  const now = Date.now();

  let query = client
    .from(TABLE)
    .select("id")
    .in("email_status", [
      "pending",
      "failed",
      "processing",
    ])
    .lt("email_attempts", MAX_ATTEMPTS)
    .lte(
      "email_next_attempt_at",
      new Date(now).toISOString()
    )
    .or(
      "email_attempts.eq.0,created_at.gt." +
        new Date(
          now - RETRY_WINDOW_MS
        ).toISOString()
    )
    .order("created_at", {
      ascending: true,
    })
    .limit(3);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      "Unable to read pending payment emails."
    );
  }

  const outcomes: PaymentEmailOutcome[] = [];

  for (const row of data || []) {
    outcomes.push(
      await processPaymentEmail(client, row.id)
    );
  }

  return outcomes;
}
