
type EmailType = "registered" | "approved" | "rejected";

type EmailOptions = {
  to: string;
  name: string;
  type: EmailType;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char] || char;
  });
}

export async function sendAffiliateEmail({
  to,
  name,
  type,
}: EmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("RESEND_API_KEY is missing");
    return false;
  }

  const subjects: Record<EmailType, string> = {
    registered: "Application Received - UpNetwork CPA",
    approved: "Your Affiliate Account Is Approved!",
    rejected: "Affiliate Application Update - UpNetwork CPA",
  };

  const messages: Record<EmailType, string> = {
    registered:
      "We have received your affiliate application. Our team will review it and notify you when a decision is made.",

    approved:
      "Congratulations! Your affiliate account has been approved. You can now log in to your UpNetwork CPA dashboard.",

    rejected:
      "Thank you for your interest in UpNetwork CPA. Unfortunately, your affiliate application was not approved.",
  };

  const safeName = escapeHtml(name || "Affiliate");

  const html = `
    <div style="background:#f1f5f9;padding:30px 12px;font-family:Arial,sans-serif">
      <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden">
        <div style="background:#0f172a;padding:26px;text-align:center">
          <h1 style="color:#ffffff;margin:0;font-size:26px">
            UpNetwork CPA
          </h1>
          <p style="color:#94a3b8;margin:8px 0 0">
            Best CPA Network
          </p>
        </div>

        <div style="padding:30px;color:#334155">
          <h2>Hello ${safeName},</h2>

          <p style="font-size:16px;line-height:1.7">
            ${messages[type]}
          </p>

          ${
            type === "approved"
              ? `<p style="margin-top:25px">
                   <a href="https://upnetworkcpa.com/login"
                      style="background:#2563eb;color:white;padding:13px 24px;border-radius:8px;text-decoration:none;display:inline-block">
                     Login to Dashboard
                   </a>
                 </p>`
              : ""
          }

          <p style="margin-top:30px">
            Best Regards,<br/>
            <strong>UpNetwork CPA Team</strong>
          </p>
        </div>

        <div style="padding:18px;text-align:center;background:#f8fafc;color:#64748b;font-size:12px">
          © UpNetwork CPA
          <br/>
          https://upnetworkcpa.com
        </div>
      </div>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "UpNetwork CPA <noreply@upnetworkcpa.com>",
        to: [to],
        subject: subjects[type],
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend email error:", result);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}
