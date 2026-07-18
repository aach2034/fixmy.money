import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  // ✅ CORS preflight
  if (req?.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const {
      type, to, name, plan, trialEndDate, renewalDate, amount,
      // analysis_complete
      totalNegativeAccounts, totalCollections, totalLatePayments,
      totalHardInquiries, estimatedScoreImpact, improvementOpportunities,
      // dispute_recommendations_ready
      disputeCount, highPriorityCount,
      // client_notification
      clientName, clientEmail, assignedStaff, clientPlan,
    } = await req?.json();

    const RESEND_API_KEY = (globalThis as any)?.Deno?.env?.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }

    const SITE_URL = "https://adam.baby";

    let subject = "";
    let html = "";

    const planName = plan
      ? plan?.charAt(0)?.toUpperCase() + plan?.slice(1)
      : "Starter";

    const greeting = name ? `Hi ${name},` : "Hi there,";

    if (type === "trial_confirmation") {
      subject = `Your Fix My Money 14-Day Free Trial Has Started 🎉`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #059669; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Fix My Money</h1>
            <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">Credit Repair Business Platform</p>
          </div>
          <div style="padding: 40px 32px;">
            <h2 style="color: #111827; font-size: 22px; margin: 0 0 16px;">Your 14-Day Free Trial Is Active!</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">${greeting}</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Welcome to Fix My Money! Your <strong>${planName} Plan</strong> trial is now active. 
              You have full access to every feature for the next 14 days — completely free, no credit card required.
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #065f46; margin: 0 0 12px; font-size: 16px;">What's included in your trial:</h3>
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 2;">
                <li>Full access to all ${planName} Plan features</li>
                <li>Client portal &amp; dispute management</li>
                <li>AI-powered dispute analysis</li>
                <li>Automated reminders &amp; follow-ups</li>
                <li>Revenue dashboard &amp; reporting</li>
              </ul>
            </div>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              Your trial ends on <strong>${trialEndDate || "14 days from today"}</strong>. 
              After that, you'll be billed <strong>$${amount || "49"}/month</strong> for the ${planName} Plan — cancel anytime before then.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${SITE_URL}/homepage" 
                 style="background: #059669; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
                Go to Your Dashboard →
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              Questions? Reply to this email or contact our support team. We're here to help you grow your credit repair business.
            </p>
          </div>
          <div style="background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">© 2025 Fix My Money · All rights reserved</p>
            <p style="color: #9ca3af; font-size: 13px; margin: 4px 0 0;">You can cancel your trial anytime from your billing settings.</p>
          </div>
        </div>
      `;
    } else if (type === "subscription_started") {
      subject = `Your Fix My Money ${planName} Subscription Is Now Active`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #059669; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Fix My Money</h1>
            <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">Credit Repair Business Platform</p>
          </div>
          <div style="padding: 40px 32px;">
            <h2 style="color: #111827; font-size: 22px; margin: 0 0 16px;">Subscription Confirmed ✅</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">${greeting}</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Your <strong>${planName} Plan</strong> subscription is now active. Thank you for choosing Fix My Money to power your credit repair business!
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #065f46; margin: 0 0 12px; font-size: 16px;">Subscription Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Plan</td>
                  <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${planName}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Billing Amount</td>
                  <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">$${amount || "99"}/month</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Next Renewal</td>
                  <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${renewalDate || "Next month"}</td>
                </tr>
              </table>
            </div>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${SITE_URL}/homepage" 
                 style="background: #059669; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
                Go to Your Dashboard →
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              You can manage your subscription, update payment methods, or cancel anytime from your 
              <a href="${SITE_URL}/billing-subscriptions" style="color: #059669;">Billing Settings</a>.
            </p>
          </div>
          <div style="background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">© 2025 Fix My Money · All rights reserved</p>
          </div>
        </div>
      `;
    } else if (type === "renewal_reminder") {
      subject = `Your Fix My Money Subscription Renews in 3 Days`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #059669; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Fix My Money</h1>
            <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">Credit Repair Business Platform</p>
          </div>
          <div style="padding: 40px 32px;">
            <h2 style="color: #111827; font-size: 22px; margin: 0 0 16px;">Renewal Reminder 🔔</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">${greeting}</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Your <strong>${planName} Plan</strong> subscription will automatically renew in <strong>3 days</strong>.
            </p>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #92400e; margin: 0 0 12px; font-size: 16px;">Upcoming Charge:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Plan</td>
                  <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${planName}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Amount</td>
                  <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">$${amount || "99"}/month</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Renewal Date</td>
                  <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${renewalDate || "In 3 days"}</td>
                </tr>
              </table>
            </div>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              No action needed — your subscription will renew automatically. If you'd like to make changes, 
              visit your billing settings before the renewal date.
            </p>
            <div style="text-align: center; margin: 32px 0; display: flex; gap: 12px; justify-content: center;">
              <a href="${SITE_URL}/billing-subscriptions" 
                 style="background: #059669; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block; margin: 0 6px;">
                Manage Billing
              </a>
              <a href="${SITE_URL}/homepage" 
                 style="background: #f3f4f6; color: #374151; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block; margin: 0 6px;">
                Go to Dashboard
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              Thank you for being a Fix My Money customer. We're committed to helping you grow your credit repair business.
            </p>
          </div>
          <div style="background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">© 2025 Fix My Money · All rights reserved</p>
            <p style="color: #9ca3af; font-size: 13px; margin: 4px 0 0;">
              <a href="${SITE_URL}/billing-subscriptions" style="color: #9ca3af;">Manage subscription</a>
            </p>
          </div>
        </div>
      `;
    } else if (type === "analysis_complete") {
      subject = `Your Credit Report Analysis Is Ready 📊`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #059669; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Fix My Money</h1>
            <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">Credit Repair Business Platform</p>
          </div>
          <div style="padding: 40px 32px;">
            <h2 style="color: #111827; font-size: 22px; margin: 0 0 16px;">Your Credit Report Analysis Is Complete ✅</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">${greeting}</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              FixMy AI has finished analyzing your credit report. Here's a summary of what we found:
            </p>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #991b1b; margin: 0 0 14px; font-size: 16px;">Analysis Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #6b7280; padding: 7px 0; font-size: 14px; border-bottom: 1px solid #fee2e2;">Negative Accounts</td>
                  <td style="color: #dc2626; font-weight: 700; text-align: right; font-size: 16px; border-bottom: 1px solid #fee2e2;">${totalNegativeAccounts ?? 0}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 7px 0; font-size: 14px; border-bottom: 1px solid #fee2e2;">Collections</td>
                  <td style="color: #ea580c; font-weight: 700; text-align: right; font-size: 16px; border-bottom: 1px solid #fee2e2;">${totalCollections ?? 0}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 7px 0; font-size: 14px; border-bottom: 1px solid #fee2e2;">Late Payments</td>
                  <td style="color: #d97706; font-weight: 700; text-align: right; font-size: 16px; border-bottom: 1px solid #fee2e2;">${totalLatePayments ?? 0}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 7px 0; font-size: 14px; border-bottom: 1px solid #fee2e2;">Hard Inquiries</td>
                  <td style="color: #2563eb; font-weight: 700; text-align: right; font-size: 16px; border-bottom: 1px solid #fee2e2;">${totalHardInquiries ?? 0}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 7px 0; font-size: 14px; border-bottom: 1px solid #fee2e2;">Est. Score Impact</td>
                  <td style="color: #dc2626; font-weight: 700; text-align: right; font-size: 16px; border-bottom: 1px solid #fee2e2;">-${estimatedScoreImpact ?? 0} pts</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 7px 0; font-size: 14px;">Disputable Items</td>
                  <td style="color: #059669; font-weight: 700; text-align: right; font-size: 16px;">${improvementOpportunities ?? 0}</td>
                </tr>
              </table>
            </div>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              We've identified <strong>${improvementOpportunities ?? 0} item(s)</strong> that may be disputable under the FCRA. 
              Review your full report and generate dispute letters directly from your dashboard.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${SITE_URL}/onboarding" 
                 style="background: #059669; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
                View Full Analysis →
              </a>
            </div>
          </div>
          <div style="background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">© 2025 Fix My Money · All rights reserved</p>
          </div>
        </div>
      `;
    } else if (type === "dispute_recommendations_ready") {
      subject = `Your Dispute Letters Are Ready to Send ✉️`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #059669; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Fix My Money</h1>
            <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">Credit Repair Business Platform</p>
          </div>
          <div style="padding: 40px 32px;">
            <h2 style="color: #111827; font-size: 22px; margin: 0 0 16px;">Dispute Recommendations Ready 🎯</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">${greeting}</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Great news! FixMy AI has generated <strong>${disputeCount ?? 0} dispute recommendation(s)</strong> based on your credit report analysis.
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #6b7280; padding: 7px 0; font-size: 14px; border-bottom: 1px solid #dcfce7;">Total Disputes Identified</td>
                  <td style="color: #059669; font-weight: 700; text-align: right; font-size: 18px; border-bottom: 1px solid #dcfce7;">${disputeCount ?? 0}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 7px 0; font-size: 14px;">High Priority Items</td>
                  <td style="color: #dc2626; font-weight: 700; text-align: right; font-size: 18px;">${highPriorityCount ?? 0}</td>
                </tr>
              </table>
            </div>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              Each dispute letter is pre-written and FCRA-compliant. Simply review, select the items you want to dispute, and send — it takes less than 2 minutes.
            </p>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                ⚡ <strong>Act quickly:</strong> Dispute letters sent within 30 days of identifying errors have the highest success rates.
              </p>
            </div>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${SITE_URL}/dispute-letter-management" 
                 style="background: #059669; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
                Review &amp; Send Disputes →
              </a>
            </div>
          </div>
          <div style="background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">© 2025 Fix My Money · All rights reserved</p>
          </div>
        </div>
      `;
    } else if (type === "client_notification") {
      subject = `Welcome to Fix My Money — Your Credit Repair Journey Starts Now 🚀`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: #059669; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Fix My Money</h1>
            <p style="color: #d1fae5; margin: 8px 0 0; font-size: 14px;">Credit Repair Business Platform</p>
          </div>
          <div style="padding: 40px 32px;">
            <h2 style="color: #111827; font-size: 22px; margin: 0 0 16px;">You've Been Enrolled! 🎉</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${clientName || "there"},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              You've been successfully enrolled in the Fix My Money credit repair program. 
              Your dedicated credit specialist is ready to help you on your journey to better credit.
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #065f46; margin: 0 0 14px; font-size: 16px;">Your Enrollment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #6b7280; padding: 7px 0; font-size: 14px; border-bottom: 1px solid #dcfce7;">Plan</td>
                  <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px; border-bottom: 1px solid #dcfce7;">${clientPlan || "Starter"}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 7px 0; font-size: 14px;">Assigned Specialist</td>
                  <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${assignedStaff || "Your Credit Specialist"}</td>
                </tr>
              </table>
            </div>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              Here's what happens next:
            </p>
            <ol style="color: #374151; font-size: 14px; line-height: 2; padding-left: 20px; margin: 0 0 20px;">
              <li>Your specialist will review your credit profile within 24 hours</li>
              <li>We'll identify all disputable negative items on your report</li>
              <li>FCRA-compliant dispute letters will be generated and sent on your behalf</li>
              <li>You'll receive updates as bureaus respond to your disputes</li>
            </ol>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${SITE_URL}/client-portal/login" 
                 style="background: #059669; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
                Access Your Client Portal →
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              Questions? Reply to this email or reach out to your assigned specialist directly. We're here to help every step of the way.
            </p>
          </div>
          <div style="background: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">© 2025 Fix My Money · All rights reserved</p>
          </div>
        </div>
      `;
    } else {
      throw new Error(`Unknown email type: ${type}`);
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await response?.json();

    if (!response?.ok) {
      throw new Error(result.message || "Failed to send email via Resend");
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
