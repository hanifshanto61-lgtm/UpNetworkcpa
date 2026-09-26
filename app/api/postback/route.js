export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const clickid = searchParams.get("clickid");
  const payout = searchParams.get("payout");
  console.log(`LEAD: ${clickid} - $${payout}`);
  return new Response("OK", { status: 200 });
}
