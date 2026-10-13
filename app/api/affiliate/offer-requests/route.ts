import { NextRequest } from "next/server";

import {
  approvedAffiliate,
  offerBody,
  offerReply,
  offerError,
  OfferAccessError,
  rpcOfferError,
} from "@/lib/offer-access";

import {
  tryOfferRequestEmails,
} from "@/lib/offer-request-emails";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  try {
    const auth = await approvedAffiliate(request);
    const body = await offerBody(request);

    const offerId =
      typeof body.offer_id === "string"
        ? body.offer_id.trim()
        : "";

    const note =
      typeof body.note === "string"
        ? body.note.trim()
        : "";

    if (
      !offerId ||
      offerId.length > 128 ||
      note.length > 2000
    ) {
      throw new OfferAccessError(
        "Invalid offer ID or traffic plan.",
        400
      );
    }

    const { data, error } = await auth.client.rpc(
      "submit_offer_request",
      {
        p_user_id: auth.user.id,
        p_offer_id: offerId,
        p_note: note,
      }
    );

    if (error) {
      rpcOfferError(error);
    }

    const email = await tryOfferRequestEmails(
      auth.client,
      data.request.id
    );

    return offerReply(
      {
        success: true,
        request: data.request,
        changed: data.changed,
        email,

        message: data.changed
          ? "Request submitted. Email notifications have been queued."
          : "Your existing offer request is unchanged.",
      },
      data.changed ? 201 : 200
    );
  } catch (error) {
    return offerError(error);
  }
}