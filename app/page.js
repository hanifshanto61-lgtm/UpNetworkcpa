export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="flex justify-between p-5 border-b border-zinc-800">
        <h1 className="text-2xl font-bold text-blue-500">UP-NETWORK.IT</h1>
        <a href="/offers" className="bg-blue-600 px-6 py-2 rounded-full font-bold">Dashboard</a>
      </nav>
      <div className="text-center mt-32 px-5">
        <h1 className="text-5xl md:text-7xl font-black">BEST CPA NETWORK</h1>
        <p className="mt-4 text-zinc-400 text-lg">Highest Payout • Weekly Payment • Smartlink</p>
        <div className="mt-8 flex justify-center gap-4">
          <a href="/offers" className="bg-white text-black px-8 py-3 rounded-full font-bold">View Offers</a>
          <a href="/admin" className="bg-zinc-800 px-8 py-3 rounded-full">Admin Panel</a>
        </div>
      </div>
    </div>
  );
}
