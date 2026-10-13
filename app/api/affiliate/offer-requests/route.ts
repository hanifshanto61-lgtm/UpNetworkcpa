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

function singleLine(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ")
    : "";
}

export async function POST(request: NextRequest) {
  try {
    const auth = await approvedAffiliate(request);
    const body = await offerBody(request);

    const offerId = singleLine(body.offer_id);
    const source = singleLine(body.traffic_source);
    const geo = singleLine(body.traffic_geo);
    const dailyClicks = body.daily_clicks;
    const promoUrl = singleLine(body.promotion_url);

    const plan =
      typeof body.note === "string"
        ? body.note.trim()
        : "";

    const validId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        offerId
      );

    if (!validId) {
      throw new OfferAccessError(
        "Invalid offer ID.",
        400
      );
    }

    if (
      source.length < 2 ||
      source.length > 120 ||
      geo.length < 2 ||
      geo.length > 100
    ) {
      throw new OfferAccessError(
        "Enter your traffic source and target country.",
        400
      );
    }

    if (
      typeof dailyClicks !== "number" ||
      !Number.isInteger(dailyClicks) ||
      dailyClicks < 1 ||
      dailyClicks > 1000000
    ) {
      throw new OfferAccessError(
        "Enter estimated daily clicks between 1 and 1,000,000.",
        400
      );
    }

    if (
      plan.length < 10 ||
      plan.length > 1000
    ) {
      throw new OfferAccessError(
        "Describe your promotion plan in 10–1000 characters.",
        400
      );
    }

    if (promoUrl) {
      let valid = false;

      try {
        const parsed = new URL(promoUrl);

        valid =
          ["https:", "http:"].includes(
            parsed.protocol
          ) &&
          !parsed.username &&
          !parsed.password &&
          promoUrl.length <= 350;
      } catch {
        valid = false;
      }

      if (!valid) {
        throw new OfferAccessError(
          "Enter a valid website or promotion URL.",
          400
        );
      }
    }

    const {
      data: offer,
      error: offerError,
    } = await auth.client
      .from("offers")
      .select(
        "id,name,country,category,payout,status"
      )
      .eq("id", offerId)
      .eq("status", "active")
      .maybeSingle();

    if (offerError) {
      throw offerError;
    }

    if (!offer) {
      throw new OfferAccessError(
        "Offer is unavailable.",
        404
      );
    }

    const note = [
      `Offer: ${singleLine(offer.name).slice(0, 160)}`,
      `Offer ID: ${offer.id}`,

      `Offer country: ${
        singleLine(offer.country).slice(0, 150) ||
        "Worldwide"
      }`,

      `Category: ${
        singleLine(offer.category).slice(0, 80) ||
        "General"
      }`,

      `Payout: USD ${Number(
        offer.payout || 0
      ).toFixed(2)}`,

      "",

      `Traffic source: ${source}`,
      `Target country: ${geo}`,
      `Estimated daily clicks: ${dailyClicks}`,

      `Website / promotion URL: ${
        promoUrl || "Not provided"
      }`,

      `Promotion plan: ${plan}`,
    ].join("\n");

    if (note.length > 2000) {
      throw new OfferAccessError(
        "Request details are too long. Shorten your promotion plan.",
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
          ? "Request submitted with your offer and traffic details. Email notifications have been queued."
          : "Your existing offer request is unchanged.",
      },
      data.changed ? 201 : 200
    );
  } catch (error) {
    return offerError(error);
  }
}