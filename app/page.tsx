export default function Home() {
  return (
    <div style={{padding: 40, textAlign: 'center', fontFamily: 'sans-serif'}}>
      <h1 style={{fontSize: 32, fontWeight: 'bold'}}>UP NETWORK - CPA Platform</h1>
      <p style={{marginTop: 20}}>Welcome! Your tracking is live.</p>
      <div style={{marginTop: 30, background: '#f3f3f3', padding: 20, borderRadius: 10}}>
        <p><b>Postback URL:</b></p>
        <code>https://up-networkcpa.vercel.app/api/postback?click_id=xxx&payout=1</code>
      </div>
      <div style={{marginTop: 20}}>
        <a href="/dashboard" style={{background: 'black', color: 'white', padding: '10px 20px', borderRadius: 5, textDecoration: 'none'}}>Go to Dashboard</a>
      </div>
    </div>
  )
}
