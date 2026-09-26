"use client";
import { useEffect, useState } from "react";
export default function Offers() {
  const [offers, setOffers] = useState([]);
  const [subid, setSubid] = useState("test123");

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("offers") || "[]");
    if (saved.length === 0) {
      setOffers([
        { id: "iphone15", name: "iPhone 15 Pro Giveaway - USA", payout: "0.90", country: "USA", link: "https://google.com" },
        { id: "vpn", name: "Nord VPN - 7 Days Trial", payout: "2.50", country: "DE", link: "https://google.com" },
      ]);
    } else setOffers(saved);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-5">
      <h1 className="text-3xl font-bold">All Offers</h1>
      <div className="mt-5 bg-zinc-900 p-4 rounded-xl flex gap-3">
        <span>Your SubID:</span>
        <input value={subid} onChange={(e) => setSubid(e.target.value)} className="bg-black border border-zinc-700 px-3 rounded" />
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        {offers.map((o) => (
          <div key={o.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
            <h3 className="font-bold text-lg">{o.name}</h3>
            <p className="text-zinc-400 text-sm mt-1">{o.country} • ${o.payout}</p>
            <div className="mt-4 bg-black p-2 rounded text-xs break-all text-green-400">
              {typeof window !== "undefined" ? window.location.origin : ""}/api/go?offer={o.id}&subid={subid}
            </div>
            <a href={`/api/go?offer=${o.id}&subid=${subid}`} target="_blank" className="block text-center mt-3 bg-blue-600 py-2 rounded-full font-bold">Get Link</a>
          </div>
        ))}
      </div>
    </div>
  );
}
