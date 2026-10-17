"use client";

import { useEffect, useState } from "react";
import { Mail, MessageCircle, Users } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  telegram: string | null;
};

export default function ContactManagersPreview() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadContacts() {
      try {
        const response = await fetch("/api/manager-contacts/public", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load contacts.");
        }

        const result = await response.json();
        setContacts(Array.isArray(result.contacts) ? result.contacts : []);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error ? err.message : "Unable to load contacts."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadContacts();

    return () => controller.abort();
  }, []);

  return (
    <section className="mt-5 rounded-2xl border border-blue-100 bg-white/95 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Users size={22} />
        </div>

        <div>
          <h3 className="font-bold text-[#10234a]">Contact Manager</h3>
          <p className="text-xs text-slate-500">
            Contact our affiliate support team
          </p>
        </div>
      </div>

      {loading && (
        <p className="mt-4 text-sm text-slate-500">
          Loading manager contacts...
        </p>
      )}

      {error && (
        <p role="status" className="mt-4 text-sm text-slate-500">
          Manager contacts are temporarily unavailable.
        </p>
      )}

      {!loading && !error && contacts.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          No manager contacts available yet.
        </p>
      )}

      {!loading && !error && contacts.length > 0 && (
        <div className="mt-4 space-y-3">
          {contacts.map((contact) => {
            const email = contact.email?.trim() || "";
            const telegram = contact.telegram?.trim().replace(/^@/, "") || "";
            const subject = "UpNetwork CPA - Affiliate Support";

            const gmailUrl = email
              ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                  email
                )}&su=${encodeURIComponent(subject)}`
              : "";

            const mailtoUrl = email
              ? `mailto:${email}?subject=${encodeURIComponent(subject)}`
              : "";

            const telegramUrl = telegram
              ? `https://t.me/${encodeURIComponent(telegram)}`
              : "";

            return (
              <div
                key={contact.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="font-semibold text-slate-900">{contact.name}</p>

                {email && (
                  <p className="mt-1 break-all text-sm text-slate-600">
                    {email}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {email && (
                    <>
                      <a
                        href={gmailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        <Mail size={16} />
                        Email via Gmail
                      </a>

                      <a
                        href={mailtoUrl}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        <Mail size={16} />
                        Open Email App
                      </a>
                    </>
                  )}

                  {telegramUrl && (
                    <a
                      href={telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-600"
                    >
                      <MessageCircle size={16} />
                      Telegram
                    </a>
                  )}

                  {!email && !telegramUrl && (
                    <p className="text-sm text-slate-500">
                      No contact method has been added for this manager.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Manager contact details are maintained by the UpNetwork CPA admin team.
      </p>
    </section>
  );
}