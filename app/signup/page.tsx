"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";

type FormState = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  telegramId: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  trafficSource: string;
  trafficUrl: string;
  socialProfile: string;
  monthlyTraffic: string;
  promotionMethod: string;
  experience: string;
  previousNetworks: string;
  companyName: string;
  paymentMethod: string;
  password: string;
  confirmPassword: string;
};

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  telegramId: "",
  phone: "",
  country: "",
  city: "",
  address: "",
  trafficSource: "",
  trafficUrl: "",
  socialProfile: "",
  monthlyTraffic: "",
  promotionMethod: "",
  experience: "",
  previousNetworks: "",
  companyName: "",
  paymentMethod: "",
  password: "",
  confirmPassword: "",
};

export default function SignupPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [referralCode, setReferralCode] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAccuracy, setAgreeAccuracy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReferralCode(params.get("ref")?.trim() || "");
  }, []);

  function updateField(
    e: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setSuccess(false);

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (form.password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (!form.telegramId.trim()) {
      setMessage("Telegram ID is required.");
      return;
    }

    if (!agreeTerms || !agreeAccuracy) {
      setMessage("Please accept both required confirmations.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          username: form.username.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          telegramId: form.telegramId.trim(),
          phone: form.phone.trim(),
          country: form.country.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          trafficSource: form.trafficSource,
          trafficUrl: form.trafficUrl.trim(),
          socialProfile: form.socialProfile.trim(),
          monthlyTraffic: form.monthlyTraffic,
          promotionMethod: form.promotionMethod,
          experience: form.experience,
          previousNetworks: form.previousNetworks.trim(),
          companyName: form.companyName.trim(),
          paymentMethod: form.paymentMethod,
          referralCode: referralCode.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        setMessage(result?.error || "Registration failed. Please try again.");
        return;
      }

      setSuccess(true);
      setMessage(
        "Registration successful! A verification email has been sent to your email address. Please verify your email first. After verification, your application will remain pending until an administrator approves it."
      );

      setForm((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));
    } catch (error) {
      console.error("Registration error:", error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-lg">
            UP
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900">
            Join UpNetwork CPA
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Create your affiliate publisher account
          </p>

          {referralCode && (
            <div className="mx-auto mt-4 max-w-md rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                Referral Registration
              </p>
              <p className="mt-1 text-sm text-green-800">
                You were referred by affiliate:
              </p>
              <p className="mt-1 break-all font-mono text-sm font-bold text-green-700">
                {referralCode}
              </p>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSignup}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <section className="border-b border-slate-200 p-6 sm:p-8">
            <SectionHeading
              title="Account Information"
              description="Basic information for your affiliate account."
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First Name" name="firstName" value={form.firstName} onChange={updateField} required placeholder="Your first name" />
              <Field label="Last Name" name="lastName" value={form.lastName} onChange={updateField} required placeholder="Your last name" />
              <Field label="Username / Affiliate ID" name="username" value={form.username} onChange={updateField} required placeholder="Choose a username" />
              <Field label="Email Address" name="email" type="email" value={form.email} onChange={updateField} required placeholder="you@example.com" />

              <Field label="Password" name="password" type="password" value={form.password} onChange={updateField} required placeholder="At least 6 characters" />
              <Field label="Confirm Password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} required placeholder="Confirm your password" />

              <div className="sm:col-span-2">
                <Field
                  label="Telegram ID (Required)"
                  name="telegramId"
                  value={form.telegramId}
                  onChange={updateField}
                  required
                  placeholder="@yourtelegramusername"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Enter your Telegram username so our affiliate manager can contact you.
                </p>
              </div>
            </div>
          </section>

          <section className="border-b border-slate-200 p-6 sm:p-8">
            <SectionHeading
              title="Contact Information"
              description="Tell us how we can contact you."
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Phone Number" name="phone" value={form.phone} onChange={updateField} required placeholder="+880..." />
              <Field label="Country" name="country" value={form.country} onChange={updateField} required placeholder="Bangladesh" />
              <Field label="City" name="city" value={form.city} onChange={updateField} required placeholder="Your city" />

              <div className="sm:col-span-2">
                <TextAreaField label="Address" name="address" value={form.address} onChange={updateField} required placeholder="Your address" />
              </div>
            </div>
          </section>

          <section className="border-b border-slate-200 p-6 sm:p-8">
            <SectionHeading
              title="Promotion Information"
              description="Help us understand how you plan to promote our offers."
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField label="Main Traffic Source" name="trafficSource" value={form.trafficSource} onChange={updateField} required options={["Website", "SEO", "Social Media", "Paid Ads", "Native Ads", "Push Traffic", "Email Marketing", "YouTube", "Other"]} />

              <SelectField label="Monthly Traffic Volume" name="monthlyTraffic" value={form.monthlyTraffic} onChange={updateField} required options={["Less than 1,000", "1,000 - 10,000", "10,000 - 50,000", "50,000 - 100,000", "100,000+"]} />

              <Field label="Website / Traffic URL" name="trafficUrl" value={form.trafficUrl} onChange={updateField} placeholder="https://example.com" />
              <Field label="Social Media / Channel" name="socialProfile" value={form.socialProfile} onChange={updateField} placeholder="Profile or channel URL" />

              <SelectField label="Promotion Method" name="promotionMethod" value={form.promotionMethod} onChange={updateField} required options={["Organic Traffic", "Paid Advertising", "Social Media Promotion", "Content Marketing", "Email Marketing", "Direct Traffic", "Other"]} />

              <SelectField label="Affiliate Experience" name="experience" value={form.experience} onChange={updateField} required options={["New to affiliate marketing", "Less than 1 year", "1 - 3 years", "3 - 5 years", "5+ years"]} />

              <div className="sm:col-span-2">
                <TextAreaField label="Previous CPA / Affiliate Networks" name="previousNetworks" value={form.previousNetworks} onChange={updateField} placeholder="List previous networks you have worked with, if any." />
              </div>
            </div>
          </section>

          <section className="border-b border-slate-200 p-6 sm:p-8">
            <SectionHeading
              title="Business Information"
              description="Optional information about your business."
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Company Name" name="companyName" value={form.companyName} onChange={updateField} placeholder="Your company name (optional)" />

              <SelectField label="Preferred Payment Method" name="paymentMethod" value={form.paymentMethod} onChange={updateField} options={["PayPal", "Payoneer", "Bank Transfer", "Cryptocurrency", "Other"]} />
            </div>
          </section>

          <section className="p-6 sm:p-8">
            <SectionHeading
              title="Final Confirmation"
              description="Please review and confirm before submitting your application."
            />

            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600" />
                <span>I agree to the terms and conditions of UpNetwork CPA.</span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
                <input type="checkbox" checked={agreeAccuracy} onChange={(e) => setAgreeAccuracy(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600" />
                <span>I confirm that the information provided in this application is accurate and complete.</span>
              </label>
            </div>

            {message && (
              <div
                role="alert"
                className={`mt-6 whitespace-pre-line rounded-xl border p-4 text-sm ${
                  success
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting Application..." : "Create Affiliate Account"}
            </button>

            <p className="mt-5 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                Sign in
              </Link>
            </p>
          </section>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} UpNetwork CPA. All rights reserved.
        </p>
      </div>
    </main>
  );
}

type FieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
};

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

type TextAreaProps = {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  required?: boolean;
  placeholder?: string;
};

function TextAreaField({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder = "",
}: TextAreaProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        rows={3}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  required?: boolean;
};

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
}: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}