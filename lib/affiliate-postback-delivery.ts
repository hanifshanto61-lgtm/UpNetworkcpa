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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceMacros(
  template: string,
  values: Record<string, string>
): string {
  const aliases: Record<string, string[]> = {
    click_id: [
      "{clickid}",
      "{{clickid}}",
      "{click_id}",
      "{{click_id}}",
      "%CLICK_ID%",
    ],
    payout: [
      "{sum}",
      "{{sum}}",
      "{payout}",
      "{{payout}}",
      "%PAYOUT%",
    ],
    status: [
      "{status}",
      "{{status}}",
      "%STATUS%",
    ],
    affiliate_id: [
      "{affiliate_id}",
      "{{affiliate_id}}",
      "%AFFILIATE_ID%",
    ],
    offer_id: [
      "{offer_id}",
      "{{offer_id}}",
      "%OFFER_ID%",
    ],
    country: [
      "{country}",
      "{{country}}",
      "%COUNTRY%",
    ],
  };

  let result = template;

  for (const [key, tokens] of Object.entries(aliases)) {
    const encodedValue = encodeURIComponent(values[key] ?? "");

    for (const token of tokens) {
      const encodedToken = token
        .replace(/\{/g, "%7B")
        .replace(/\}/g, "%7D");

      const pattern = new RegExp(
        escapeRegExp(token) + "|" + escapeRegExp(encodedToken),
        "gi"
      );

      result = result.replace(pattern, () => encodedValue);
    }
  }

  return result;
}

function safeHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);

    const hostname = url.hostname.toLowerCase();

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !hostname ||
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]"
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

  if (!botToken || !chatId) {
    console.error(
      "Affiliate Telegram notification skipped: missing bot token or chat ID."
    );
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      }
    );

    const result = await response
      .json()
      .catch(() => null) as {
        ok?: boolean;
        description?: string;
      } | null;

    if (!response.ok || result?.ok !== true) {
      console.error(
        "Affiliate Telegram notification failed:",
        response.status,
        String(result?.description || "Telegram API rejected the message").slice(0, 300)
      );
    }
  } catch (error) {
    console.error(
      "Affiliate Telegram notification request failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

/**
 * Delivers an already-recorded conversion to every enabled
 * affiliate tracker and the affiliate's configured Telegram chat.
 *
 * Delivery failures must never undo a conversion or earnings.
 */
export async function deliverAffiliateConversion(
  db: SupabaseClient,
  conversion: ConversionResult
): Promise<void> {
  try {
    const clickId = String(conversion.click_id || "").trim();
    const affiliateId = String(conversion.affiliate_id || "").trim();

    if (!clickId || !affiliateId) {
      console.error(
        "Affiliate delivery skipped: missing click ID or affiliate ID."
      );
      return;
    }

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id, affiliate_id, full_name")
      .eq("affiliate_id", affiliateId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error(
        "Affiliate delivery profile lookup failed:",
        profileError?.message || "Profile not found."
      );
      return;
    }

    const userId = String(profile.id);
    const payout = amount(conversion.payout);
    const grossRevenue = amount(conversion.gross_revenue);

    const macroValues: Record<string, string> = {
      click_id: clickId,
      payout,
      status: String(conversion.status || "converted"),
      affiliate_id: affiliateId,
      offer_id: String(conversion.offer_id || ""),
      country: String(conversion.country || ""),
    };

    // Deliver to every enabled tracker configured by this affiliate.
    const { data: settings, error: settingsError } = await db
      .from("affiliate_postback_settings")
      .select("id, postback_url")
      .eq("affiliate_user_id", userId)
      .eq("enabled", true);

    if (settingsError) {
      console.error(
        "Affiliate tracker settings lookup failed:",
        settingsError.message
      );
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
          const { data: log, error: logError } = await db
            .from("affiliate_postback_logs")
            .insert({
              setting_id: settingId,
              affiliate_user_id: userId,
              event_type: "conversion",
              status: "pending",
            })
            .select("id")
            .maybeSingle();

          if (logError) {
            console.error(
              "Affiliate postback log creation failed:",
              logError.message
            );
          }

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
              Accept: "*/*",
            },
          });

          const responseText = (
            await response.text()
          ).slice(0, 500);

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

            console.error(
              "Affiliate tracker returned HTTP error:",
              response.status
            );

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
        } catch (error) {
          if (logId) {
            await db
              .from("affiliate_postback_logs")
              .update({
                status: "failed",
                response_excerpt: (
                  error instanceof Error
                    ? error.message
                    : "Callback request failed."
                ).slice(0, 500),
              })
              .eq("id", logId);
          }

          console.error(
            "Affiliate tracker postback delivery failed:",
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      }
    }

    // Telegram notification is independent of tracker postbacks.
    try {
      const { data: telegram, error: telegramError } = await db
        .from("affiliate_telegram_settings")
        .select("chat_id")
        .eq("affiliate_user_id", userId)
        .eq("enabled", true)
        .maybeSingle();

      if (telegramError) {
        console.error(
          "Affiliate Telegram settings lookup failed:",
          telegramError.message
        );
      } else if (telegram?.chat_id) {
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

        await sendTelegram(
          String(telegram.chat_id),
          message
        );
      }
    } catch (error) {
      console.error(
        "Affiliate Telegram notification failed:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  } catch (error) {
    // Never throw delivery errors back into conversion processing.
    console.error(
      "Affiliate conversion delivery helper failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
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