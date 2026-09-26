export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const offerId = searchParams.get("offer");
  const subid = searchParams.get("subid") || "default_pub";

  const OFFERS = {
    "onlyhot": "https://onlyhotdates.com/dTmGzfkC?aid=fzkbxfzxzk&kid=hxxhxzhdpdk",
    "hotdates": "https://onlyhotdates.com/dTmGzfkC?aid=fzkbxfzxzk&kid=hxxhxzhdpdk",
    "dating": "https://onlyhotdates.com/dTmGzfkC?aid=fzkbxfzxzk&kid=hxxhxzhdpdk"
  };

  const baseLink = OFFERS[offerId] || OFFERS["onlyhot"];

  // subid tracking এর জন্য add করা হলো
  const finalUrl = `${baseLink}&subid=${subid}&s1=${subid}&click_id=${subid}`;

  return Response.redirect(finalUrl, 302);
}
