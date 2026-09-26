"use client";
import { useState, useEffect } from "react";
export default function Admin() {
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState({ id: "", name: "", payout: "", country: "", link: "" });

  useEffect(() => { setOffers(JSON.parse(localStorage.getItem("offers") || "[]")); }, []);
  const save = () => {
    const newOffers = [...offers, form];
    localStorage.setItem("offers", JSON.stringify(newOffers));
    setOffers(newOffers);
    alert("Offer Added!");
  };
  return (
    <div className="min-h-screen bg-black text-white p-10">
      <h1 className="text-3xl font-bold">Admin - Add Offer</h1>
      <div className="mt-6 bg-zinc-900 p-6 rounded-2xl max-w-xl grid gap-3">
        <input placeholder="Offer ID (ex: iphone15)" className="bg-black border border-zinc-700 p-3 rounded" onChange={e=>setForm({...form, id:e.target.value})} />
        <input placeholder="Offer Name" className="bg-black border border-zinc-700 p-3 rounded" onChange={e=>setForm({...form, name:e.target.value})} />
        <input placeholder="Payout (ex: 0.90)" className="bg-black border border-zinc-700 p-3 rounded" onChange={e=>setForm({...form, payout:e.target.value})} />
        <input placeholder="Country (ex: USA)" className="bg-black border border-zinc-700 p-3 rounded" onChange={e=>setForm({...form, country:e.target.value})} />
        <input placeholder="Real CPA Link" className="bg-black border border-zinc-700 p-3 rounded" onChange={e=>setForm({...form, link:e.target.value})} />
        <button onClick={save} className="bg-blue-600 py-3 rounded-full font-bold mt-2">Add Offer</button>
      </div>
      <p className="mt-5 text-zinc-400">Added Offers: {offers.length}</p>
    </div>
  );
}
