import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ConversionResult = {
  click_id: string;
  affiliate_id: string | null;
  offer_id?: string | null;
  status?: string | null;
  payout?: number | string | null;
  gross_revenue?: number | string | null;
  country?: string | null;
};

function amount(value: unknown): string {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number >= 0
    ? number.toFixed(2)
    : "0.00";
}

function replaceMacros(
  template: string,
  values: Record<string, string>
): string {
  let result = template;

  const aliases: Record<string, string[]> = {
    click_id: [
      "{{click_id}}",
      "{click_id}",
      "{{clickid}}",
      "{clickid}",
      "%CLICK_ID%",
    ],
    payout: [
      "{{payout}}",
      "{payout}",
      "{{sum}}",
      "{sum}",
      "%PAYOUT%",
    ],
    status: ["{{status}}", "{status}", "%STATUS%"],
    affiliate_id: [
      "{{affiliate_id}}",
      "{affiliate_id}",
      "%AFFILIATE_ID%",
    ],
    offer_id: ["{{offer_id}}", "{offer_id}", "%OFFER_ID%"],
    country: ["{{country}}", "{country}", "%COUNTRY%"],
  };

  for (const [key, tokens] of Object.entries(aliases)) {
    const encoded = encodeURIComponent(values[key] ?? "");

    for (const token of tokens) {
      result = result.split(token).join(encoded);
    }
  }

  return result;
}

function safeHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !url.hostname ||
      url.hostname === "localhost" ||
      url.hostname.endsWith(".local") ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1"
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

async function sendTelegram(
  chatId: string,
  message: string
): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken || !chatId) return;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error("Affiliate Telegram notification failed:", response.status);
    }
  } catch {
    console.error("Affiliate Telegram notification request failed.");
  }
}

/**
 * Deliver an already-recorded conversion to the affiliate's configured
 * tracker URL and Telegram chat. Delivery failures must never undo a
 * conversion or change its earnings.
 */
export async function deliverAffiliateConversion(
  db: SupabaseClient,
  conversion: ConversionResult
): Promise<void> {
  try {
    const clickId = String(conversion.click_id || "").trim();
    const affiliateId = String(conversion.affiliate_id || "").trim();

    if (!clickId || !affiliateId) return;

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id, affiliate_id, full_name")
      .eq("affiliate_id", affiliateId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Affiliate delivery profile lookup failed.");
      return;
    }

    const userId = String(profile.id);
    const payout = amount(conversion.payout);
    const grossRevenue = amount(conversion.gross_revenue);

    const macroValues = {
      click_id: clickId,
      payout,
      status: String(conversion.status || "converted"),
      affiliate_id: affiliateId,
      offer_id: String(conversion.offer_id || ""),
      country: String(conversion.country || ""),
    };

    const { data: settings, error: settingsError } = await db
      .from("affiliate_postback_settings")
      .select("id, postback_url")
      .eq("affiliate_user_id", userId)
      .eq("enabled", true);

    if (settingsError) {
      console.error("Affiliate tracker settings lookup failed.");
    } else {
      for (const setting of settings || []) {
        const settingId = String(setting.id);
        const target = replaceMacros(
          String(setting.postback_url || ""),
          macroValues
        );
        const parsedUrl = safeHttpsUrl(target);

        let logId: string | null = null;

        try {
          const { data: log } = await db
            .from("affiliate_postback_logs")
            .insert({
              setting_id: settingId,
              affiliate_user_id: userId,
              event_type: "conversion",
              status: "pending",
            })
            .select("id")
            .maybeSingle();

          logId = log?.id ? String(log.id) : null;

          if (!parsedUrl) {
            throw new Error("Invalid HTTPS callback URL.");
          }

          const response = await fetch(parsedUrl.toString(), {
            method: "GET",
            redirect: "error",
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
            headers: {
              "User-Agent": "UpNetworkCPA-Postback/1.0",
              "Accept": "*/*",
            },
          });

          const responseText = (await response.text()).slice(0, 500);

          if (!response.ok) {
            if (logId) {
              await db
                .from("affiliate_postback_logs")
                .update({
                  status: "failed",
                  http_status: response.status,
                  response_excerpt: responseText,
                })
                .eq("id", logId);
            }
            continue;
          }

          if (logId) {
            await db
              .from("affiliate_postback_logs")
              .update({
                status: "success",
                http_status: response.status,
                response_excerpt: responseText,
              })
              .eq("id", logId);
          }
        } catch {
          if (logId) {
            await db
              .from("affiliate_postback_logs")
              .update({
                status: "failed",
                response_excerpt: "Callback request failed.",
              })
              .eq("id", logId);
          }

          console.error("Affiliate tracker postback delivery failed.");
        }
      }
    }

    // Telegram is optional; a missing settings table or bot token
    // must not interfere with the recorded conversion.
    try {
      const { data: telegram } = await db
        .from("affiliate_telegram_settings")
        .select("chat_id")
        .eq("affiliate_user_id", userId)
        .eq("enabled", true)
        .maybeSingle();

      if (telegram?.chat_id) {
        const message = [
          "🚨 UpNetwork CPA — New Lead",
          `Affiliate ID: ${affiliateId}`,
          `Click ID: ${clickId}`,
          `Payout: $${payout}`,
          `Gross Revenue: $${grossRevenue}`,
          `Status: ${macroValues.status}`,
          `Country: ${macroValues.country || "Unknown"}`,
          `Offer ID: ${macroValues.offer_id || "N/A"}`,
        ].join("\n");

        await sendTelegram(String(telegram.chat_id), message);
      }
    } catch {
      console.error("Affiliate Telegram settings lookup failed.");
    }
  } catch {
    // Never throw delivery errors back into conversion processing.
    console.error("Affiliate conversion delivery helper failed.");
  }
}

/**
 * Creates a service-role client for server-side conversion handlers.
 */
export function createPostbackDeliveryClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}