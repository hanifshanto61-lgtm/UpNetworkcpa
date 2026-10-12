import "server-only";

type PaymentEmailOptions = {
  to: string;
  paymentId: string;
  affiliateId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paidAt: string;
};

export type PaymentEmailResult = {
  accepted: boolean;
  providerId?: string;
  error?: string;
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

export async function sendPaidPaymentEmail(
  options: PaymentEmailOptions
): Promise<PaymentEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      accepted: false,
      error: "RESEND_API_KEY is missing in Vercel.",
    };
  }

  const to = options.to.trim();
  const currency = options.currency.trim().toUpperCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      options.paymentId
    ) ||
    !Number.isFinite(options.amount) ||
    options.amount < 0 ||
    !/^[A-Z]{3}$/.test(currency) ||
    Number.isNaN(Date.parse(options.paidAt))
  ) {
    return {
      accepted: false,
      error: "Invalid payment email details.",
    };
  }

  const value =
    options.amount.toFixed(2) + " " + currency;

  const date = new Date(options.paidAt).toISOString();

  const text = [
    "UpNetwork CPA",
    "",
    "Your withdrawal has been marked Paid.",
    "Affiliate ID: " + options.affiliateId,
    "Amount: " + value,
    "Payment method: " + options.paymentMethod,
    "Payment reference: " + options.paymentId,
    "Date (UTC): " + date,
    "",
    "View your payment history: https://upnetworkcpa.com/affiliate/payments",
    "",
    "UpNetwork CPA Team",
  ].join("\n");

  const html = `
    <div style="background:#f1f5f9;padding:24px;font-family:Arial,sans-serif">
      <div style="max-width:560px;margin:auto;background:white;border-radius:14px;overflow:hidden">
        <div style="background:#0f172a;padding:24px;color:white">
          <h1 style="margin:0;font-size:24px">UpNetwork CPA</h1>
        </div>

        <div style="padding:24px;color:#334155">
          <h2 style="color:#059669">Payment Paid</h2>
          <p>Your withdrawal has been marked Paid.</p>

          <p>
            <strong>Affiliate ID:</strong>
            ${escapeHtml(options.affiliateId)}
          </p>

          <p>
            <strong>Amount:</strong>
            ${escapeHtml(value)}
          </p>

          <p>
            <strong>Payment method:</strong>
            ${escapeHtml(options.paymentMethod)}
          </p>

          <p>
            <strong>Reference:</strong>
            ${escapeHtml(options.paymentId)}
          </p>

          <p>
            <strong>Date (UTC):</strong>
            ${escapeHtml(date)}
          </p>

          <p style="margin-top:24px">
            <a href="https://upnetworkcpa.com/affiliate/payments"
               style="background:#2563eb;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">
              View Payment History
            </a>
          </p>

          <p>Best regards,<br>UpNetwork CPA Team</p>
        </div>
      </div>
    </div>
  `;

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    7000
  );

  try {
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
          "Idempotency-Key":
            "payment-paid/" + options.paymentId,
        },
        body: JSON.stringify({
          from: "UpNetwork CPA <noreply@upnetworkcpa.com>",
          to: [to],
          subject: "Payment Paid - UpNetwork CPA",
          html,
          text,
        }),
        signal: controller.signal,
        cache: "no-store",
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
          typeof result?.message === "string"
            ? result.message.slice(0, 500)
            : "Resend email request failed (HTTP " +
              response.status +
              ").",
      };
    }

    return {
      accepted: true,
      providerId: result.id,
    };
  } catch {
    return {
      accepted: false,
      error:
        "Email request timed out or could not reach Resend.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
