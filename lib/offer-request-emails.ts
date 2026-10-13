import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type Notice = {
  id: string;
  request_id: string;
  recipient_id: string;
  recipient_email: string;
  event: string;
  subject: string;
  message: string;
  attempts: number;
  claim_token: string;
};

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return value.replace(
    /[&<>"']/g,
    (char) => entities[char]
  );
}

async function sendNotice(notice: Notice) {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    return {
      accepted: false,
      error: "RESEND_API_KEY is missing.",
    };
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      notice.recipient_email
    )
  ) {
    return {
      accepted: false,
      error: "Invalid recipient email.",
    };
  }

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    6000
  );

  try {
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,

        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `offer-notice/${notice.id}`,
        },

        body: JSON.stringify({
          from:
            "UpNetwork CPA <noreply@upnetworkcpa.com>",

          to: [notice.recipient_email],
          subject: notice.subject,

          text:
            `UpNetwork CPA\n\n${notice.message}`,

          html: `
            <div style="
              font-family:Arial,sans-serif;
              max-width:600px;
              margin:auto;
              padding:24px;
            ">
              <h1>UpNetwork CPA</h1>

              <h2>
                ${escapeHtml(notice.subject)}
              </h2>

              <div style="
                white-space:pre-wrap;
                line-height:1.7;
              ">${escapeHtml(notice.message)}</div>
            </div>
          `,
        }),
      }
    );

    const result = await response
      .json()
      .catch(() => null);

    if (
      !response.ok ||
      typeof result?.id !== "string"
    ) {
      return {
        accepted: false,

        error:
          `Resend HTTP ${response.status}: ` +
          String(
            result?.message ||
              "Email request failed"
          ).slice(0, 300),
      };
    }

    return {
      accepted: true,
      providerId: result.id as string,
    };
  } catch {
    return {
      accepted: false,
      error:
        "Email provider timed out or could not be reached.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function processOfferRequestEmails(
  client: SupabaseClient,
  requestId?: string,
  limit = 4
) {
  const { data, error } = await client.rpc(
    "claim_offer_request_emails",
    {
      p_request_id: requestId ?? null,
      p_limit: limit,
    }
  );

  if (error) {
    throw new Error(
      "Unable to claim offer request emails."
    );
  }

  const outcomes: {
    id: string;
    status: string;
  }[] = [];

  for (const notice of (data ?? []) as Notice[]) {
    let skipped = false;

    if (notice.event === "request_admin") {
      const {
        data: role,
        error: roleError,
      } = await client
        .from("admin_roles")
        .select("role,is_active")
        .eq("user_id", notice.recipient_id)
        .maybeSingle();

      if (roleError) {
        throw new Error(
          "Unable to verify email recipient role."
        );
      }

      skipped =
        !role ||
        !role.is_active ||
        !["super_admin", "sub_admin"].includes(
          role.role
        );
    }

    const result = skipped
      ? {
          accepted: false,
          error:
            "Recipient is no longer an active admin.",
        }
      : await sendNotice(notice);

    const status = skipped
      ? "skipped"
      : result.accepted
        ? "sent"
        : "failed";

    const retryDelay = Math.min(
      3600000,
      30000 * 2 ** notice.attempts
    );

    const {
      data: saved,
      error: saveError,
    } = await client
      .from("offer_request_emails")
      .update({
        email_status: status,

        provider_id:
          "providerId" in result
            ? result.providerId
            : null,

        last_error: result.accepted
          ? null
          : result.error || "Email failed.",

        sent_at: result.accepted
          ? new Date().toISOString()
          : null,

        claim_token: null,
        locked_until: null,

        next_attempt_at: new Date(
          Date.now() + retryDelay
        ).toISOString(),
      })
      .eq("id", notice.id)
      .eq("claim_token", notice.claim_token)
      .select("id")
      .maybeSingle();

    outcomes.push({
      id: notice.id,
      status:
        saveError || !saved
          ? "processing"
          : status,
    });

    if (status === "failed") {
      console.error(
        "Offer request email",
        notice.id,
        result.error
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 550)
    );
  }

  return outcomes;
}

export async function tryOfferRequestEmails(
  client: SupabaseClient,
  requestId: string
) {
  try {
    await processOfferRequestEmails(
      client,
      requestId
    );
  } catch (error) {
    console.error(
      "Offer request email processing",
      error
    );
  }

  const { data, error } = await client
    .from("offer_request_emails")
    .select("email_status")
    .eq("request_id", requestId);

  return {
    accepted: error
      ? 0
      : (data ?? []).filter(
          (row) => row.email_status === "sent"
        ).length,

    queued: error
      ? null
      : (data ?? []).filter(
          (row) =>
            !["sent", "skipped"].includes(
              row.email_status
            )
        ).length,
  };
}