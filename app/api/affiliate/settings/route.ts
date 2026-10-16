export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

type Profile = {
  id: string;
  affiliate_id: string;
  full_name?: string | null;
  email?: string | null;
  username?: string | null;
  phone?: string | null;
};

type AffiliateSettings = {
  user_id: string;
  affiliate_id: string | null;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  timezone: string;
  currency: string;
  payment_method: string | null;
  payment_address: string | null;
  payment_note: string | null;
  email_notifications: boolean;
  conversion_notifications: boolean;
  payment_notifications: boolean;
  created_at?: string;
  updated_at?: string;
};

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

async function authenticate(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) {
    return {
      error: "Missing or invalid authorization token.",
      user: null,
    };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return {
      error: "Unauthorized.",
      user: null,
    };
  }

  return {
    error: null,
    user,
  };
}

// Use the same server-controlled profile as the dashboard and payments APIs.
async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, affiliate_id, full_name, email, username, phone")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Affiliate profile lookup error:", error);
    throw new Error("Unable to verify the affiliate profile.");
  }

  return data as Profile | null;
}

function getAffiliateId(profile: Profile | null) {
  const affiliateId = profile?.affiliate_id?.trim();

  if (!affiliateId) {
    throw new Error("A valid affiliate profile is required.");
  }

  return affiliateId;
}

function profileUnavailableResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "Your affiliate profile or Affiliate ID could not be found. Please contact support.",
      code: "AFFILIATE_PROFILE_NOT_FOUND",
    },
    { status: 403, headers: { "Cache-Control": "no-store" } }
  );
}

function cleanString(
  value: unknown,
  maxLength = 500
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, maxLength);
}

function cleanBoolean(
  value: unknown,
  fallback: boolean
) {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

type SavedPaymentAccount = {
  id: string;
  paymentMethod: string;
  paymentAddress: string;
  createdAt: string;
};

async function readPaymentAccounts(userId: string): Promise<SavedPaymentAccount[]> {
  const accounts: SavedPaymentAccount[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseAdmin.from("affiliate_payment_accounts")
      .select("id, payment_method, payment_address, created_at")
      .eq("user_id", userId).order("account_order", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error("Unable to load saved payment accounts.");
    for (const row of data || []) {
      accounts.push({ id: row.id, paymentMethod: row.payment_method, paymentAddress: row.payment_address, createdAt: row.created_at });
    }
    if ((data || []).length < pageSize) break;
  }
  return accounts;
}

async function mapSettings(
  row: AffiliateSettings | null,
  userId: string,
  profile: Profile | null,
  user: {
    email?: string;
    user_metadata?: Record<string, unknown>;
  }
) {
  const affiliateId = getAffiliateId(profile);
  const paymentAccounts = await readPaymentAccounts(userId);
  const firstAccount = paymentAccounts[0];

  return {
    paymentAccounts,
    userId,
    affiliateId,

    fullName:
      cleanString(row?.full_name, 150) ||
      cleanString(profile?.full_name, 150) ||
      cleanString(profile?.username, 150) ||
      cleanString(user.user_metadata?.full_name, 150) ||
      cleanString(user.user_metadata?.name, 150) ||
      "",

    phone: row?.phone ?? profile?.phone ?? "",
    company: row?.company ?? "",

    timezone:
      row?.timezone ||
      "Asia/Dhaka",

    currency:
      row?.currency ||
      "USD",

    paymentMethod:
      firstAccount?.paymentMethod ?? row?.payment_method ?? "",

    paymentAddress:
      firstAccount?.paymentAddress ?? row?.payment_address ?? "",

    paymentNote:
      row?.payment_note ??
      "",

    emailNotifications:
      row?.email_notifications ??
      true,

    conversionNotifications:
      row?.conversion_notifications ??
      true,

    paymentNotifications:
      row?.payment_notifications ??
      true,

    email:
      user.email ||
      profile?.email ||
      null,

    updatedAt:
      row?.updated_at ??
      null,
  };
}

export async function GET(
  request: NextRequest
) {
  try {
    const {
      user,
      error: authError,
    } = await authenticate(request);

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error:
            authError ||
            "Unauthorized.",
        },
        {
          status: 401,
        }


      );
    }

    const profile =
      await getProfile(user.id);

    if (!profile?.affiliate_id?.trim()) {
      return profileUnavailableResponse();
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("affiliate_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error(
        "Affiliate settings GET error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to load affiliate settings.",
          details: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      settings: await mapSettings(
        data as AffiliateSettings | null,
        user.id,
        profile,
        user
      ),
    });
  } catch (error) {
    console.error(
      "Unexpected affiliate settings GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  request: NextRequest
) {
  try {
    const {
      user,
      error: authError,
    } = await authenticate(request);

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error:
            authError ||
            "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid JSON request body.",
        },
        {
          status: 400,
        }
      );
    }

    const profile =
      await getProfile(user.id);

    if (!profile?.affiliate_id?.trim()) {
      return profileUnavailableResponse();
    }

    const affiliateId = getAffiliateId(profile);

    const timezone =
      cleanString(
        body.timezone,
        100
      ) ||
      "Asia/Dhaka";

    const currency =
      cleanString(
        body.currency,
        20
      ) ||
      "USD";

    const paymentMethod =
      cleanString(
        body.paymentMethod,
        100
      );

    const paymentAddress =
      cleanString(
        body.paymentAddress,
        500
      );

    const paymentNote =
      cleanString(
        body.paymentNote,
        1000
      );

    const fullName =
      cleanString(
        body.fullName,
        150
      ) ||
      profile?.full_name ||
      null;

    const phone =
      cleanString(
        body.phone,
        50
      );

    const company =
      cleanString(
        body.company,
        150
      );

    const {
      data: existingSettings,
      error: existingError,
    } = await supabaseAdmin
      .from("affiliate_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      console.error(
        "Affiliate settings existing row error:",
        existingError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to read existing settings.",
          details:
            existingError.message,
        },
        {
          status: 500,
        }
      );
    }

    const payload = {
      user_id: user.id,
      affiliate_id:
        affiliateId,

      full_name:
        fullName,

      phone,
      company,

      timezone,
      currency,

      payment_method:
        paymentMethod,

      payment_address:
        paymentAddress,

      payment_note:
        paymentNote,

      email_notifications:
        cleanBoolean(
          body.emailNotifications,
          existingSettings
            ?.email_notifications ??
            true
        ),

      conversion_notifications:
        cleanBoolean(
          body.conversionNotifications,
          existingSettings
            ?.conversion_notifications ??
            true
        ),

      payment_notifications:
        cleanBoolean(
          body.paymentNotifications,
          existingSettings
            ?.payment_notifications ??
            true
        ),

      updated_at:
        new Date().toISOString(),
    };

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("affiliate_settings")
      .upsert(
        payload,
        {
          onConflict:
            "user_id",
        }
      )
      .select("*")
      .single();

    if (error) {
      console.error(
        "Affiliate settings PUT error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to save affiliate settings.",
          details:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Settings saved successfully.",
      settings: await mapSettings(
        data as AffiliateSettings,
        user.id,
        profile,
        user
      ),
    });
  } catch (error) {
    console.error(
      "Unexpected affiliate settings PUT error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
        }

// Save payment defaults without changing profile or notification preferences.
export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await authenticate(request);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }
    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
    }
    const allowedMethods = ["Payoneer", "Skrill", "Binance Pay", "USDT (TRC20)", "USDT (ERC20)", "Bitcoin (BTC)", "Bank Wire Transfer"];
    const method = typeof body.paymentMethod === "string" ? body.paymentMethod.trim() : "";
    const address = typeof body.paymentAddress === "string" ? body.paymentAddress.trim() : "";
    if (!allowedMethods.includes(method) || address.length < 3 || address.length > 500) {
      return NextResponse.json({ success: false, error: "Select a valid payment method and enter a payment address of 3–500 characters." }, { status: 400 });
    }
    const profile = await getProfile(user.id);
    if (!profile?.affiliate_id?.trim()) return profileUnavailableResponse();
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("affiliate_settings").select("user_id").eq("user_id", user.id).maybeSingle();
    if (lookupError) throw new Error("Unable to load payment settings.");
    const paymentFields = { payment_method: method, payment_address: address, updated_at: new Date().toISOString() };
    const updateExisting = () => supabaseAdmin.from("affiliate_settings")
      .update(paymentFields).eq("user_id", user.id).select("*").single();
    let result;
    if (existing) {
      result = await updateExisting();
    } else {
      result = await supabaseAdmin.from("affiliate_settings").insert({
        user_id: user.id, affiliate_id: getAffiliateId(profile),
        full_name: profile.full_name || null, phone: profile.phone || null, company: null,
        timezone: "Asia/Dhaka", currency: "USD", payment_note: null,
        email_notifications: true, conversion_notifications: true, payment_notifications: true,
        ...paymentFields,
      }).select("*").single();
      // Another tab may create the settings row after our lookup.
      if (result.error?.code === "23505") result = await updateExisting();
    }
    if (result.error || !result.data) throw new Error("Unable to save payment settings.");
    return NextResponse.json({ success: true, settings: await mapSettings(result.data as AffiliateSettings, user.id, profile, user) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Affiliate payment defaults PATCH error:", error);
    return NextResponse.json({ success: false, error: "Payment details could not be saved. No withdrawal was submitted. Please try again." }, { status: 500 });
  }
}