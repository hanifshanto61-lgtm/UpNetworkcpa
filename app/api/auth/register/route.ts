import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function makeAffiliateId(userId: string) {
  return `UP${userId
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase()}`;
}

function isDuplicateError(message: string) {
  const text = message.toLowerCase();

  return (
    text.includes("already registered") ||
    text.includes("already exists") ||
    text.includes("duplicate") ||
    text.includes("unique constraint") ||
    text.includes("already been registered")
  );
}

function isUnexpectedAuthDatabaseError(message: string) {
  const text = message.toLowerCase();

  return (
    text.includes("database error creating new user") ||
    text.includes("unexpected_failure") ||
    text.includes("database error")
  );
}

function getErrorDetails(error: unknown) {
  const value = error as Record<string, unknown> | null;

  if (!value || typeof value !== "object") {
    return {
      message: "Unknown error",
      status: null,
      code: null,
      details: null,
      hint: null,
    };
  }

  return {
    message: normalizeText(value.message),
    status:
      typeof value.status === "number"
        ? value.status
        : null,
    code: normalizeText(value.code) || null,
    details: normalizeText(value.details) || null,
    hint: normalizeText(value.hint) || null,
  };
}

/*
 * Find an Auth user by email.
 *
 * Supabase's Admin API exposes listUsers on the server side.
 * We paginate safely instead of assuming there are fewer than 1000 users.
 */
async function findAuthUserByEmail(
  supabaseAdmin: ReturnType<typeof getAdminClient>,
  email: string
): Promise<AuthUser | null> {
  if (!supabaseAdmin) {
    return null;
  }

  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const { data, error } =
      await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

    if (error) {
      console.error(
        "Auth user lookup error:",
        getErrorDetails(error)
      );

      return null;
    }

    const users = (data?.users || []) as AuthUser[];

    const found = users.find(
      (user) =>
        normalizeEmail(user.email) === email
    );

    if (found) {
      return found;
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

/*
 * Find an existing affiliate profile by either Affiliate ID
 * or referral code.
 */
async function findExistingAffiliateProfile(
  supabaseAdmin: ReturnType<typeof getAdminClient>,
  affiliateId: string
) {
  if (!supabaseAdmin) {
    return null;
  }

  const { data: byAffiliateId, error: affiliateIdError } =
    await supabaseAdmin
      .from("affiliate_profiles")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .maybeSingle();

  if (affiliateIdError) {
    console.error(
      "Affiliate ID lookup error:",
      getErrorDetails(affiliateIdError)
    );

    return null;
  }

  if (byAffiliateId) {
    return byAffiliateId;
  }

  const { data: byReferralCode, error: referralError } =
    await supabaseAdmin
      .from("affiliate_profiles")
      .select("*")
      .eq("referral_code", affiliateId)
      .maybeSingle();

  if (referralError) {
    console.error(
      "Referral code lookup error:",
      getErrorDetails(referralError)
    );

    return null;
  }

  return byReferralCode || null;
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getAdminClient();

  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Supabase server configuration is missing.",
      },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    /*
     * ---------------------------------------
     * NORMALIZE INPUT
     * ---------------------------------------
     */

    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    const firstName = normalizeText(body.firstName);
    const lastName = normalizeText(body.lastName);
    const username = normalizeText(body.username);

    const phone = normalizeText(body.phone);
    const country = normalizeText(body.country);
    const city = normalizeText(body.city);
    const address = normalizeText(body.address);

    const trafficSource = normalizeText(
      body.trafficSource
    );

    const trafficUrl = normalizeText(
      body.trafficUrl
    );

    const socialProfile = normalizeText(
      body.socialProfile
    );

    const monthlyTraffic = normalizeText(
      body.monthlyTraffic
    );

    const promotionMethod = normalizeText(
      body.promotionMethod
    );

    const experience = normalizeText(
      body.experience
    );

    const previousNetworks = normalizeText(
      body.previousNetworks
    );

    const companyName = normalizeText(
      body.companyName
    );

    const paymentMethod = normalizeText(
      body.paymentMethod
    );

    const referralCode =
      normalizeText(body.referralCode) || null;

    /*
     * ---------------------------------------
     * VALIDATION
     * ---------------------------------------
     */

    if (!firstName || !lastName || !username) {
      return NextResponse.json(
        {
          success: false,
          error:
            "First name, last name and username are required.",
        },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid email address is required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    /*
     * ---------------------------------------
     * AFFILIATE ID CHECK
     * ---------------------------------------
     *
     * The username entered during signup
     * becomes the Affiliate ID.
     */

    const affiliateId = username;

    const existingProfile =
      await findExistingAffiliateProfile(
        supabaseAdmin,
        affiliateId
      );

    if (existingProfile) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This Affiliate ID is already in use. Please choose another Affiliate ID.",
        },
        { status: 409 }
      );
    }

    /*
     * ---------------------------------------
     * AUTH USER PRE-CHECK
     * ---------------------------------------
     *
     * This prevents Supabase Auth from being
     * asked to create a duplicate email.
     */

    const existingAuthUser =
      await findAuthUserByEmail(
        supabaseAdmin,
        email
      );

    /*
     * ---------------------------------------
     * ORPHAN AFFILIATE RECOVERY
     * ---------------------------------------
     *
     * If an affiliate Auth user exists but
     * there is no affiliate_profiles row,
     * and the existing account was created by
     * this affiliate flow, safely complete it.
     */

    if (existingAuthUser) {
      const metadata =
        existingAuthUser.user_metadata || {};

      const accountType = normalizeText(
        metadata.account_type
      ).toLowerCase();

      const metadataUsername = normalizeText(
        metadata.username
      );

      const applicationStatus = normalizeText(
        metadata.application_status
      ).toLowerCase();

      const canRecoverOrphan =
        accountType === "affiliate" &&
        (!metadataUsername ||
          metadataUsername === username) &&
        (!applicationStatus ||
          applicationStatus === "pending");

      if (!canRecoverOrphan) {
        return NextResponse.json(
          {
            success: false,
            error:
              "An account with this email already exists. Please log in instead.",
          },
          { status: 409 }
        );
      }

      /*
       * Update password + metadata for the orphan
       * affiliate user.
       */
      const { data: recoveredAuth, error: recoveryError } =
        await supabaseAdmin.auth.admin.updateUserById(
          existingAuthUser.id,
          {
            password,
            email_confirm: true,
            user_metadata: {
              ...metadata,

              account_type: "affiliate",

              first_name: firstName,
              last_name: lastName,
              username,

              phone,
              country,
              city,
              address,

              traffic_source: trafficSource,
              traffic_url: trafficUrl,
              social_profile: socialProfile,

              monthly_traffic: monthlyTraffic,
              promotion_method: promotionMethod,

              experience,
              previous_networks: previousNetworks,

              company_name: companyName,
              payment_method: paymentMethod,

              application_status: "pending",

              referred_by: referralCode,
            },
          }
        );

      if (recoveryError || !recoveredAuth?.user) {
        console.error(
          "Orphan affiliate recovery error:",
          getErrorDetails(recoveryError)
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "An existing affiliate account was found, but it could not be recovered. Please contact the administrator.",
          },
          { status: 500 }
        );
      }

      /*
       * Recreate the missing affiliate profile.
       */
      const { data: recoveredProfile, error: profileError } =
        await supabaseAdmin
          .from("affiliate_profiles")
          .insert({
            id: existingAuthUser.id,
            affiliate_id: affiliateId,
            full_name:
              `${firstName} ${lastName}`.trim(),
            email,
            status: "pending",
            referral_code: affiliateId,
            referral_rate: 5,
          })
          .select("*")
          .maybeSingle();

      if (profileError || !recoveredProfile) {
        console.error(
          "Recovered affiliate profile creation error:",
          getErrorDetails(profileError)
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Your previous affiliate account was found, but the affiliate profile could not be restored.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,

          message:
            "Your affiliate account has been recovered successfully. Your application is pending admin approval.",

          affiliate: {
            id: existingAuthUser.id,
            affiliate_id: affiliateId,
            email,
            status: "pending",
          },
        },
        { status: 201 }
      );
    }

    /*
     * ---------------------------------------
     * CREATE NEW AUTH USER
     * ---------------------------------------
     */

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,

        /*
         * Keep email auto-confirmed because the
         * network currently manages affiliate
         * account activation itself.
         */
        email_confirm: true,

        user_metadata: {
          account_type: "affiliate",

          first_name: firstName,
          last_name: lastName,
          username,

          phone,
          country,
          city,
          address,

          traffic_source: trafficSource,
          traffic_url: trafficUrl,
          social_profile: socialProfile,

          monthly_traffic: monthlyTraffic,
          promotion_method: promotionMethod,

          experience,
          previous_networks: previousNetworks,

          company_name: companyName,
          payment_method: paymentMethod,

          application_status: "pending",

          referred_by: referralCode,
        },
      });

    /*
     * ---------------------------------------
     * AUTH CREATE ERROR
     * ---------------------------------------
     */

    if (authError || !authData?.user) {
      const details =
        getErrorDetails(authError);

      console.error(
        "Server-side affiliate Auth creation error:",
        {
          ...details,
          email,
          username,
        }
      );

      /*
       * Duplicate account.
       */
      if (isDuplicateError(details.message)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "An account with this email already exists. Please log in instead.",
          },
          { status: 409 }
        );
      }

      /*
       * Important diagnostic case.
       *
       * We do NOT hide the database problem in
       * the server log anymore.
       */
      if (
        isUnexpectedAuthDatabaseError(
          details.message
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Supabase Auth could not create the account. The registration code is reaching Supabase correctly, but the Auth database operation failed.",
            code: details.code,
            status: details.status,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            details.message ||
            "Unable to create account.",
          code: details.code,
          status: details.status,
        },
        { status: 400 }
      );
    }

    const user = authData.user as AuthUser;

    /*
     * ---------------------------------------
     * CREATE AFFILIATE PROFILE
     * ---------------------------------------
     */

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("affiliate_profiles")
        .insert({
          id: user.id,
          affiliate_id: affiliateId,
          full_name:
            `${firstName} ${lastName}`.trim(),
          email,
          status: "pending",
          referral_code: affiliateId,
          referral_rate: 5,
        })
        .select("*")
        .maybeSingle();

    /*
     * ---------------------------------------
     * PROFILE FAILURE ROLLBACK
     * ---------------------------------------
     */

    if (profileError || !profile) {
      const details =
        getErrorDetails(profileError);

      console.error(
        "Affiliate profile creation error:",
        details
      );

      /*
       * Try to remove the newly created Auth user
       * so we never leave a broken account behind.
       */
      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(
          user.id
        );

      if (deleteError) {
        console.error(
          "Auth rollback delete error:",
          getErrorDetails(deleteError)
        );
      }

      if (
        details.message
          .toLowerCase()
          .includes("duplicate") ||
        details.message
          .toLowerCase()
          .includes("unique")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This Affiliate ID is already in use. Please choose another Affiliate ID.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "Affiliate profile could not be created. Registration was rolled back.",
          code: details.code,
        },
        { status: 500 }
      );
    }

    /*
     * ---------------------------------------
     * SUCCESS
     * ---------------------------------------
     */

    return NextResponse.json(
      {
        success: true,

        message:
          "Affiliate registration completed successfully. Your application is pending admin approval.",

        affiliate: {
          id: user.id,
          affiliate_id: affiliateId,
          email,
          status: "pending",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const details = getErrorDetails(error);

    console.error(
      "Affiliate registration API exception:",
      details
    );

    return NextResponse.json(
      {
        success: false,
        error:
          details.message ||
          "Something went wrong while creating your account.",
        code: details.code,
      },
      { status: 500 }
    );
  }
}
