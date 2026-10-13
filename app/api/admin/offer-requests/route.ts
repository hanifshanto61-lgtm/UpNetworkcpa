import { NextRequest } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";

import {
  offerBody,
  offerReply,
  offerError,
  OfferAccessError,
  rpcOfferError,
  offerServerClient,
} from "@/lib/offer-access";

import {
  tryOfferRequestEmails,
} from "@/lib/offer-request-emails";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);

    if (!session) {
      throw new OfferAccessError(
        "Active admin access required.",
        401
      );
    }

    const status =
      request.nextUrl.searchParams.get("status") ??
      "pending";

    if (
      ![
        "all",
        "pending",
        "approved",
        "rejected",
        "revoked",
      ].includes(status)
    ) {
      throw new OfferAccessError(
        "Invalid status filter.",
        400
      );
    }

    const page = Math.max(
      1,
      Number(
        request.nextUrl.searchParams.get("page") ??
          "1"
      )
    );

    if (
      !Number.isInteger(page) ||
      page > 100000
    ) {
      throw new OfferAccessError(
        "Invalid page.",
        400
      );
    }

    const client = offerServerClient();

    let query = client
      .from("affiliate_offer_requests")
      .select("*", { count: "exact" })
      .order("requested_at", {
        ascending: false,
      })
      .order("id", {
        ascending: false,
      });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query.range(
      (page - 1) * 50,
      page * 50 - 1
    );

    if (error) {
      throw error;
    }

    return offerReply({
      success: true,
      requests: data ?? [],
      total: count ?? 0,
      page,
    });
  } catch (error) {
    return offerError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAdminSession(request);

    if (!session) {
      throw new OfferAccessError(
        "Active admin access required.",
        401
      );
    }

    const body = await offerBody(request);

    const id =
      typeof body.id === "string"
        ? body.id
        : "";

    const note =
      typeof body.note === "string"
        ? body.note.trim()
        : "";

    const validId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      );

    const validDecision = [
      "approved",
      "rejected",
      "revoked",
    ].includes(String(body.decision));

    if (
      !validId ||
      !Number.isInteger(body.revision) ||
      Number(body.revision) < 1 ||
      !validDecision ||
      note.length > 2000
    ) {
      throw new OfferAccessError(
        "Invalid offer request decision.",
        400
      );
    }

    const client = offerServerClient();

    const { data, error } = await client.rpc(
      "review_offer_request",
      {
        p_admin_id: session.userId,
        p_request_id: id,
        p_revision: body.revision,
        p_decision: body.decision,
        p_note: note,
      }
    );

    if (error) {
      rpcOfferError(error);
    }

    const email = await tryOfferRequestEmails(
      client,
      id
    );

    return offerReply({
      success: true,
      request: data,
      email,

      message:
        `Offer access ${data.status}. ` +
        "Affiliate email notification queued.",
    });
  } catch (error) {
    return offerError(error);
  }
}