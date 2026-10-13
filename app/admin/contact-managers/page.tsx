"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Contact = { id: string; name: string; email: string };
export default function ContactManagersPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const pending = useRef(false);

  async function api(method = "GET", body?: unknown) {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Please log in with your admin account.");
    const response = await fetch("/api/manager-contacts?admin=1", {
      method, cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Request failed.");
    return result;
  }
  async function load() {
    setLoading(true); setError("");
    try {
      const result = await api();
      setContacts(result.contacts ?? []); setAuthorized(true);
    } catch (err) { setAuthorized(false); setError(err instanceof Error ? err.message : "Unable to load contacts."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  function cancelEdit() { setEditingId(null); setName(""); setEmail(""); }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setSuccess("");
    try {
      const result = await api(editingId ? "PATCH" : "POST", { id: editingId, name, email });
      setContacts(current => editingId ? current.map(item => item.id === editingId ? result.contact : item) : [...current, result.contact]);
      setSuccess(editingId ? "Manager email updated." : "Manager email added."); cancelEdit();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save contact."); }
    finally { pending.current = false; setBusy(false); }
  }
  async function remove(contact: Contact) {
    if (pending.current || !window.confirm(`Remove ${contact.email} from affiliate contacts?`)) return;
    pending.current = true; setBusy(true); setError(""); setSuccess("");
    try {
      await api("DELETE", { id: contact.id });
      setContacts(current => current.filter(item => item.id !== contact.id));
      if (editingId === contact.id) cancelEdit();
      setSuccess("Manager email removed.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to remove contact."); }
    finally { pending.current = false; setBusy(false); }
  }
  const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400";
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="text-sm text-cyan-400">â† Admin Dashboard</Link>
        <h1 className="mt-6 text-2xl font-black">Contact Manager Emails</h1>
        <p className="mt-2 text-sm text-slate-400">Add, edit or remove the email addresses affiliates see in Contact Manager.</p>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
        {success && <p role="status" className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-300">{success}</p>}
        {loading ? <p className="mt-8 text-slate-400">Loading...</p> : !authorized ? (
          <button type="button" onClick={() => void load()} className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 text-slate-950">Try again</button>
        ) : <>
          <form onSubmit={save} className="mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-bold">{editingId ? "Edit Manager Email" : "Add Manager Email"}</h2>
            <label className="block text-sm">Manager Name
              <input value={name} onChange={event => setName(event.target.value)} required maxLength={100} disabled={busy} className={`mt-2 ${inputClass}`} placeholder="Manager name or Support Team" />
            </label>
            <label className="block text-sm">Email Address
              <input type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} disabled={busy} className={`mt-2 ${inputClass}`} placeholder="Enter contact email" />
            </label>
            <div className="flex gap-3">
              <button type="submit" disabled={busy} className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{busy ? "Saving..." : editingId ? "Save Changes" : "Add Email"}</button>
              {editingId && <button type="button" disabled={busy} onClick={cancelEdit} className="rounded-xl border border-slate-700 px-4 py-3">Cancel</button>}
            </div>
          </form>
          <section className="mt-6 space-y-3">
            <h2 className="font-bold">Manager Emails ({contacts.length})</h2>
            {contacts.length === 0 && <p className="text-sm text-slate-400">No emails added yet.</p>}
            {contacts.map(contact => <div key={contact.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="min-w-0"><p className="font-bold">{contact.name}</p><p className="mt-1 break-all text-sm text-cyan-400">{contact.email}</p></div>
              <div className="flex gap-3">
                <button type="button" disabled={busy} onClick={() => { setEditingId(contact.id); setName(contact.name); setEmail(contact.email); setError(""); setSuccess(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-50">Edit</button>
                <button type="button" disabled={busy} onClick={() => void remove(contact)} className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 disabled:opacity-50">Remove</button>
              </div>
            </div>)}
          </section>
        </>}
      </div>
    </main>
  );
}