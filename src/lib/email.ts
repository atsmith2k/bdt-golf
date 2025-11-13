import Mailjet from "node-mailjet";

type MailjetClient = ReturnType<typeof Mailjet.apiConnect>;

type MailjetEnvConfig = {
  apiKey: string;
  apiSecret: string;
  senderEmail: string;
  senderName: string;
};

export type SendMailjetEmailOptions = {
  to: {
    email: string;
    name?: string;
  };
  subject: string;
  text: string;
  html: string;
};

export type SendOtpInviteEmailOptions = {
  email: string;
  displayName?: string;
  username: string;
  otpCode: string;
  expiresAtIso: string;
  baseUrl?: string;
  commissionerName?: string;
};

let cachedConfig: MailjetEnvConfig | null = null;
let cachedClient: MailjetClient | null = null;

function loadMailjetConfig(): MailjetEnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const apiKey = process.env.MAILJET_API_KEY?.trim();
  const apiSecret = process.env.MAILJET_API_SECRET?.trim();
  const senderEmail = process.env.MAILJET_SENDER_EMAIL?.trim();
  const senderName = process.env.MAILJET_SENDER_NAME?.trim();

  const missing = [];
  if (!apiKey) missing.push("MAILJET_API_KEY");
  if (!apiSecret) missing.push("MAILJET_API_SECRET");
  if (!senderEmail) missing.push("MAILJET_SENDER_EMAIL");
  if (!senderName) missing.push("MAILJET_SENDER_NAME");

  if (missing.length > 0) {
    throw new Error(
      `[mail] Missing Mailjet configuration: ${missing.join(
        ", ",
      )}. Ensure the required environment variables are set.`,
    );
  }

  cachedConfig = {
    apiKey,
    apiSecret,
    senderEmail,
    senderName,
  };

  return cachedConfig;
}

function getMailjetClient(): MailjetClient {
  if (cachedClient) {
    return cachedClient;
  }

  const { apiKey, apiSecret } = loadMailjetConfig();
  cachedClient = Mailjet.apiConnect(apiKey, apiSecret);
  return cachedClient;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (chr) => {
    switch (chr) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return chr;
    }
  });
}

function formatExpiry(expiresAtIso: string) {
  const expiryDate = new Date(expiresAtIso);
  if (Number.isNaN(expiryDate.getTime())) {
    return expiresAtIso;
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(expiryDate);
  } catch {
    return expiryDate.toISOString();
  }
}

function resolveBaseUrl(fallbackUrl?: string) {
  const envBaseUrl = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL;
  const candidate = envBaseUrl?.trim() || fallbackUrl || "https://bdt.golf";

  try {
    const parsed = new URL(candidate);
    return parsed.origin;
  } catch {
    return candidate.replace(/\/+$/, "");
  }
}

export async function sendMailjetEmail(options: SendMailjetEmailOptions) {
  const client = getMailjetClient();
  const { senderEmail, senderName } = loadMailjetConfig();

  await client.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: {
          Email: senderEmail,
          Name: senderName,
        },
        To: [
          {
            Email: options.to.email,
            Name: options.to.name ?? options.to.email,
          },
        ],
        Subject: options.subject,
        TextPart: options.text,
        HTMLPart: options.html,
      },
    ],
  });
}

export async function sendOtpInviteEmail(options: SendOtpInviteEmailOptions) {
  const recipientName = options.displayName?.trim() || options.username;
  const otpCode = options.otpCode.trim().toUpperCase();
  const username = options.username.trim();
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const activationUrl = `${baseUrl.replace(/\/+$/, "")}/otp`;
  const expiryText = formatExpiry(options.expiresAtIso);
  const commissionerLine = options.commissionerName
    ? `${options.commissionerName} just created an account for you on the BDT Golf League site.`
    : "A league commissioner just created an account for you on the BDT Golf League site.";

  const textLines = [
    `Hi ${recipientName},`,
    "",
    commissionerLine,
    "",
    "To finish setting up your account:",
    `1. Open ${activationUrl}`,
    `2. Enter your username: ${username}`,
    `3. Enter the one-time password: ${otpCode}`,
    "4. Choose a new password and submit the form.",
    "",
    `This one-time password expires ${expiryText}.`,
    "",
    "If this email was unexpected, please ignore it or contact your commissioner.",
    "",
    "- BDT Golf League",
  ];

  const textPart = textLines.join("\n");
  const escapedActivationUrl = escapeHtml(activationUrl);
  const escapedCommissionerLine = escapeHtml(commissionerLine);
  const escapedRecipient = escapeHtml(recipientName);
  const escapedUsername = escapeHtml(username);
  const escapedOtp = escapeHtml(otpCode);
  const escapedExpiry = escapeHtml(expiryText);

  const htmlPart = [
    '<div style="font-family: \'Segoe UI\', Tahoma, sans-serif; color: #0f172a; line-height: 1.5;">',
    `<p style="margin: 0 0 16px;">Hi ${escapedRecipient},</p>`,
    `<p style="margin: 0 0 16px;">${escapedCommissionerLine}</p>`,
    '<p style="margin: 0 0 12px;">To finish setting up your account:</p>',
    '<ol style="margin: 0 0 16px 20px; padding: 0; color: #0f172a;">',
    `<li style="margin-bottom: 8px;">Open <a href="${escapedActivationUrl}" style="color: #2563eb; text-decoration: none;">${escapedActivationUrl}</a></li>`,
    `<li style="margin-bottom: 8px;">Enter your username: <strong>${escapedUsername}</strong></li>`,
    `<li style="margin-bottom: 8px;">Enter the one-time password: <code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.2em;">${escapedOtp}</code></li>`,
    "<li>Choose a new password and submit the form.</li>",
    "</ol>",
    `<p style="margin: 0 0 16px;">This one-time password expires ${escapedExpiry}.</p>`,
    "<p style=\"margin: 0 0 16px;\">If you were not expecting this email, please ignore it or contact your commissioner.</p>",
    '<p style="margin: 24px 0 0;">&ndash; BDT Golf League</p>',
    "</div>",
  ].join("");

  await sendMailjetEmail({
    to: {
      email: options.email,
      name: recipientName,
    },
    subject: "Your BDT Golf League account setup code",
    text: textPart,
    html: htmlPart,
  });
}

