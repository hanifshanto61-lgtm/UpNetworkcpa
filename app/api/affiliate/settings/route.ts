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
  status?: string | null;
  referral_code?: string | null;
  referral_rate?: number | null;
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

/**
 * Get affiliate profile from the current database structure.
 *
 * IMPORTANT:
 * We use affiliate_profiles instead of the old profiles table.
 */
async function getProfile(userId: string) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("affiliate_profiles")
    .select(
      "id, affiliate_id, full_name, email, status, referral_code, referral_rate"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "Affiliate profile lookup error:",
      error
    );

    return null;
  }

  return data as Profile | null;
}

function getAffiliateId(
  profile: Profile | null,
  userId: string
) {
  if (profile?.affiliate_id) {
    return String(profile.affiliate_id);
  }

  if (profile?.referral_code) {
    return String(profile.referral_code);
  }

  return `AFF-${userId.slice(0, 8).toUpperCase()}`;
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

function mapSettings(
  row: AffiliateSettings | null,
  userId: string,
  profile: Profile | null
) {
  const affiliateId =
    row?.affiliate_id ||
    getAffiliateId(profile, userId);

  return {
    userId,
    affiliateId,

    fullName:
      row?.full_name ??
      profile?.full_name ??
      "",

    phone: row?.phone ?? "",
    company: row?.company ?? "",

    timezone:
      row?.timezone ||
      "Asia/Dhaka",

    currency:
      row?.currency ||
      "USD",

    paymentMethod:
      row?.payment_method ??
      "",

    paymentAddress:
      row?.payment_address ??
      "",

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
      profile?.email ??
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
      settings: mapSettings(
        data as AffiliateSettings | null,
        user.id,
        profile
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

    const affiliateId =
      getAffiliateId(
        profile,
        user.id
      );

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
      settings: mapSettings(
        data as AffiliateSettings,
        user.id,
        profile
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
