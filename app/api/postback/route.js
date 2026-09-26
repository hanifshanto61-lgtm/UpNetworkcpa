export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const click_id = searchParams.get('click_id')
  const payout = searchParams.get('payout')

  // সরাসরি DB তে conversion save করুন, কোনো auth check ছাড়া

  return new Response("OK", { status: 200 })
}
