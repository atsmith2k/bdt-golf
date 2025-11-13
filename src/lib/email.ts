import Mailjet from "node-mailjet";
import { APP_NAME } from "@/lib/constants";

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

  const envEntries: Array<[keyof MailjetEnvConfig, string | undefined, string]> =
    [
      ["apiKey", process.env.MAILJET_API_KEY?.trim(), "MAILJET_API_KEY"],
      ["apiSecret", process.env.MAILJET_API_SECRET?.trim(), "MAILJET_API_SECRET"],
      [
        "senderEmail",
        process.env.MAILJET_SENDER_EMAIL?.trim(),
        "MAILJET_SENDER_EMAIL",
      ],
      [
        "senderName",
        process.env.MAILJET_SENDER_NAME?.trim(),
        "MAILJET_SENDER_NAME",
      ],
    ];

  const envConfig = envEntries.reduce<Partial<MailjetEnvConfig>>(
    (accumulator, [key, value]) => {
      if (value) {
        accumulator[key] = value;
      }
      return accumulator;
    },
    {},
  );

  const missing = envEntries
    .filter(([, value]) => !value)
    .map(([, , envVariable]) => envVariable);

  if (missing.length > 0) {
    throw new Error(
      `[mail] Missing Mailjet configuration: ${missing.join(
        ", ",
      )}. Ensure the required environment variables are set.`,
    );
  }

  cachedConfig = {
    apiKey: envConfig.apiKey!,
    apiSecret: envConfig.apiSecret!,
    senderEmail: envConfig.senderEmail!,
    senderName: envConfig.senderName!,
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
  const baseOrigin = baseUrl.replace(/\/+$/, "");
  const activationUrl = `${baseOrigin}/otp`;
  const logoUrl = `${baseOrigin}/bdt-transparent-logo.png`;
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
  const escapedLogoUrl = escapeHtml(logoUrl);
  const escapedAppName = escapeHtml(APP_NAME);

  const htmlPart = `
    <div style="background-color:#f2f7ff;padding:32px 0;font-family:'Segoe UI',Tahoma,sans-serif;color:#021e4c;line-height:1.6;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:transparent;">
        <tr>
          <td style="padding:0 24px 24px;text-align:center;">
            <img src="${escapedLogoUrl}" alt="BDT Tour crest" width="108" style="width:108px;height:auto;display:block;margin:0 auto 12px;" />
            <p style="margin:0;font-size:12px;letter-spacing:0.38em;text-transform:uppercase;color:#e32237;font-weight:700;">BDT Tour</p>
            <p style="margin:10px 0 0;font-size:14px;font-weight:600;color:#0c337a;">${escapedAppName}</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;border:1px solid rgba(12,51,122,0.18);border-radius:20px;padding:32px;text-align:left;">
            <p style="margin:0 0 16px;">Hi ${escapedRecipient},</p>
            <p style="margin:0 0 16px;">${escapedCommissionerLine}</p>
            <p style="margin:0 0 12px;">To finish setting up your account:</p>
            <ol style="margin:0 0 20px 20px;padding:0;color:#021e4c;">
              <li style="margin-bottom:10px;">Open <a href="${escapedActivationUrl}" style="color:#0c337a;font-weight:600;text-decoration:none;">${escapedActivationUrl}</a></li>
              <li style="margin-bottom:10px;">Enter your username: <strong>${escapedUsername}</strong></li>
              <li style="margin-bottom:10px;">Enter the one-time password shown below.</li>
              <li>Choose a new password and submit the form.</li>
            </ol>
            <div style="margin:0 0 20px;text-align:center;">
              <div style="display:inline-block;padding:14px 24px;border-radius:14px;background-color:rgba(12,51,122,0.08);border:1px solid rgba(12,51,122,0.18);font-family:'SFMono-Regular',Menlo,monospace;font-size:18px;letter-spacing:0.38em;color:#021e4c;font-weight:700;">
                ${escapedOtp}
              </div>
            </div>
            <p style="margin:0 0 16px;">This one-time password expires ${escapedExpiry}.</p>
            <p style="margin:0 0 24px;">If you were not expecting this email, please ignore it or let your commissioner know.</p>
            <a href="${escapedActivationUrl}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:linear-gradient(160deg,#022254 0%,#0c337a 70%);color:#ffffff;font-weight:600;text-decoration:none;">Launch Activation Portal</a>
            <p style="margin:24px 0 0;font-weight:600;color:#0c337a;">&ndash; ${escapedAppName}</p>
          </td>
        </tr>
      </table>
    </div>
  `.trim();

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
