"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Vector Projector <noreply@weheart.art>";

// =============================================================================
// EMAIL TEMPLATES
// These are the "runtime" templates used by Convex.
// Design/preview templates in /emails folder with React Email, then copy HTML here.
// Use {{variable}} syntax for substitution.
// =============================================================================

const TEMPLATES = {
  verification: {
    subject: "Verify your email",
    html: `
<!DOCTYPE html>
<html>
<head></head>
<body style="background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="margin:0 auto;padding:40px 20px;">
    <div style="background-color:#ffffff;border-radius:8px;padding:32px;text-align:center;">
      <h1 style="color:#18181b;font-size:24px;font-weight:600;margin:0 0 16px;">Verify your email</h1>
      <p style="color:#52525b;font-size:16px;margin:0 0 24px;">Enter this code to verify your email address:</p>
      <p style="background-color:#f4f4f5;border-radius:8px;color:#18181b;display:inline-block;font-size:32px;font-weight:700;letter-spacing:4px;margin:0 0 24px;padding:16px 32px;">{{code}}</p>
      <p style="color:#a1a1aa;font-size:14px;margin:0;">This code expires in 10 minutes.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  },
} as const;

type TemplateKey = keyof typeof TEMPLATES;

// =============================================================================
// ACTIONS
// =============================================================================

// Generic send - receives pre-rendered HTML
export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (_ctx, { to, subject, html }) => {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Failed to send email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, messageId: data?.id };
  },
});

// Send using a template - handles variable substitution
export const sendTemplateEmail = internalAction({
  args: {
    to: v.string(),
    template: v.string(),
    variables: v.record(v.string(), v.string()),
  },
  handler: async (_ctx, { to, template, variables }) => {
    const tmpl = TEMPLATES[template as TemplateKey];
    if (!tmpl) {
      throw new Error(`Unknown email template: ${template}`);
    }

    // Substitute variables
    let html = tmpl.html;
    let subject = tmpl.subject;
    for (const [key, value] of Object.entries(variables)) {
      html = html.replaceAll(`{{${key}}}`, value);
      subject = subject.replaceAll(`{{${key}}}`, value);
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Failed to send email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, messageId: data?.id };
  },
});
