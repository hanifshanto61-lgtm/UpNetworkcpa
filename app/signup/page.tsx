"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
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
  });

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAccuracy, setAgreeAccuracy] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!supabase) {
      setMessage("Supabase configuration is missing. Please contact the administrator.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (form.password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (!agreeTerms || !agreeAccuracy) {
      setMessage("Please accept the required confirmations before creating your account.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            account_type: "affiliate",
            first_name: form.firstName,
            last_name: form.lastName,
            username: form.username,
            phone: form.phone,
            country: form.country,
            city: form.city,
            address: form.address,
            traffic_source: form.trafficSource,
            traffic_url: form.trafficUrl,
            social_profile: form.socialProfile,
            monthly_traffic: form.monthlyTraffic,
            promotion_method: form.promotionMethod,
            experience: form.experience,
            previous_networks: form.previousNetworks,
            company_name: form.companyName,
            payment_method: form.paymentMethod,
            application_status: "pending",
          },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        "Application submitted successfully. Please check your email to verify your account. Your affiliate application is now pending admin approval."
      );

      setForm((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }));
    } catch {
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
        </div>

        <form
          onSubmit={handleSignup}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          {/* Account Information */}
          <section className="border-b border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Account Information
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Basic information for your affiliate account.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="First Name"
                name="firstName"
                value={form.firstName}
                onChange={updateField}
                required
                placeholder="Your first name"
              />

              <Field
                label="Last Name"
                name="lastName"
                value={form.lastName}
                onChange={updateField}
                required
                placeholder="Your last name"
              />

              <Field
                label="Username / Affiliate ID"
                name="username"
                value={form.username}
                onChange={updateField}
                required
                placeholder="Choose a username"
              />

              <Field
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                required
                placeholder="you@example.com"
              />

              <Field
                label="Password"
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                required
                placeholder="At least 6 characters"
              />

              <Field
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={updateField}
                required
                placeholder="Confirm your password"
              />
            </div>
          </section>

          {/* Contact Information */}
          <section className="border-b border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Contact Information
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Tell us how we can contact you.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Phone Number"
                name="phone"
                value={form.phone}
                onChange={updateField}
                required
                placeholder="+880..."
              />

              <Field
                label="Country"
                name="country"
                value={form.country}
                onChange={updateField}
                required
                placeholder="Bangladesh"
              />

              <Field
                label="City"
                name="city"
                value={form.city}
                onChange={updateField}
                required
                placeholder="Your city"
              />

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Address
                </label>

                <textarea
                  name="address"
                  value={form.address}
                  onChange={updateField}
                  required
                  rows={3}
                  placeholder="Your address"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* Promotion Information */}
          <section className="border-b border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Promotion Information
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Help us understand how you plan to promote our offers.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                label="Main Traffic Source"
                name="trafficSource"
                value={form.trafficSource}
                onChange={updateField}
                required
                options={[
                  "Website",
                  "SEO",
                  "Social Media",
                  "Paid Ads",
                  "Native Ads",
                  "Push Traffic",
                  "Email Marketing",
                  "YouTube",
                  "Other",
                ]}
              />

              <SelectField
                label="Monthly Traffic Volume"
                name="monthlyTraffic"
                value={form.monthlyTraffic}
                onChange={updateField}
                required
                options={[
                  "Less than 1,000",
                  "1,000 - 10,000",
                  "10,000 - 50,000",
                  "50,000 - 100,000",
                  "100,000+",
                ]}
              />

              <Field
                label="Website / Traffic URL"
                name="trafficUrl"
                value={form.trafficUrl}
                onChange={updateField}
                placeholder="https://example.com"
              />

              <Field
                label="Social Media / Channel"
                name="socialProfile"
                value={form.socialProfile}
                onChange={updateField}
                placeholder="Profile or channel URL"
              />

              <SelectField
                label="Promotion Method"
                name="promotionMethod"
                value={form.promotionMethod}
                onChange={updateField}
                required
                options={[
                  "Organic Traffic",
                  "Paid Advertising",
                  "Social Media Promotion",
                  "Content Marketing",
                  "Email Marketing",
                  "Direct Traffic",
                  "Other",
                ]}
              />

              <SelectField
                label="Affiliate Experience"
                name="experience"
                value={form.experience}
                onChange={updateField}
                required
                options={[
                  "New to affiliate marketing",
                  "Less than 1 year",
                  "1 - 3 years",
                  "3 - 5 years",
                  "5+ years",
                ]}
              />

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Previous CPA / Affiliate Networks
                </label>

                <textarea
                  name="previousNetworks"
                  value={form.previousNetworks}
                  onChange={updateField}
                  rows={3}
                  placeholder="List previous networks you have worked with, if any."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* Business Information */}
          <section className="border-b border-slate-200 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                Business Information
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Optional information about your business.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Company
