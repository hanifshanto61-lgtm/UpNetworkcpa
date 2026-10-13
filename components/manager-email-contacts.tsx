"use client";

import { useEffect, useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  telegram: string | null;
};

export default function ManagerEmailContacts({
  dark,
  affiliateId,
}: {
  dark: boolean;
  affiliateId: string;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        if (!supabase) {
          throw new Error(
            "Contact support is not configured."
          );
        }

        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          throw new Error("Please log in again.");
        }

        const response = await fetch(
          "/api/manager-contacts",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Unable to load manager contacts."
          );
        }

        if (active) {
          setContacts(result.contacts ?? []);
        }
      } catch (err) {
        if (active) {
          setContacts([]);

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load manager contacts."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [retry]);

  const cardClass = `
    flex items-center gap-3 rounded-xl border p-4 transition
    ${
      dark
        ? "border-white/10 bg-white/[0.025] hover:bg-cyan-400/5"
        : "border-slate-200 bg-slate-50 hover:bg-cyan-50"
    }
  `;

  const emails = contacts.filter(
    (contact) => contact.email
  );

  const telegrams = contacts.filter(
    (contact) => contact.telegram
  );

  if (loading) {
    return (
      <p className="text-sm text-slate-500">
        Loading manager contacts...
      </p>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="text-sm text-red-400"
      >
        <p>{error}</p>

        <button
          type="button"
          onClick={() =>
            setRetry((value) => value + 1)
          }
          className="mt-2 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Mail size={17} />
          Email Contact
        </h3>

        {emails.length === 0 ? (
          <p className="text-xs text-slate-500">
            No manager email has been added yet.
          </p>
        ) : (
          <div className="space-y-2">
            {emails.map((contact) => (
              <a
                key={contact.id}
                className={cardClass}
                href={`mailto:${encodeURIComponent(
                  contact.email!
                )}?subject=${encodeURIComponent(
                  `UpNetwork CPA Support - ${affiliateId}`
                )}`}
              >
                <Mail
                  size={20}
                  className="shrink-0 text-cyan-500"
                />

                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {contact.name}
                  </p>

                  <p className="mt-1 break-all text-xs text-cyan-500">
                    {contact.email}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <MessageCircle size={17} />
          Telegram Contact
        </h3>

        {telegrams.length === 0 ? (
          <p className="text-xs text-slate-500">
            No Telegram manager has been added yet.
          </p>
        ) : (
          <div className="space-y-2">
            {telegrams.map((contact) => (
              <a
                key={contact.id}
                className={cardClass}
                href={`https://t.me/${encodeURIComponent(
                  contact.telegram!
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle
                  size={20}
                  className="shrink-0 text-emerald-500"
                />

                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {contact.name}
                  </p>

                  <p className="mt-1 break-all text-xs text-emerald-500">
                    @{contact.telegram}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}