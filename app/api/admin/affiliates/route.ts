import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAffiliateEmail } from "@/lib/send-email";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "islamhanif122@gmail.com";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

type AffiliateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

const allowedStatuses: AffiliateStatus[] = [
  "pending",
  "approved",
  "rejected",
  "suspended",
];

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(
  value: unknown
): AffiliateStatus | "unknown" {
  const status = clean(value).toLowerCase();

  if (allowedStatuses.includes(status as AffiliateStatus)) {
    return status as AffiliateStatus;
  }

  return "unknown";
}

function makeAffiliateId(userId: string): string {
  return `UP${userId
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase()}`;
}

function jsonError(
  message: string,
  status = 500,
  details?: string
) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

/* =========================================
   ADMIN AUTHENTICATION
========================================= */

async function getAdminUser(request: NextRequest) {
  if (!supabaseAdmin) {
    return null;
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken = authorization.slice(7).trim();

  if (!accessToken) {
    return null;
  }

  const { data, error } =
    await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  const email = data.user.email?.trim().toLowerCase();

  if (email !== ADMIN_EMAIL.toLowerCase()) {
    return null;
  }

  return data.user;
}

/* =========================================
   LOAD AFFILIATE PROFILE
========================================= */

async function getAffiliateProfile(userId: string) {
  if (!supabaseAdmin) {
    return {
      profile: null as any,
      error: "Supabase is not configured.",
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Affiliate profile lookup error:", error);

      return {
        profile: null as any,
        error: error.message,
      };
    }

    return {
      profile: data as any,
      error: null,
    };
  } catch (error: any) {
    console.error("Affiliate profile lookup exception:", error);

    return {
      profile: null as any,
      error: error?.message || "Profile lookup failed.",
    };
  }
}

/* =========================================
   SAFE EMAIL NOTIFICATION
========================================= */

async function notifyAffiliate(
  email: string,
  name: string,
  type: "approved" | "rejected"
): Promise<boolean> {
  if (!email) {
    return false;
  }

  try {
    return await sendAffiliateEmail({
      to: email,
      name: name || "Affiliate",
      type,
    });
  } catch (error) {
    console.error("Affiliate notification error:", error);
    return false;
  }
}

/* =========================================
   GET AFFILIATES
========================================= */

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return jsonError(
        "Supabase server configuration is missing."
      );
    }

    const admin = await getAdminUser(request);

    if (!admin) {
      return jsonError("Unauthorized.", 401);
    }

    const requestedStatus = clean(
      request.nextUrl.searchParams.get("status")
    ).toLowerCase();

    const search = clean(
      request.nextUrl.searchParams.get("search")
    ).toLowerCase();

    /* LOAD AUTH USERS */

    const users: any[] = [];

    let page = 1;
    const perPage = 1000;

    while (page <= 20) {
      const { data, error } =
        await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });

      if (error) {
        console.error("Admin list users error:", error);

        return jsonError(
          "Unable to load affiliates.",
          500,
          error.message
        );
      }

      const pageUsers = data?.users || [];

      users.push(...pageUsers);

      if (pageUsers.length < perPage) {
        break;
      }

      page++;
    }

    /* LOAD DATABASE PROFILES */

    const profileRows: any[] = [];

    let profilePage = 0;

    while (profilePage < 20) {
      const from = profilePage * 1000;
      const to = from + 999;

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .range(from, to);

      if (error) {
        console.error("Affiliate profiles query error:", error);

        return jsonError(
          "Unable to load affiliate profiles.",
          500,
          error.message
        );
      }

      const rows = data || [];

      profileRows.push(...rows);

      if (rows.length < 1000) {
        break;
      }

      profilePage++;
    }

    const profileMap = new Map<string, any>();

    for (const profile of profileRows) {
      if (profile?.id) {
        profileMap.set(String(profile.id), profile);
      }
    }

    /* BUILD AFFILIATE LIST */

    const allAffiliates = users
      .filter((user) => {
        const metadata = user.user_metadata || {};
        const profile = profileMap.get(String(user.id));

        const accountType = clean(
          metadata.account_type || profile?.account_type
        ).toLowerCase();

        return accountType === "affiliate" || Boolean(profile);
      })
      .map((user) => {
        const metadata = user.user_metadata || {};
        const profile = profileMap.get(String(user.id)) || {};

        const firstName = clean(
          metadata.first_name || profile.first_name
        );

        const lastName = clean(
          metadata.last_name || profile.last_name
        );

        const fullName =
          [firstName, lastName].filter(Boolean).join(" ") ||
          clean(profile.full_name) ||
          clean(metadata.full_name) ||
          clean(metadata.username) ||
          user.email ||
          "Affiliate";

        const affiliateId =
          clean(profile.affiliate_id) ||
          clean(metadata.affiliate_id) ||
          clean(metadata.affiliateId) ||
          clean(metadata.username) ||
          makeAffiliateId(user.id);

        const profileStatus = normalizeStatus(
          profile.application_status
        );

        const metadataStatus = normalizeStatus(
          metadata.application_status
        );

        const applicationStatus =
          profileStatus !== "unknown"
            ? profileStatus
            : metadataStatus !== "unknown"
              ? metadataStatus
              : "pending";

        return {
          id: user.id,

          affiliate_id: affiliateId,

          name: fullName,

          first_name: firstName,

          last_name: lastName,

          email: user.email || profile.email || "",

          phone:
            profile.phone ||
            metadata.phone ||
            metadata.phone_number ||
            "",

          country:
            profile.country ||
            metadata.country ||
            "",

          city:
            profile.city ||
            metadata.city ||
            "",

          address:
            profile.address ||
            metadata.address ||
            "",

          traffic_source:
            profile.traffic_source ||
            metadata.traffic_source ||
            "",

          traffic_url:
            profile.traffic_url ||
            metadata.traffic_url ||
            "",

          social_profile:
            profile.social_profile ||
            metadata.social_profile ||
            "",

          monthly_traffic:
            profile.monthly_traffic ||
            metadata.monthly_traffic ||
            "",

          promotion_method:
            profile.promotion_method ||
            metadata.promotion_method ||
            "",

          experience:
            profile.experience ||
            metadata.experience ||
            "",

          previous_networks:
            profile.previous_networks ||
            metadata.previous_networks ||
            "",

          company_name:
            profile.company_name ||
            metadata.company_name ||
            "",

          payment_method:
            profile.payment_method ||
            metadata.payment_method ||
            "",

          referred_by:
            profile.referred_by ||
            metadata.referred_by ||
            "",

          referral_code:
            profile.referral_code ||
            metadata.referral_code ||
            affiliateId,

          referral_rate: Number(
            profile.referral_rate ??
              metadata.referral_rate ??
              5
          ),

          application_status: applicationStatus,

          created_at:
            user.created_at ||
            profile.created_at ||
            null,

          updated_at:
            profile.updated_at || null,

          last_sign_in_at:
            user.last_sign_in_at || null,

          email_confirmed:
            Boolean(user.email_confirmed_at),

          email_confirmed_at:
            user.email_confirmed_at || null,
        };
      })
      .sort((a, b) => {
        const aTime = a.created_at
          ? new Date(a.created_at).getTime()
          : 0;

        const bTime = b.created_at
          ? new Date(b.created_at).getTime()
          : 0;

        return bTime - aTime;
      });

    /* STATUS TOTALS */

    const totals = {
      total: allAffiliates.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      suspended: 0,
      unknown: 0,
    };

    for (const affiliate of allAffiliates) {
      const status = normalizeStatus(
        affiliate.application_status
      );

      totals[status]++;
    }

    /* SEARCH AND FILTER */

    const affiliates = allAffiliates.filter((affiliate) => {
      if (
        requestedStatus &&
        requestedStatus !== "all" &&
        affiliate.application_status !== requestedStatus
      ) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchable = [
        affiliate.affiliate_id,
        affiliate.name,
        affiliate.email,
        affiliate.phone,
        affiliate.country,
        affiliate.city,
        affiliate.company_name,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(search);
    });

    return NextResponse.json(
      {
        success: true,
        affiliates,
        totals,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error: any) {
    console.error("Admin affiliates GET error:", error);

    return jsonError(
      "Unexpected server error.",
      500,
      error?.message || "Unknown error."
    );
  }
}

/* =========================================
   POST - CREATE AFFILIATE FROM ADMIN
========================================= */

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return jsonError(
        "Supabase server configuration is missing."
      );
    }

    const admin = await getAdminUser(request);

    if (!admin) {
      return jsonError("Unauthorized.", 401);
    }

    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body.", 400);
    }

    const name = clean(body?.name);

    const email = clean(body?.email).toLowerCase();

    const password =
      typeof body?.password === "string"
        ? body.password
        : "";

    const requestedAffiliateId = clean(
      body?.affiliate_id
    );

    const rawReferralRate = Number(
      body?.referral_rate ?? 5
    );

    const referralRate = Number.isFinite(rawReferralRate)
      ? Math.min(100, Math.max(0, rawReferralRate))
      : 5;

    /* VALIDATION */

    if (!name) {
      return jsonError(
        "Affiliate name is required.",
        400
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError(
        "A valid email address is required.",
        400
      );
    }

    if (password.length < 6) {
      return jsonError(
        "Password must be at least 6 characters.",
        400
      );
    }

    if (
      requestedAffiliateId &&
      !/^[a-zA-Z0-9_-]{3,40}$/.test(
        requestedAffiliateId
      )
    ) {
      return jsonError(
        "Affiliate ID must contain 3-40 letters, numbers, underscores or hyphens.",
        400
      );
    }

    /* CHECK AFFILIATE ID */

    if (requestedAffiliateId) {
      const { data: existingProfile, error } =
        await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("affiliate_id", requestedAffiliateId)
          .maybeSingle();

      if (error) {
        console.error(
          "Affiliate ID lookup error:",
          error
        );

        return jsonError(
          "Unable to validate Affiliate ID.",
          500,
          error.message
        );
      }

      if (existingProfile) {
        return jsonError(
          "That Affiliate ID is already in use.",
          409
        );
      }
    }

    /* CREATE AUTH USER */

    const {
      data: created,
      error: createUserError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        account_type: "affiliate",
        full_name: name,
        application_status: "approved",
        referral_rate: referralRate,
        created_by_admin: admin.id,
      },
    });

    if (createUserError || !created?.user) {
      console.error(
        "Admin create affiliate error:",
        createUserError
      );

      const message =
        createUserError?.message ||
        "Unable to create affiliate account.";

      const duplicate = /already|registered|duplicate/i.test(
        message
      );

      return jsonError(
        duplicate
          ? "An account with this email already exists."
          : message,
        duplicate ? 409 : 400
      );
    }

    const user = created.user;

    const affiliateId =
      requestedAffiliateId ||
      makeAffiliateId(user.id);

    /* CREATE DATABASE PROFILE */

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        affiliate_id: affiliateId,
        username: affiliateId,
        full_name: name,
        email,
        application_status: "approved",
      })
      .select("*")
      .single();

    if (profileError || !profile) {
      console.error(
        "Admin affiliate profile creation error:",
        profileError
      );

      /*
       * Roll back only the new Auth account created
       * by this request.
       *
       * Never delete an existing affiliate account.
       */

      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(
          user.id
        );

      if (deleteError) {
        console.error(
          "New Auth account rollback failed:",
          deleteError
        );

        return jsonError(
          "Profile creation failed and the newly created Auth account could not be rolled back. Administrator review is required.",
          500
        );
      }

      return jsonError(
        "Affiliate profile creation failed. The new account was rolled back.",
        500,
        profileError?.message
      );
    }

    /* UPDATE AUTH METADATA */

    const {
      data: updatedUserData,
      error: metadataError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            ...(user.user_metadata || {}),
            account_type: "affiliate",
            full_name: name,
            affiliate_id: affiliateId,
            username: affiliateId,
            application_status: "approved",
            referral_rate: referralRate,
            created_by_admin: admin.id,
            application_status_updated_by:
              admin.id,
            application_status_updated_at:
              new Date().toISOString(),
          },
        }
      );

    if (metadataError || !updatedUserData?.user) {
      console.error(
        "Admin affiliate metadata update error:",
        metadataError
      );

      return jsonError(
        "Affiliate profile was created, but Auth metadata synchronization failed. Please review this account before trying again.",
        500,
        metadataError?.message
      );
    }

    /* SEND APPROVAL EMAIL */

    const emailSent = await notifyAffiliate(
      email,
      name,
      "approved"
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Affiliate account created and approved successfully.",
        email_sent: emailSent,
        affiliate: {
          id: user.id,
          affiliate_id: affiliateId,
          email,
          name,
          application_status: "approved",
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "Admin affiliates POST error:",
      error
    );

    return jsonError(
      "Unexpected server error.",
      500,
      error?.message || "Unknown error."
    );
  }
}

/* =========================================
   PATCH - UPDATE AFFILIATE STATUS
========================================= */

export async function PATCH(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return jsonError(
        "Supabase server configuration is missing."
      );
    }

    const admin = await getAdminUser(request);

    if (!admin) {
      return jsonError("Unauthorized.", 401);
    }

    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body.", 400);
    }

    const userId = clean(body?.user_id);

    const requestedStatus = clean(
      body?.status
    ).toLowerCase();

    if (!userId) {
      return jsonError(
        "Affiliate user ID is required.",
        400
      );
    }

    if (
      !allowedStatuses.includes(
        requestedStatus as AffiliateStatus
      )
    ) {
      return jsonError(
        "Invalid affiliate status.",
        400
      );
    }

    const newStatus =
      requestedStatus as AffiliateStatus;

    /* LOAD AUTH USER */

    const {
      data: userData,
      error: getUserError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        userId
      );

    if (getUserError || !userData?.user) {
      return jsonError(
        "Affiliate account not found.",
        404
      );
    }

    const currentUser = userData.user;

    const currentMetadata =
      currentUser.user_metadata || {};

    /* LOAD DATABASE PROFILE */

    const {
      profile: currentProfile,
      error: profileLookupError,
    } = await getAffiliateProfile(userId);

    if (profileLookupError) {
      return jsonError(
        "Unable to load affiliate profile.",
        500,
        profileLookupError
      );
    }

    const accountType = clean(
      currentMetadata.account_type ||
      currentProfile?.account_type
    ).toLowerCase();

    if (
      accountType !== "affiliate" &&
      !currentProfile
    ) {
      return jsonError(
        "Selected user is not an affiliate.",
        400
      );
    }

    if (!currentProfile) {
      return jsonError(
        "Affiliate profile is missing. Repair the profile before changing status.",
        409
      );
    }

    /* CHECK PREVIOUS STATUS */

    const profileStatus = normalizeStatus(
      currentProfile.application_status
    );

    const metadataStatus = normalizeStatus(
      currentMetadata.application_status
    );

    const previousStatus =
      profileStatus !== "unknown"
        ? profileStatus
        : metadataStatus !== "unknown"
          ? metadataStatus
          : "pending";

    const now = new Date().toISOString();

    /* UPDATE DATABASE PROFILE */

    const {
      data: updatedProfile,
      error: profileUpdateError,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        application_status: newStatus,
        updated_at: now,
      })
      .eq("id", userId)
      .select("id,application_status")
      .single();

    if (profileUpdateError || !updatedProfile) {
      console.error(
        "Affiliate profile update error:",
        profileUpdateError
      );

      return jsonError(
        "Unable to update affiliate profile status.",
        500,
        profileUpdateError?.message
      );
    }

    /* UPDATE AUTH METADATA */

    const updatedMetadata = {
      ...currentMetadata,

      account_type:
        currentMetadata.account_type ||
        "affiliate",

      application_status: newStatus,

      application_status_updated_at: now,

      application_status_updated_by: admin.id,
    };

    const {
      data: updatedUserData,
      error: authUpdateError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          user_metadata: updatedMetadata,
        }
      );

    if (authUpdateError || !updatedUserData?.user) {
      console.error(
        "Affiliate Auth update error:",
        authUpdateError
      );

      /* RESTORE PREVIOUS PROFILE STATUS */

      const { error: rollbackError } =
        await supabaseAdmin
          .from("profiles")
          .update({
            application_status:
              profileStatus !== "unknown"
                ? profileStatus
                : previousStatus,
            updated_at:
              currentProfile.updated_at || now,
          })
          .eq("id", userId);

      if (rollbackError) {
        console.error(
          "Affiliate profile rollback error:",
          rollbackError
        );
      }

      return jsonError(
        rollbackError
          ? "Auth update failed and database rollback also failed. Administrator review is required."
          : "Auth update failed. Database status was restored.",
        500,
        authUpdateError?.message
      );
    }

    /* SEND STATUS NOTIFICATION */

    let emailSent: boolean | null = null;

    if (
      previousStatus !== newStatus &&
      (newStatus === "approved" ||
        newStatus === "rejected") &&
      currentUser.email
    ) {
      const affiliateName =
        clean(currentProfile.full_name) ||
        clean(currentMetadata.full_name) ||
        currentUser.email.split("@")[0];

      emailSent = await notifyAffiliate(
        currentUser.email,
        affiliateName,
        newStatus
      );
    }

    /* AFFILIATE ID */

    const resultMetadata =
      updatedUserData.user.user_metadata || {};

    const affiliateId =
      clean(currentProfile.affiliate_id) ||
      clean(resultMetadata.affiliate_id) ||
      clean(resultMetadata.affiliateId) ||
      clean(resultMetadata.username) ||
      makeAffiliateId(userId);

    /* SUCCESS */

    return NextResponse.json(
      {
        success: true,

        message:
          `Affiliate status changed to ${newStatus}.`,

        email_sent: emailSent,

        affiliate: {
          id: updatedUserData.user.id,
          affiliate_id: affiliateId,
          application_status: newStatus,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(
      "Admin affiliates PATCH error:",
      error
    );

    return jsonError(
      "Unexpected server error.",
      500,
      error?.message || "Unknown error."
    );
  }
}
