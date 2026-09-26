export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const offerId = searchParams.get("offer");
  const subid = searchParams.get("subid") || "test_publisher";

  // আপনার সব Offer এর Real Link এখানে
  const OFFERS = {
    "iphone15": "https://onlyhotdates.com/dTmGzfkC?aid=fzkbxfzxzk&kid=hxxhxzhdpdk",
    "onlyhot": "https://onlyhotdates.com/dTmGzfkC?aid=fzkbxfzxzk&kid=hxxhxzhdpdk",
    "hotdates": "https://onlyhotdates.com/dTmGzfkC?aid=fzkbxfzxzk&kid=hxxhxzhdpdk"
  };

  // Default offer - যদি কোন offer ID না পায়, তাহলে আপনার Main Link এ যাবে
  let baseLink = OFFERS[offerId] || OFFERS["onlyhot"];

  // Publisher এর subid টা tracking এর জন্য জুড়ে দেওয়া
  // onlyhotdates এর system এ click id হিসাবে subid যাবে
  const separator = baseLink.includes("?")? "&" : "?";
  const finalUrl = `${baseLink}${separator}subid=${subid}&click_id=${subid}&s1=${subid}`;

  console.log(`TRACK: Offer=${offerId}, Publisher=${subid} -> ${finalUrl}`);

  return Response.redirect(finalUrl, 302);
}
