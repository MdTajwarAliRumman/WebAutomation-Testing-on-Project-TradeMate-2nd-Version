/**
 * EmailHelper.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Uses Mailsac (https://mailsac.com) — a FREE public test email service.
 *
 * Environment variable needed in your .env:
 *   MAILSAC_API_KEY=<your free key from https://mailsac.com/api-keys>
 *
 * Free plan: 50 API calls/day — plenty for daily test runs.
 * ──────────────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config();

// .trim() strips accidental trailing spaces/newlines from the .env value.
// A trailing space causes every API request to return 401 Unauthorized.
const MAILSAC_API_KEY = (process.env.MAILSAC_API_KEY ?? '').trim();
const BASE_URL = 'https://mailsac.com/api';

if (!MAILSAC_API_KEY) {
    throw new Error(
        '❌ MAILSAC_API_KEY is not set or is empty in your .env file!\n' +
        '   Get a free key at https://mailsac.com/api-keys'
    );
}

// Polling configuration
const POLL_INTERVAL_MS = 5000;   // check every 5 seconds
const MAX_WAIT_MS = 120000; // wait up to 120 seconds total

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
        const body = await res.text();
        throw new Error(`Mailsac list error ${res.status}: ${body}`);
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

// ─── Diagnostic dump — called on timeout to show exactly what went wrong ──

async function dumpInboxDiagnostics(email: string): Promise<void> {
    console.log('\n══════════════ MAILSAC INBOX DIAGNOSTICS ══════════════');
    console.log(`📬 Inbox address : ${email}`);
    console.log(`🔑 API key used  : ${MAILSAC_API_KEY.slice(0, 8)}...${MAILSAC_API_KEY.slice(-4)}`);
    console.log(`🌐 View online   : https://mailsac.com/inbox/${encodeURIComponent(email)}`);
    try {
        const messages = await listMessages(email);
        if (messages.length === 0) {
            console.log('');
            console.log('📭 INBOX IS COMPLETELY EMPTY.');
            console.log('   The app has NOT sent any email to this address.');
            console.log('');
            console.log('   Most likely causes:');
            console.log('   1. The app email provider BLOCKS @mailsac.com as a disposable domain.');
            console.log('      → Ask your dev team to whitelist mailsac.com in the email service.');
            console.log('      → Or use a real Gmail/Outlook address + Gmail API for polling instead.');
            console.log('   2. The app backend is in a mode that SUPPRESSES all outbound email.');
            console.log('      → Check with your dev team whether the staging env sends real emails.');
            console.log('   3. The app SMTP / SendGrid / SES / Mailgun config is broken in this env.');
            console.log('      → Check the backend logs for email-sending errors after registration.');
            console.log('');
            console.log('   QUICKEST TEST: Register manually on the site with this same mailsac');
            console.log(`   address (${email}) and check if any email ever arrives.`);
            console.log('   If nothing arrives → the problem is 100% on the app side, not this code.');
        } else {
            console.log(`\n📬 INBOX HAS ${messages.length} MESSAGE(S) — but none matched the subject filter.`);
            console.log('   Subjects currently in the inbox:');
            messages.forEach((m, i) => {
                console.log(`   [${i + 1}] "${m.subject}"  (from: ${m.from?.[0]?.address ?? 'unknown'}, received: ${m.receivedAt})`);
            });
            console.log('\n   ► The subject filter regex did not match any of the above subjects.');
            console.log('   ► Update the subject filter in EmailHelper to match the actual subject.');
        }
    } catch (err) {
        console.log(`\n❌ Mailsac API call itself FAILED: ${err}`);
        console.log('   ► Double-check that MAILSAC_API_KEY in .env is correct with no spaces.');
    }
    console.log('═══════════════════════════════════════════════════════\n');
}

// ─── Generic poll helper ──────────────────────────────────────────────────

async function waitForEmail(
    email: string,
    subjectFilter: (subject: string) => boolean,
    label: string
): Promise<MailsacMessage> {
    const deadline = Date.now() + MAX_WAIT_MS;
    console.log(`⏳ Polling Mailsac for "${label}" at ${email}...`);

    // ── Pre-flight: verify the API key works before we waste 120s polling ──
    try {
        const preflight = await listMessages(email);
        console.log(`✅ Mailsac API key OK. Inbox currently has ${preflight.length} message(s).`);
        if (preflight.length > 0) {
            console.log('   Existing subjects:');
            preflight.forEach(m => console.log(`   • "${m.subject}"`));
        }
    } catch (err) {
        throw new Error(
            `❌ Mailsac API pre-flight failed — cannot read inbox for ${email}.\n` +
            `   Error: ${err}\n` +
            `   Fix: Check MAILSAC_API_KEY in your .env (no trailing spaces, correct key).`
        );
    }

    let pollCount = 0;
    while (Date.now() < deadline) {
        try {
            const messages = await listMessages(email);
            pollCount++;
            const elapsed = Math.round((Date.now() - (deadline - MAX_WAIT_MS)) / 1000);
            console.log(`   [+${elapsed}s] Inbox has ${messages.length} message(s). Looking for: "${label}"`);

            // On first poll that finds messages, print all subjects so you can see them
            if (messages.length > 0 && pollCount <= 2) {
                messages.forEach(m => console.log(`   • "${m.subject}"`));
            }

            const match = messages.find(m => subjectFilter(m.subject ?? ''));
            if (match) {
                console.log(`✅ Found — Subject: "${match.subject}"`);
                return match;
            }
        } catch (err) {
            console.warn(`⚠️  Mailsac API error (retrying in ${POLL_INTERVAL_MS / 1000}s): ${err}`);
        }

        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }

    // Timed out — run diagnostics to explain WHY before throwing
    await dumpInboxDiagnostics(email);

    throw new Error(
        `❌ Timed out after ${MAX_WAIT_MS / 1000}s waiting for "${label}" at ${email}.\n` +
        `   See DIAGNOSTICS printed above for the root cause.\n` +
        `   View inbox: ${EmailHelper.getInboxURL(email)}`
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

    // ── Scenario 1 registration emails ─────────────────────────────────────

    async fetchRegistrationEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(
            email,
            s => /welcome to our platform/i.test(s) && !/ - trademate/i.test(s),
            '"Welcome to Our Platform!" registration email'
        );
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 Registration email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }

    async fetchWelcomeLoginEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(
            email,
            s => /welcome to our platform - trademate/i.test(s),
            '"Welcome to Our Platform - Trademate!" post-login email'
        );
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 Post-login welcome email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }

    // ── OTP ────────────────────────────────────────────────────────────────

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

    async fetchWelcomeEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(email, s => /welcome/i.test(s), 'Welcome email');
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 Welcome email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }

    async getLatestWelcomeEmailBody(email: string): Promise<{ body: string }> {
        const msg = await findLatestMessage(email, s => /welcome/i.test(s));
        const body = await getMessageBodyText(email, msg._id);
        return { body };
    }

    // ── Job confirmation email ─────────────────────────────────────────────

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

    async getLatestJobEmailBody(email: string): Promise<{ body: string }> {
        const msg = await findLatestMessage(
            email,
            s => /job|posted|post|confirm|trademate/i.test(s)
        );
        const body = await getMessageBodyText(email, msg._id);
        return { body };
    }

    // ── Admin notification email (Scenario 8) ─────────────────────────────

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

    async getLatestMatchingJobEmailBody(email: string): Promise<{ body: string }> {
        const msg = await findLatestMessage(
            email,
            s => /matching|new job|job available|apply|visit trademate/i.test(s)
        );
        const body = await getMessageBodyText(email, msg._id);
        return { body };
    }

    // ── Registration Welcome email — Scenario 1 (post-OTP) ────────────────

    async fetchRegistrationWelcomeEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(
            email,
            s => /welcome to our platform/i.test(s) && !/trademate/i.test(s),
            '"Welcome to Our Platform!" registration email'
        );
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 Registration welcome email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }

    async getLatestRegistrationWelcomeEmailBody(email: string): Promise<{ body: string }> {
        const msg = await findLatestMessage(
            email,
            s => /welcome to our platform/i.test(s) && !/trademate/i.test(s)
        );
        const body = await getMessageBodyText(email, msg._id);
        return { body };
    }

    // ── Login Welcome email — Scenario 1 (post-login) ─────────────────────

    async fetchLoginWelcomeEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(
            email,
            s => /welcome/i.test(s) && /trademate/i.test(s),
            '"Welcome to Our Platform - Trademate!" login email'
        );
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 Login welcome email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }

    async getLatestLoginWelcomeEmailBody(email: string): Promise<{ body: string }> {
        const msg = await findLatestMessage(
            email,
            s => /welcome/i.test(s) && /trademate/i.test(s)
        );
        const body = await getMessageBodyText(email, msg._id);
        return { body };
    }

    // ── Scenario 8 — "Quote submitted successfully!" ──────────────────────

    async fetchQuoteSubmittedEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(
            email,
            s => /quote submitted/i.test(s),
            '"Quote submitted successfully!" email'
        );
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 Quote submitted email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }

    // ── Scenario 9 — "New Quote Submitted" notification ───────────────────

    async fetchNewQuoteEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(
            email,
            s => /quote submitted|new quote|job review/i.test(s),
            '"New Quote Submitted for Your Job Review please!" email'
        );
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 New Quote email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }

    // ── Scenario 10 — "You Accepted an Offer!" ────────────────────────────

    async fetchAcceptedOfferEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(
            email,
            s => /accepted|offer|hired/i.test(s),
            '"You Accepted an Offer!" email'
        );
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 Accepted offer email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }

    // ── Scenario 11 — "Your Offer Was Not Accepted" ───────────────────────

    async fetchOfferRejectedEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(
            email,
            s => /offer was not accepted|your offer was not/i.test(s),
            '"Your Offer Was Not Accepted" email'
        );
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 Offer rejected email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }

    // ── Scenario 12 — "Your Offer Has Been Accepted!" ─────────────────────

    async fetchOfferAcceptedEmail(email: string): Promise<{ subject: string; body: string; messageId: string }> {
        const msg = await waitForEmail(
            email,
            s => /offer has been accepted|your offer has been/i.test(s),
            '"Your Offer Has Been Accepted!" email'
        );
        const body = await getMessageBodyText(email, msg._id);
        console.log(`📧 Offer accepted email snippet:\n${body.slice(0, 300)}`);
        return { subject: msg.subject, body, messageId: msg._id };
    }
}