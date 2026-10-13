import { NextRequest } from "next/server";

import {
  approvedAffiliate,
  offerReply,
  offerError,
} from "@/lib/offer-access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  try {
    const auth = await approvedAffiliate(request);

    const {
      data: offersData,
      error: offersError,
    } = await auth.client
      .from("offers")
      .select(
        "id,name,description,category,country,payout,image_url,status,created_at,updated_at"
      )
      .eq("status", "active")
      .order("created_at", {
        ascending: false,
      });

    if (offersError) {
      throw offersError;
    }

    const {
      data: requests,
      error: requestError,
    } = await auth.client
      .from("affiliate_offer_requests")
      .select(
        "id,offer_id,status,revision,admin_note,request_note,requested_at,reviewed_at"
      )
      .eq("user_id", auth.user.id);

    if (requestError) {
      throw requestError;
    }

    const byOffer = new Map(
      (requests ?? []).map((row) => [
        row.offer_id,
        row,
      ])
    );

    const offers = (offersData ?? []).map(
      (offer) => {
        const access = byOffer.get(
          String(offer.id)
        );

        return {
          id: offer.id,
          name: offer.name || "Untitled Offer",
          description: offer.description || "",
          advertiser: null,
          category: offer.category || "",
          country: offer.country || "",
          device: null,
          currency: "USD",
          payout: Number(offer.payout || 0),
          image_url: offer.image_url || "",
          status: offer.status,
          created_at: offer.created_at,
          updated_at: offer.updated_at,

          access_status:
            access?.status ?? "not_requested",

          access_request: access ?? null,

          // Advertiser destinations stay on the server.
          tracking_url: "",
          trackingUrl: "",
          offer_url: "",
        };
      }
    );

    return offerReply({
      success: true,

      affiliateId:
        auth.profile.affiliate_id,

      profile: {
        affiliate_id:
          auth.profile.affiliate_id,

        full_name:
          auth.profile.full_name,

        email:
          auth.user.email,

        status:
          auth.profile.application_status,
      },

      offers,
      totalOffers: offers.length,
    });
  } catch (error) {
    return offerError(error);
  }
}