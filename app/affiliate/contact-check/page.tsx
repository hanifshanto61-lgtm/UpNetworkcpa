"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ContactCheckPage() {
  const [result, setResult] = useState("Checking...");

  useEffect(() => {
    async function check() {
      try {
        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          throw new Error("Please log in again.");
        }

        const response = await fetch(
          `/api/affiliate/panel-settings?check=${Date.now()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const body = await response.json();

        const contacts = Array.isArray(body.settings)
          ? body.settings.filter(
              (item: { feature_key?: string }) =>
                item.feature_key === "manager_contact"
            )
          : [];

        setResult(
          JSON.stringify(
            {
              status: response.status,
              managerContact: contacts,
              error: body.error || null,
            },
            null,
            2
          )
        );
      } catch (error) {
        setResult(
          error instanceof Error
            ? error.message
            : "Check failed."
        );
      }
    }

    void check();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <h1 className="mb-5 text-xl font-bold">
        Contact Manager Check
      </h1>

      <pre className="whitespace-pre-wrap break-all rounded-xl bg-slate-900 p-4 text-sm">
        {result}
      </pre>
    </main>
  );
}