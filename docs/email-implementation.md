Here’s your PDF fully converted into clean **Markdown format** so you can integrate it directly into your documentation system or repository:

---

# Mailjet Integration for the BDT Golf League Application

## Overview

Mailjet is an email-sending service that offers a generous free tier and competitive pricing for higher volumes of email.
As of 2024, Mailjet allows you to send around **6,000 emails per month** on the free tier, and its first paid plan starts at about **$17 per month for 15,000 emails**.
These allowances make Mailjet a cost-effective option for a private golf league where the email volume is moderate.

This document describes how to integrate Mailjet into the **Next.js / React** application for the **BDT golf group**.

---

## Current Implementation Summary

- The application uses the official `node-mailjet` SDK via `src/lib/email.ts`, which provides a reusable `sendMailjetEmail` helper and a `sendOtpInviteEmail` template that formats both plain-text and HTML content with account setup instructions.
- OTP invite creation and resend flows (`src/app/api/admin/invites/route.ts` and `src/app/api/admin/invites/[id]/resend/route.ts`) now call `sendOtpInviteEmail` immediately after the one-time code is persisted. Delivery failures are surfaced back to the admin client.
- Environment variables (`MAILJET_API_KEY`, `MAILJET_API_SECRET`, `MAILJET_SENDER_EMAIL`, `MAILJET_SENDER_NAME`, and `APP_BASE_URL`) drive configuration; placeholders are documented in `.env.local.example`. `APP_BASE_URL` can be set to force the activation link domain when running locally.
- The activation email directs members to `/otp`, reminds them of their username and code, and highlights the expiry timestamp so that new players can complete onboarding without commissioner assistance.

---

## Prerequisites

* A verified **Mailjet account**
  (You should already have configured **SPF** and **DKIM** records for `bdt.golf` and verified the domain in the Mailjet dashboard.)
* API credentials from Mailjet: **API Key** and **API Secret**
* A **Next.js project** (with React) configured for **Vercel** deployment

---

## Selecting an Integration Method

Mailjet supports sending email via:

* **SMTP**
* **REST API**

For a Next.js application running on **serverless functions (API routes)**, the recommended method is **Mailjet’s REST API** using the `@mailjet/mailjet-client` package.
This avoids embedding SMTP credentials and works better in serverless environments.

---

## Option 1: Integrate Using the Mailjet REST API

### 1. Install the Mailjet client

```bash
npm install @mailjet/mailjet-client
```

### 2. Configure Environment Variables

Add to your `.env.local` file (ignored by git):

```bash
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_API_SECRET=your_mailjet_api_secret
MAILJET_SENDER_EMAIL=no-reply@bdt.golf
MAILJET_SENDER_NAME=BDT League
```

Set these same variables in **Vercel’s Environment Settings** for production.

---

### 3. Create a Serverless API Route

Create a file: `pages/api/send-email.ts` (or `.js` if not using TypeScript)

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import Mailjet from '@mailjet/mailjet-client';

// Initialize Mailjet client
const mailjet = new Mailjet({
  apiKey: process.env.MAILJET_API_KEY || '',
  apiSecret: process.env.MAILJET_API_SECRET || '',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { toEmail, toName, subject, textPart, htmlPart } = req.body;
  if (!toEmail || !subject) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const data = {
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_SENDER_EMAIL,
            Name: process.env.MAILJET_SENDER_NAME,
          },
          To: [{ Email: toEmail, Name: toName || toEmail }],
          Subject: subject,
          TextPart: textPart,
          HTMLPart: htmlPart,
        },
      ],
    };

    const result = await mailjet.post('send', { version: 'v3.1' }).request(data);
    return res.status(200).json({ message: 'Email sent', result: result.body });
  } catch (error) {
    console.error('Mailjet error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
```

---

### 4. Call the API from Client Components

```javascript
async function sendInvite(toEmail, toName) {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      toEmail,
      toName,
      subject: 'Welcome to the BDT Golf League',
      textPart: `Hello ${toName},\n\nThanks for joining the league.`,
      htmlPart: `<p>Hello ${toName},</p><p>Thanks for joining the league.</p>`,
    }),
  });

  if (!response.ok) console.error('Failed to send invite');
}
```

> ✅ Protect this route so only authenticated or admin users can call it.

---

## Option 2: SMTP via Nodemailer

### 1. Install packages

```bash
npm install nodemailer nodemailer-mailjet-transport
```

### 2. Create a Mail Transporter

File: `lib/mail.ts`

```typescript
import nodemailer from 'nodemailer';
import mailjetTransport from 'nodemailer-mailjet-transport';

const transporter = nodemailer.createTransport(
  mailjetTransport({
    auth: {
      apiKey: process.env.MAILJET_API_KEY,
      apiSecret: process.env.MAILJET_API_SECRET,
    },
  })
);

export async function sendEmail(toEmail, toName, subject, text, html) {
  await transporter.sendMail({
    from: `"BDT League" <${process.env.MAILJET_SENDER_EMAIL}>`,
    to: `${toName} <${toEmail}>`,
    subject,
    text,
    html,
  });
}
```

Then call this utility in your API route.

---

## Testing & Deployment

### Environment Setup

* Set your Mailjet keys in **Vercel Environment Variables**
* Use same variable names as `.env.local`

### Verification

* Deploy your app and send a **test email**
* Check headers to ensure **SPF** and **DKIM** pass
* Use Mailjet’s dashboard to monitor usage, bounces, and deliverability

---

## Security Considerations

* **Keep API keys on the server** only — never expose to client code.
* **Validate inputs** to prevent spam/injection.
* **Rate-limit** your API route to prevent abuse.

---

## Future Enhancements

* **Templates** — Use Mailjet’s templating system for dynamic content.
* **Logging** — Save sent email logs in Supabase for auditing.
* **Queueing** — For larger volumes, use a serverless queue for background email processing.

---

Mailjet’s free tier and easy integration make it a practical choice for the **BDT Golf League App**, enabling Next.js to send transactional emails like invitations, match announcements, and account notifications from your `bdt.golf` domain.

---
