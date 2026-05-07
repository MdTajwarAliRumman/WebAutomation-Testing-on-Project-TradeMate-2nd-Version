/**
 * EmailHelper.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Uses Mailsac (https://mailsac.com) — a FREE public test email service.
 * Any email ending in @mailsac.com is a valid inbox — no signup required
 * to receive, but an API key is needed to read via the REST API.
 *
 * Environment variable needed in your .env:
 *   MAILSAC_API_KEY=<your free key from https://mailsac.com/api-keys>
 *
 * Free plan: 50 API calls/day — plenty for daily test runs.
 *
 * Methods available:
 *   EmailHelper.generateMailsacEmail()   — generate a unique @mailsac.com address
 *   EmailHelper.getInboxURL(email)       — get the visual Mailsac inbox URL
 *   helper.fetchOTP(email)               — wait for & extract OTP (kept for future)
 *   helper.fetchWelcomeEmail(email)      — wait for & return the Welcome email
 *   helper.getLatestWelcomeEmailBody()   — get Welcome email body (for URL extraction)
 *   helper.fetchJobEmail(email)              — wait for & return the Job email
 *   helper.getLatestJobEmailBody()           — get Job email body (for URL extraction)
 *   helper.fetchAdminNotificationEmail()     — wait for admin notify / approve email (S8)
 *   helper.fetchMatchingJobEmail()           — wait for "New Matching Job" email (S8)
 *   helper.getLatestMatchingJobEmailBody()   — get matching job email body (URL fallback)
 * ──────────────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config();

const MAILSAC_API_KEY = process.env.MAILSAC_API_KEY ?? '';
const BASE_URL = 'https://mailsac.com/api';

// Polling configuration
const POLL_INTERVAL_MS = 4000;   // check every 4 seconds
const MAX_WAIT_MS = 90000;  // wait up to 90 seconds total

// ─── Internal types ───────────────────────────────────────────────────────

interface MailsacMessage {
    _id: string;
    subject: string;
    from: { name: string; address: string }[];
    receivedAt: string;
}

// ─── Low-level API helpers ────────────────────────────────────────────────

async function listMessages(email: string): Promise<MailsacMessage[]> {
    const res = await fetch(
        `${BASE_URL}/addresses/${encodeURIComponent(email)}/messages`,
        { headers: { 'Mailsac-Key': MAILSAC_API_KEY } }
    );
    if (!res.ok) {
        throw new Error(`Mailsac list error: ${res.status} — ${await res.text()}`);
    }
    return res.json() as Promise<MailsacMessage[]>;
}

async function getMessageBodyText(email: string, messageId: string): Promise<string> {
    const res = await fetch(
        `${BASE_URL}/text/${encodeURIComponent(email)}/${messageId}`,
        { headers: { 'Mailsac-Key': MAILSAC_API_KEY } }
    );
    if (!res.ok) {
        throw new Error(`Mailsac body error: ${res.status} — ${await res.text()}`);
    }
    return res.text();
}

async function deleteMessage(email: string, messageId: string): Promise<void> {
    await fetch(
        `${BASE_URL}/addresses/${encodeURIComponent(email)}/messages/${messageId}`,
        { method: 'DELETE', headers: { 'Mailsac-Key': MAILSAC_API_KEY } }
    );
}

// ─── Generic poll helper ──────────────────────────────────────────────────

async function waitForEmail(
    email: string,
    subjectFilter: (subject: string) => boolean,
    label: string
): Promise<MailsacMessage> {
    const deadline = Date.now() + MAX_WAIT_MS;
    console.log(`⏳ Polling Mailsac for "${label}" at ${email}...`);

    while (Date.now() < deadline) {
        const messages = await listMessages(email);
        const match = messages.find(m => subjectFilter(m.subject ?? ''));
        if (match) {
            console.log(`✅ Found — Subject: "${match.subject}"`);
            return match;
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }

    throw new Error(
        `❌ Timed out after ${MAX_WAIT_MS / 1000}s waiting for "${label}" at ${email}.\n` +
        `   Check MAILSAC_API_KEY in .env and view inbox: ${EmailHelper.getInboxURL(email)}`
    );
}

// ─── Helper to find the most recent matching message (without deleting) ───

async function findLatestMessage(
    email: string,
    subjectFilter: (subject: string) => boolean
): Promise<MailsacMessage> {
    const messages = await listMessages(email);
    const match = messages.find(m => subjectFilter(m.subject ?? ''));
    if (!match) throw new Error(`No matching email found for ${email}`);
    return match;
}

// ─── Public class ─────────────────────────────────────────────────────────

export class EmailHelper {

    // ── Static helpers ─────────────────────────────────────────────────────

    /**
     * Generates a unique @mailsac.com address for a test run.
     * Call once in beforeAll and reuse the same address across all tests.
     */
    static generateMailsacEmail(): string {
        const tag = `trademate_${Date.now().toString(36)}`;
        return `${tag}@mailsac.com`;
    }

    /**
     * Returns the Mailsac web inbox URL — open this in Tab 2 so the tester
     * can visually see all incoming emails.
     */
    static getInboxURL(email: string): string {
        return `https://mailsac.com/inbox/${encodeURIComponent(email)}`;
    }

    // ── OTP (kept for future — dev bypass used instead currently) ──────────

    /**
     * Polls until the OTP/verification email arrives and extracts the code.
     * Currently not needed because the dev environment accepts 1-2-3-4.
     */
    async fetchOTP(email: string): Promise<{ digits: string[]; raw: string }> {
        const msg = await waitForEmail(email, s => /otp|verif|code/i.test(s), 'OTP email');
        const body = await getMessageBodyText(email, msg._id);

        const match = body.match(/\b(\d{4,6})\b/);
        if (!match) throw new Error(`No 4-6 digit OTP found in email body:\n${body.slice(0, 400)}`);

        const raw = match[1];
        console.log(`🔑 OTP: ${raw}`);
        await deleteMessage(email, msg._id);
        return { digits: raw.split(''), raw };
    }

    // ── Welcome email ──────────────────────────────────────────────────────

    /**
     * Polls Mailsac until the Welcome email arrives.
     * Used in Scenario 2 to confirm the email is in the inbox before
     * switching tabs to view it visually.
     */
    async fetchWelcomeEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(email, s => /welcome/i.test(s), 'Welcome email');
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 Welcome email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }

    /**
     * Returns the body of the most recent Welcome email without deleting it.
     * Used by Strategy C (URL extraction fallback) in the test.
     */
    async getLatestWelcomeEmailBody(email: string): Promise<{ body: string }> {
        const msg = await findLatestMessage(email, s => /welcome/i.test(s));
        const body = await getMessageBodyText(email, msg._id);
        return { body };
    }

    // ── Job confirmation email ─────────────────────────────────────────────

    /**
     * Polls Mailsac until the Job confirmation email arrives.
     * The subject may contain words like "job", "posted", "confirmation",
     * "trademate" etc. — the filter covers all common patterns.
     * Used in Scenario 3 step 3.8.
     */
    async fetchJobEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(
            email,
            s => /job|posted|post|confirm|trademate/i.test(s),
            'Job confirmation email'
        );
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 Job email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }

    /**
     * Returns the body of the most recent Job email without deleting it.
     * Used by Strategy C (URL extraction fallback) in the test.
     */
    async getLatestJobEmailBody(email: string): Promise<{ body: string }> {
        const msg = await findLatestMessage(
            email,
            s => /job|posted|post|confirm|trademate/i.test(s)
        );
        const body = await getMessageBodyText(email, msg._id);
        return { body };
    }

    // ── Admin notification email (Scenario 8) ─────────────────────────────

    /**
     * Polls Mailsac until the Admin notification / "Approve account" email arrives.
     * This email is sent to the Tradesman after admin reviews their registration.
     * Subject typically contains: "admin", "approve", "verify", "registered",
     * "compliance", or "review".
     */
    async fetchAdminNotificationEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(
            email,
            s => /admin|approve|verify|verified|registered|compliance|review|account/i.test(s),
            'Admin notification / Approve account email'
        );
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 Admin notification email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }

    // ── Matching Job email (Scenario 8) ───────────────────────────────────

    /**
     * Polls Mailsac until the "New Matching Job Available" email arrives.
     * This email is sent to Tradesman when a HomeOwner posts a job matching
     * the Tradesman's trade category.
     * Subject typically contains: "job", "matching", "available", "apply".
     */
    async fetchMatchingJobEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(
            email,
            s => /matching|new job|job available|apply|visit trademate/i.test(s),
            'New Matching Job email'
        );
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 Matching job email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }

    /**
     * Returns the body of the most recent Matching Job email without deleting it.
     * Used by Strategy C (URL extraction fallback) when clicking "Visit Trademate to Apply".
     */
    async getLatestMatchingJobEmailBody(email: string): Promise<{ body: string }> {
        const msg = await findLatestMessage(
            email,
            s => /matching|new job|job available|apply|visit trademate/i.test(s)
        );
        const body = await getMessageBodyText(email, msg._id);
        return { body };
    }
}
