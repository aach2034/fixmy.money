"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { PLANS } from "@/lib/stripe/plans";
import { hasActiveSubscription } from "@/lib/subscription/access";

type Subscription = {
  stripe_customer_id: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  trial_end: string | null;
};

type ClientBilling = {
  id: string;
  name: string;
  email: string;
  plan: string | null;
  subscription_status: "paid" | "overdue" | "pending" | null;
};

export default function BillingContent() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [clients, setClients] = useState<ClientBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const profile = await supabase
        .from("user_profiles")
        .select(
          "stripe_customer_id, subscription_status, subscription_plan, trial_end",
        )
        .eq("id", user.id)
        .single();
      if (profile.error) toast.error("Could not load your subscription.");
      setSubscription(profile.data as Subscription | null);
      if (hasActiveSubscription(profile.data?.subscription_status)) {
        const clientRows = await supabase
          .from("staff_clients")
          .select("id, name, email, plan, subscription_status")
          .eq("owner_id", user.id)
          .order("name");
        setClients((clientRows.data ?? []) as ClientBilling[]);
      } else {
        setClients([]);
      }
      setLoading(false);
    })();
  }, [supabase, user]);

  const manageBilling = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/billing-portal", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok || !data.url)
        throw new Error(data.error || "Billing portal unavailable");
      window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || "Could not open billing management.");
    } finally {
      setPortalLoading(false);
    }
  };

  const choosePlan = async (plan: string) => {
    setCheckoutLoading(plan);
    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (data.alreadyActive) {
        window.location.href = data.redirectTo || "/dashboard";
        return;
      }
      if (!response.ok || !data.url)
        throw new Error(data.error || "Checkout unavailable");
      window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || "Could not start checkout.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const status = subscription?.subscription_status || "inactive";
  const isActive = hasActiveSubscription(status);
  const paid = clients.filter((c) => c.subscription_status === "paid").length;
  const overdue = clients.filter(
    (c) => c.subscription_status === "overdue",
  ).length;
  const pending = clients.filter(
    (c) => !c.subscription_status || c.subscription_status === "pending",
  ).length;

  if (loading)
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-3 text-slate-600">
        <Loader2 size={21} className="animate-spin" />
        Loading billing…
      </div>
    );

  return (
    <div className="app-page page-stack max-w-6xl">
      <div className="page-header"><div>
        <h1 className="page-title">Billing center</h1>
        <p className="page-description">
          Manage your FixMy.Money subscription and track client billing
          separately.
        </p>
      </div>
      </div>

      <section className="rounded-xl border border-green-200 bg-green-50 p-5 sm:p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center">
            <CreditCard size={21} />
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Your FixMy.Money subscription
            </p>
            <h2 className="text-xl font-bold text-slate-900 mt-1 capitalize">
              {subscription?.subscription_plan || "No plan selected"}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              {isActive ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <AlertTriangle size={16} className="text-amber-600" />
              )}
              <span className="text-sm font-semibold text-slate-700 capitalize">
                {status.replace("_", " ")}
              </span>
              {subscription?.trial_end && (
                <span className="text-xs text-slate-500">
                  · Trial ends{" "}
                  {new Date(subscription.trial_end).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-3">
              This is where your business pays FixMy.Money. The secure Stripe
              portal lets you update your card, view invoices, change plans, or
              cancel.
            </p>
          </div>
          {subscription?.stripe_customer_id ? (
            <button
              onClick={manageBilling}
              disabled={portalLoading}
              className="btn-primary"
            >
              {portalLoading ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <ExternalLink size={15} />
              )}
              Manage my subscription
            </button>
          ) : (
            <Link href="#plans" className="btn-primary">
              Choose a plan
            </Link>
          )}
        </div>
      </section>

      {!isActive && (
        <section
          id="plans"
          className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
        >
          <h2 className="font-bold text-slate-900">
            Choose your business plan
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Checkout and future billing are handled securely by Stripe.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-5">
            {Object.values(PLANS)
              .filter((plan: any) => plan.stripeAmountCents)
              .map((plan: any) => (
                <div
                  key={plan.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <p className="font-bold text-slate-900">{plan.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {plan.description}
                  </p>
                  <p className="text-2xl font-black text-slate-900 mt-4">
                    ${plan.stripeAmountCents / 100}
                    <span className="text-sm font-medium text-slate-400">
                      /month
                    </span>
                  </p>
                  <button
                    onClick={() => choosePlan(plan.id)}
                    disabled={checkoutLoading === plan.id}
                    className="w-full mt-4 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    {checkoutLoading === plan.id
                      ? "Opening checkout…"
                      : "Select plan"}
                  </button>
                </div>
              ))}
          </div>
        </section>
      )}

      {isActive && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Client billing tracker
              </p>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                Payments your clients owe your business
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Only real client records from this workspace appear here.
              </p>
            </div>
            <Link
              href="/client-management"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <Plus size={15} />
              Add client
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-2xl font-bold text-emerald-700">{paid}</p>
              <p className="text-xs font-semibold text-emerald-700">Paid</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4">
              <p className="text-2xl font-bold text-red-700">{overdue}</p>
              <p className="text-xs font-semibold text-red-700">Overdue</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-2xl font-bold text-amber-700">{pending}</p>
              <p className="text-xs font-semibold text-amber-700">
                Pending setup
              </p>
            </div>
          </div>
          {clients.length ? (
            <div className="mt-5 divide-y divide-slate-100">
              {clients.map((client) => (
                <div key={client.id} className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Users size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {client.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {client.email || "No email"} ·{" "}
                      {client.plan || "No service plan"}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold rounded-full px-2.5 py-1 ${client.subscription_status === "paid" ? "bg-emerald-100 text-emerald-700" : client.subscription_status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {client.subscription_status || "pending"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <Users className="mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700 mt-3">
                No client billing records yet
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Add a client to begin tracking their payment status.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
