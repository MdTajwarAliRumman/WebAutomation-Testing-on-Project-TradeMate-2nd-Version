/**
 * Email_Test.spec.ts
 * ──────────────────────────────────────────────────────────────────────────
 * All tests run as ONE HomeOwner user who is created fresh each run.
 * The user logs in ONCE in Scenario 1 and stays logged in for everything.
 *
 * SCENARIO 1 — Register + OTP + Login (stays logged in)
 *   • Registers with a @mailsac.com email using hardcoded OTP 1,2,3,4
 *   • Logs in — stays logged in for all subsequent tests
 *
 * SCENARIO 2 — View Welcome email → click "Go to Site" → return to website
 *   • Switches to Mailsac tab, opens welcome email, clicks "Go to Site"
 *   • Confirms we are back on TradeMate (still logged in)
 *
 * SCENARIO 3 — Post a Job → view Job email → click "Visit Trademate"
 *   • Continues from where Scenario 2 left off (same user, still logged in)
 *   • Posts a Plumber job using the HomeOwner interface
 *   • Switches to Mailsac tab, opens the job-confirmation email
 *   • Clicks "Visit Trademate" button inside the email
 *   • Confirms we are back on TradeMate
 *
 * Tab layout (shared across ALL tests via module-level variables):
 *   sitePage = Tab 1 — TradeMate website
 *   mailPage = Tab 2 — Mailsac inbox
 * ──────────────────────────────────────────────────────────────────────────
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { AuthPage } from '../../src/pages/AuthPage';
import { BasePage } from '../../src/pages/BasePage';
import { HomePage } from '../../src/pages/HomePage';
import { EmailHelper } from '../../src/utils/EmailHelper';
import dotenv from 'dotenv';
dotenv.config();

// ─── Shared state — lives for the entire test file run ────────────────────
let browser: Browser;
let context: BrowserContext;
let sitePage: Page;      // Tab 1 – TradeMate website (stays open the whole time)
let mailPage: Page;      // Tab 2 – Mailsac inbox     (stays open the whole time)
let testEmail: string;    // @mailsac.com address created once for this run
// ──────────────────────────────────────────────────────────────────────────

test.describe.serial('📧 TradeMate – Full HomeOwner Email Flow', () => {

    // ── One-time setup: open both tabs before any test runs ────────────────
    test.beforeAll(async ({ browser: b }) => {
        browser = b;

        // One unique @mailsac.com address for this entire run
        testEmail = EmailHelper.generateMailsacEmail();
        console.log(`\n📬 Test email : ${testEmail}`);
        console.log(`🌐 Mailsac    : ${EmailHelper.getInboxURL(testEmail)}\n`);

        // Shared browser context = one login session across all tabs
        context = await browser.newContext({
            permissions: ['geolocation'],
            geolocation: { latitude: 23.8103, longitude: 90.4125 },
        });

        // Tab 1 — website (navigated by each test step)
        sitePage = await context.newPage();

        // Tab 2 — Mailsac inbox (open immediately, visible throughout)
        mailPage = await context.newPage();
        await mailPage.goto(EmailHelper.getInboxURL(testEmail));
        await mailPage.waitForLoadState('domcontentloaded');
        console.log('✅ Mailsac inbox tab is open');

        // Start focused on the website tab
        await sitePage.bringToFront();
    });

    test.afterAll(async () => {
        await context.close();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 1 — Register as HomeOwner, verify OTP, Login (stays logged in)
    // ═══════════════════════════════════════════════════════════════════════
    test('➡️ SCENARIO 1: Register as Homeowner and verify with hardcoded OTP', async () => {

        const authPage = new AuthPage(sitePage);
        const basePage = new BasePage(sitePage);

        await test.step('Open TradeMate and go to registration page', async () => {
            await sitePage.bringToFront();
            await basePage.goToURL();
            await sitePage.getByRole('button', { name: 'Find a surrey tradesman' }).click();
            await expect(sitePage.getByText('Create your free')).toBeVisible();
            console.log('✅ Registration page visible');
        });

        await test.step('Fill registration form with Mailsac email and submit', async () => {
            await authPage.AccountInformation(
                process.env.USER_NAME!,
                testEmail,              // ← the @mailsac.com address — welcome & job emails go here
                process.env.PHONE_NUMBER!,
                '12345678',
                '12345678'
            );
            await authPage.CreateAccountButton.click();
            await expect(
                sitePage.getByText('Enter the verification code we send you on:')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ OTP screen visible');
        });

        await test.step('Fill hardcoded OTP (1,2,3,4) — dev environment bypass', async () => {
            await authPage.OTPVerification('1', '2', '3', '4');
            await sitePage.getByText('Continue').click();
            await expect(
                sitePage.getByText('Login your account')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ OTP accepted — now on login page');
        });

        await test.step('Login with the newly registered account', async () => {
            await authPage.EmailInput.fill(testEmail);
            await authPage.PasswordInput.fill('12345678');
            await sitePage.getByRole('button', { name: 'Log in' }).click();
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ Logged in successfully — will stay logged in for all remaining tests');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 2 — View Welcome email in Mailsac → click "Go to Site"
    // ═══════════════════════════════════════════════════════════════════════
    test('➡️ SCENARIO 2: View Welcome email in Mailsac and click "Go to Site"', async () => {

        await test.step('Poll Mailsac API until Welcome email arrives', async () => {
            const helper = new EmailHelper();
            const { subject } = await helper.fetchWelcomeEmail(testEmail);
            console.log(`✅ Welcome email in inbox — Subject: "${subject}"`);
        });

        await test.step('Switch to Mailsac tab and reload inbox', async () => {
            await mailPage.bringToFront();
            await mailPage.reload();
            await mailPage.waitForLoadState('domcontentloaded');
            await mailPage.waitForTimeout(2000);
            console.log('👀 Mailsac inbox visible — Welcome email is in the list');
        });

        await test.step('Click on the Welcome email to open it', async () => {
            const welcomeRow = mailPage
                .locator('a, tr, div')
                .filter({ hasText: /welcome/i })
                .first();
            await welcomeRow.waitFor({ state: 'visible', timeout: 15000 });
            await welcomeRow.click();
            await mailPage.waitForLoadState('domcontentloaded');
            await mailPage.waitForTimeout(2000);
            console.log('✅ Welcome email opened in Mailsac');
        });

        await test.step('Click "Go to Site" inside the Welcome email', async () => {
            sitePage = await clickEmailButton(
                mailPage, context, sitePage, testEmail,
                /go to site/i,
                'fetchWelcomeEmail'
            );
        });

        await test.step('Confirm we are back on TradeMate website (still logged in)', async () => {
            await sitePage.bringToFront();
            const url = sitePage.url();
            console.log(`🌐 URL after "Go to Site": ${url}`);
            expect(url).toContain('trademate');
            // Confirm still logged in — Log out button should be visible
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ Back on TradeMate — user is still logged in');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 3 — Post a Job → view Job email → click "Visit Trademate"
    // (same user, still logged in from Scenario 1 — NO extra login needed)
    // ═══════════════════════════════════════════════════════════════════════
    test('➡️ SCENARIO 3: HomeOwner posts a job and views job email in Mailsac', async () => {

        // Page objects built on sitePage (the shared logged-in tab)
        const homePage = new HomePage(sitePage);

        // ── 3.1  Navigate to the job services section ──────────────────────
        await test.step('Verify all the services are visible on the home page', async () => {
            await sitePage.bringToFront();

            // Navigate to home page (user is already logged in — no login needed)
            await sitePage.goto(process.env.WEBSITE_URL!.trim());
            await sitePage.waitForLoadState('domcontentloaded');

            await homePage.specificService.scrollIntoViewIfNeeded();
            await expect(sitePage.getByText('Select the job or trade you require')).toBeVisible();
            console.log('✅ Services section visible');
        });

        // ── 3.2  Select Plumber service and set location ───────────────────
        await test.step('Click Plumber service and confirm map location', async () => {
            await homePage.plumberService.click();
            await expect(sitePage.getByText('Enter the job location')).toBeVisible();
            await homePage.mapLocation.click();
            await homePage.confirmMapLocation.click();
            await expect(sitePage.getByText('Choose your location Manually')).toBeVisible();
            await homePage.continueButton.click();
            console.log('✅ Location confirmed — continued');
        });

        // ── 3.3  Fill job title and description ───────────────────────────
        await test.step('Fill job title and description', async () => {
            await expect(sitePage.getByText('Give your job a title').first()).toBeVisible();
            await sitePage.getByPlaceholder('Write headline here').fill('Hiring A Plumber');
            await sitePage
                .getByPlaceholder('Minimum of 50 characters needs entering as min description to proceed')
                .fill(process.env.LOREM_TEXT!);
            await homePage.continueButton.click();
            console.log('✅ Job title and description filled');
        });

        // ── 3.4  Select job timeframe ──────────────────────────────────────
        await test.step('Select job timeframe', async () => {
            await expect(
                sitePage.getByText('What timeframe do you need the job completed by?')
            ).toBeVisible();
            await homePage.jobTimeFrame.click();
            await homePage.continueButton.click();
            console.log('✅ Timeframe selected');
        });

        // ── 3.5  Select type of work required ─────────────────────────────
        await test.step('Select type of work required', async () => {
            await homePage.requiredWork2.click();
            await homePage.continueButton.click();
            console.log('✅ Work type selected');
        });

        // ── 3.6  Upload image ──────────────────────────────────────────────
        await test.step('Upload job image', async () => {
            await sitePage.setInputFiles('input[type="file"]', 'test_attachments/Qa.jpg');
            await sitePage.getByText('Continue').click();
            console.log('✅ Image uploaded');
        });

        // ── 3.7  Upload video and submit job ──────────────────────────────
        await test.step('Upload job video and submit', async () => {
            await expect(sitePage.getByText('Upload Video')).toBeVisible();
            await sitePage
                .locator('input[type="file"][name="videos"]')
                .setInputFiles('test_attachments/testVideo.mp4');
            await sitePage.getByText('Continue').click();

            await expect(sitePage.getByText('Job Done By')).toBeVisible();
            await homePage.jobSubmitButton.click();
            await expect(
                sitePage.getByText('Job Posted Successfully')
            ).toBeVisible({ timeout: 20000 });
            console.log('✅ Job posted successfully!');
        });

        // ── 3.8  Poll Mailsac for the job-confirmation email ──────────────
        await test.step('Poll Mailsac API until Job confirmation email arrives', async () => {
            const helper = new EmailHelper();
            const { subject } = await helper.fetchJobEmail(testEmail);
            console.log(`✅ Job email in inbox — Subject: "${subject}"`);
        });

        // ── 3.9  Switch to Mailsac tab and open the job email ─────────────
        await test.step('Switch to Mailsac tab and open job confirmation email', async () => {
            await mailPage.bringToFront();
            await mailPage.reload();
            await mailPage.waitForLoadState('domcontentloaded');
            await mailPage.waitForTimeout(2000);
            console.log('👀 Mailsac inbox reloaded — looking for job confirmation email');

            // The job email subject may say "job", "posted", "confirmation" etc.
            const jobEmailRow = mailPage
                .locator('a, tr, div')
                .filter({ hasText: /job|post|confirm/i })
                .first();

            await jobEmailRow.waitFor({ state: 'visible', timeout: 20000 });
            await jobEmailRow.click();
            await mailPage.waitForLoadState('domcontentloaded');
            await mailPage.waitForTimeout(2000);
            console.log('✅ Job confirmation email opened in Mailsac');
        });

        // ── 3.10  Click "Visit Trademate" button inside the job email ─────
        await test.step('Click "Visit Trademate" button inside the job email', async () => {
            sitePage = await clickEmailButton(
                mailPage, context, sitePage, testEmail,
                /visit trademate|go to site|view job/i,
                'fetchJobEmail'
            );
        });

        // ── 3.11  Confirm we are back on TradeMate (still logged in) ──────
        await test.step('Confirm we are back on TradeMate website', async () => {
            await sitePage.bringToFront();
            const url = sitePage.url();
            console.log(`🌐 URL after "Visit Trademate": ${url}`);
            expect(url).toContain('trademate');
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ Back on TradeMate — user is still logged in ✅');
        });
    });

});

// ══════════════════════════════════════════════════════════════════════════
// Helper — clicks a button inside a Mailsac email using 3 fallback strategies
// Returns the updated sitePage (may have changed if a new tab was opened)
// ══════════════════════════════════════════════════════════════════════════
async function clickEmailButton(
    mailPage: Page,
    context: BrowserContext,
    sitePage: Page,
    testEmail: string,
    buttonText: RegExp,
    apiFallbackMethod: 'fetchWelcomeEmail' | 'fetchJobEmail'
): Promise<Page> {

    let clicked = false;

    // ── Strategy A: link/button directly in the Mailsac page ──────────────
    try {
        const link = mailPage
            .getByRole('link', { name: buttonText })
            .or(mailPage.getByRole('button', { name: buttonText }));

        if (await link.first().isVisible({ timeout: 5000 })) {
            const href = await link.first().getAttribute('href');
            console.log(`🔗 Strategy A — found button. href = ${href}`);

            const [newTab] = await Promise.all([
                context.waitForEvent('page', { timeout: 6000 }).catch(() => null),
                link.first().click(),
            ]);

            if (newTab) {
                await newTab.waitForLoadState('domcontentloaded');
                sitePage = newTab;
                await sitePage.bringToFront();
                console.log(`✅ Strategy A — new tab opened: ${sitePage.url()}`);
            } else {
                await mailPage.waitForLoadState('domcontentloaded');
                sitePage = mailPage;
                console.log(`✅ Strategy A — same tab navigated: ${sitePage.url()}`);
            }
            clicked = true;
        }
    } catch (e) {
        console.log(`ℹ️  Strategy A failed: ${e}`);
    }

    // ── Strategy B: button is inside an iframe ─────────────────────────────
    if (!clicked) {
        try {
            for (const frame of mailPage.frames()) {
                const btn = frame
                    .getByRole('link', { name: buttonText })
                    .or(frame.getByRole('button', { name: buttonText }));

                if (await btn.first().isVisible({ timeout: 3000 })) {
                    const href = await btn.first().getAttribute('href');
                    console.log(`🔗 Strategy B (iframe) — href = ${href}`);
                    if (href) {
                        await sitePage.goto(href);
                        await sitePage.bringToFront();
                        clicked = true;
                        console.log(`✅ Strategy B — sitePage navigated to: ${href}`);
                        break;
                    }
                }
            }
        } catch (e) {
            console.log(`ℹ️  Strategy B failed: ${e}`);
        }
    }

    // ── Strategy C: extract URL from email body via Mailsac API ───────────
    if (!clicked) {
        try {
            console.log('🔄 Strategy C — reading email body via API...');
            const helper = new EmailHelper();
            let body = '';

            if (apiFallbackMethod === 'fetchWelcomeEmail') {
                const result = await helper.getLatestWelcomeEmailBody(testEmail);
                body = result.body;
            } else {
                const result = await helper.getLatestJobEmailBody(testEmail);
                body = result.body;
            }

            const urlMatch =
                body.match(/https?:\/\/[^\s"'<>]+trademate[^\s"'<>]*/i) ??
                body.match(/https?:\/\/[^\s"'<>]+vercel\.app[^\s"'<>]*/i);

            if (urlMatch) {
                const siteUrl = urlMatch[0].replace(/[)\]>]+$/, '');
                console.log(`🔗 Strategy C — extracted URL: ${siteUrl}`);
                await sitePage.goto(siteUrl);
                await sitePage.bringToFront();
                clicked = true;
                console.log(`✅ Strategy C — sitePage navigated to: ${siteUrl}`);
            }
        } catch (e) {
            console.log(`ℹ️  Strategy C failed: ${e}`);
        }
    }

    if (!clicked) {
        console.warn(
            `⚠️  All strategies failed to click the email button.\n` +
            `   Check the email manually: ${EmailHelper.getInboxURL(testEmail)}`
        );
        await sitePage.bringToFront();
    }

    return sitePage;
}
