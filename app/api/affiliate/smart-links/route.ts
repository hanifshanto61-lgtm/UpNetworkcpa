import { NextRequest } from "next/server";
import {
  approvedAffiliate,
  offerReply,
  OfferAccessError,
} from "@/lib/offer-access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  try {
    const auth = await approvedAffiliate(request);

    const { data, error } = await auth.client
      .from("smart_links")
      .select("id,name,slug,destination_url")
      .eq("is_global", true)
      .eq("smartlink_group", "individual")
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const smartLinks = (data || [])
      .filter((link) => {
        try {
          const url = new URL(
            link.destination_url || ""
          );

          return (
            ["https:", "http:"].includes(
              url.protocol
            ) &&
            !url.username &&
            !url.password &&
            Boolean(link.slug)
          );
        } catch {
          return false;
        }
      })
      .map((link) => ({
        id: link.id,
        name: link.name || link.slug,
        slug: link.slug,
      }));

    return offerReply({
      success: true,
      smartLinks,
    });
  } catch (error) {
    if (error instanceof OfferAccessError) {
      return offerReply(
        {
          success: false,
          error: error.message,
        },
        error.status
      );
    }

    console.error(
      "Affiliate Smart Links:",
      error
    );

    return offerReply(
      {
        success: false,
        error:
          "Unable to load Smart Links. Please try again.",
      },
      500
    );
  }
}