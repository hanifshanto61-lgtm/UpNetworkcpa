"use client";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Contact = { id: string; name: string; email: string };
export default function ManagerEmailContacts({ dark, affiliateId }: { dark: boolean; affiliateId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        if (!supabase) throw new Error("Contact support is not configured.");
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Please log in again.");
        const response = await fetch("/api/manager-contacts", {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load manager emails.");
        if (active) setContacts(result.contacts ?? []);
      } catch (err) {
        if (active) { setContacts([]); setError(err instanceof Error ? err.message : "Unable to load manager emails."); }
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [retry]);
  return (
    <section className="mb-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Mail size={17} /> Email Contact</h3>
      {loading ? <p className="text-xs text-slate-500">Loading manager emails...</p> : error ? (
        <div role="alert" className="text-xs text-red-400">
          <p>{error}</p><button type="button" onClick={() => setRetry(v => v + 1)} className="mt-2 underline">Try again</button>
        </div>
      ) : contacts.length === 0 ? <p className="text-xs text-slate-500">No manager email has been added yet. Please use Telegram below.</p> : (
        <div className="space-y-2">
          {contacts.map(contact => (
            <a key={contact.id}
              href={`mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent(`UpNetwork CPA Support â€” ${affiliateId}`)}`}
              className={`flex items-center gap-3 rounded-xl border p-4 ${dark ? "border-white/10 bg-white/[0.025] hover:bg-cyan-400/5" : "border-slate-200 bg-slate-50 hover:bg-cyan-50"}`}>
              <Mail size={20} className="shrink-0 text-cyan-500" />
              <div className="min-w-0"><p className="text-sm font-semibold">{contact.name}</p><p className="mt-1 break-all text-xs text-cyan-500">{contact.email}</p></div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}