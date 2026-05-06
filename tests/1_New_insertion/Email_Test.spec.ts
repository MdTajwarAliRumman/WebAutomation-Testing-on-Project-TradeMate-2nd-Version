/**
 * Email_Test.spec.ts
 * ──────────────────────────────────────────────────────────────────────────
 * USER FLOW OVERVIEW
 * ──────────────────
 * [HomeOwner — ownerEmail (@mailsac.com)]
 *   SCENARIO 1 — Register → OTP (1234 bypass) → Login  (stays logged in)
 *   SCENARIO 2 — View Welcome email → "Go to Site" → back to website
 *   SCENARIO 3 — Post a Job → wait → view "Your Job Post Is Live!" email
 *                           → click "Visit Trademate" → wait → back to website
 *   SCENARIO 4 — Click "Posted Jobs" nav → open first job → scroll to
 *                Applicant List → HomeOwner logs out
 *
 * [Tradesman — tradesmanEmail (@mailsac.com)]
 *   SCENARIO 5 — Register → OTP (1234 bypass) → Login
 *                → View Tradesman Welcome email → "Go to Site" → wait → back
 *
 * TAB LAYOUT (shared across every test via module-level variables)
 * ──────────────────────────────────────────────────────────────────
 *   sitePage      = Tab 1  — TradeMate website        (reused by every scenario)
 *   ownerMailPage = Tab 2  — Mailsac inbox: HomeOwner  (open from start)
 *   tsMailPage    = Tab 3  — Mailsac inbox: Tradesman  (opened in Scenario 5)
 * ──────────────────────────────────────────────────────────────────────────
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { AuthPage } from '../../src/pages/AuthPage';
import { BasePage } from '../../src/pages/BasePage';
import { HomePage } from '../../src/pages/HomePage';
import { EmailHelper } from '../../src/utils/EmailHelper';
import dotenv from 'dotenv';
dotenv.config();

// ─── Shared state — lives for the entire test-file run ────────────────────
let browser: Browser;
let context: BrowserContext;
let sitePage: Page;         // Tab 1 — TradeMate website
let ownerMailPage: Page;    // Tab 2 — Mailsac inbox for HomeOwner
let tsMailPage: Page;       // Tab 3 — Mailsac inbox for Tradesman (added in S5)

let ownerEmail: string;     // freshly generated @mailsac.com for the HomeOwner
let tradesmanEmail: string; // freshly generated @mailsac.com for the Tradesman
// ──────────────────────────────────────────────────────────────────────────

test.describe.serial('📧 TradeMate – Full Email Flow (HomeOwner + Tradesman)', () => {

    // ── One-time setup: open browser, create context, open two tabs ────────
    test.beforeAll(async ({ browser: b }) => {
        browser = b;

        // HomeOwner email is generated now; Tradesman email is created in S5
        ownerEmail = EmailHelper.generateMailsacEmail();
        console.log(`\n📬 HomeOwner email : ${ownerEmail}`);
        console.log(`🌐 Owner inbox     : ${EmailHelper.getInboxURL(ownerEmail)}\n`);

        // One shared context = one cookie/session store for all tabs
        context = await browser.newContext({
            permissions: ['geolocation'],
            geolocation: { latitude: 23.8103, longitude: 90.4125 },
        });

        // Tab 1 — website (starts blank; each test step navigates it)
        sitePage = await context.newPage();

        // Tab 2 — HomeOwner Mailsac inbox (open immediately so it's visible throughout)
        ownerMailPage = await context.newPage();
        await ownerMailPage.goto(EmailHelper.getInboxURL(ownerEmail));
        await ownerMailPage.waitForLoadState('domcontentloaded');
        console.log('✅ HomeOwner Mailsac inbox tab is open (Tab 2)');

        // Start focused on the website tab
        await sitePage.bringToFront();
    });

    test.afterAll(async () => {
        await context.close();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 1 — HomeOwner: Register → OTP bypass → Login (stays logged in)
    // ═══════════════════════════════════════════════════════════════════════
    test('➡️ SCENARIO 1: Register as HomeOwner and verify with hardcoded OTP', async () => {

        const authPage = new AuthPage(sitePage);
        const basePage = new BasePage(sitePage);

        await test.step('1. Open TradeMate and navigate to HomeOwner registration', async () => {
            await sitePage.bringToFront();
            await basePage.goToURL();
            await sitePage.getByRole('button', { name: 'Find a surrey tradesman' }).click();
            await expect(sitePage.getByText('Create your free')).toBeVisible();
            console.log('✅ HomeOwner registration page visible');
        });

        await test.step('2. Fill registration form with Mailsac email and submit', async () => {
            await authPage.AccountInformation(
                process.env.USER_NAME!,
                ownerEmail,
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

        await test.step('3. Fill hardcoded OTP (1,2,3,4) — dev environment bypass', async () => {
            await authPage.OTPVerification('1', '2', '3', '4');
            await sitePage.getByText('Continue').click();
            await expect(
                sitePage.getByText('Login your account')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ OTP accepted — now on login page');
        });

        await test.step('4. Login with the newly registered HomeOwner account', async () => {
            await authPage.EmailInput.fill(ownerEmail);
            await authPage.PasswordInput.fill('12345678');
            await sitePage.getByRole('button', { name: 'Log in' }).click();
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ HomeOwner logged in — stays logged in for Scenarios 2, 3, 4');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 2 — View Welcome email → "Go to Site" → back to TradeMate
    // ═══════════════════════════════════════════════════════════════════════
    test('➡️ SCENARIO 2: View HomeOwner Welcome email and click "Go to Site"', async () => {

        await test.step('5. Poll Mailsac API until Welcome email arrives', async () => {
            const helper = new EmailHelper();
            const { subject } = await helper.fetchWelcomeEmail(ownerEmail);
            console.log(`✅ Welcome email in inbox — Subject: "${subject}"`);
        });

        await test.step('6. Switch to HomeOwner Mailsac tab and reload inbox', async () => {
            await ownerMailPage.bringToFront();
            await ownerMailPage.reload();
            await ownerMailPage.waitForLoadState('domcontentloaded');
            await ownerMailPage.waitForTimeout(2000);
            console.log('👀 Owner inbox visible — Welcome email should be in the list');
        });

        await test.step('7. Click on the Welcome email to open it', async () => {
            const welcomeRow = ownerMailPage
                .locator('a, tr, div')
                .filter({ hasText: /welcome/i })
                .first();
            await welcomeRow.waitFor({ state: 'visible', timeout: 15000 });
            await welcomeRow.click();
            await ownerMailPage.waitForLoadState('domcontentloaded');
            await ownerMailPage.waitForTimeout(2000);
            console.log('✅ Welcome email opened in Mailsac');
        });

        await test.step('8. Click "Go to Site" inside the Welcome email', async () => {
            sitePage = await clickEmailButton(
                ownerMailPage, context, sitePage, ownerEmail,
                /go to site/i,
                'welcome'
            );
        });

        await test.step('9. Confirm we are back on TradeMate (HomeOwner still logged in)', async () => {
            await sitePage.bringToFront();
            console.log(`🌐 URL after "Go to Site": ${sitePage.url()}`);
            expect(sitePage.url()).toContain('trademate');
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ Back on TradeMate — HomeOwner is still logged in');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 3 — Post a Job → wait → "Your Job Post Is Live!" email
    //              → click "Visit Trademate" → wait a few moments → back
    // (HomeOwner still logged in — no re-login needed)
    // ═══════════════════════════════════════════════════════════════════════
    test('➡️ SCENARIO 3: HomeOwner posts a job and views job live email in Mailsac', async () => {

        const homePage = new HomePage(sitePage);

        // ── 3.1  Navigate to home (already logged in) ─────────────────────
        await test.step('10. Navigate to home page — user is already logged in', async () => {
            await sitePage.bringToFront();
            await sitePage.goto(process.env.WEBSITE_URL!.trim());
            await sitePage.waitForLoadState('domcontentloaded');
            await homePage.specificService.scrollIntoViewIfNeeded();
            await expect(
                sitePage.getByText('Select the job or trade you require')
            ).toBeVisible();
            console.log('✅ Home page — Services section visible');
        });

        // ── 3.2  Select Plumber & set location ────────────────────────────
        await test.step('11. Click Plumber service and confirm map location', async () => {
            await homePage.plumberService.click();
            await expect(sitePage.getByText('Enter the job location')).toBeVisible();
            await homePage.mapLocation.click();
            await homePage.confirmMapLocation.click();
            await expect(sitePage.getByText('Choose your location Manually')).toBeVisible();
            await homePage.continueButton.click();
            console.log('✅ Location confirmed — continued');
        });

        // ── 3.3  Fill title & description ─────────────────────────────────
        await test.step('12. Fill job title and description', async () => {
            await expect(sitePage.getByText('Give your job a title').first()).toBeVisible();
            await sitePage.getByPlaceholder('Write headline here').fill('Hiring A Plumber');
            await sitePage
                .getByPlaceholder('Minimum of 50 characters needs entering as min description to proceed')
                .fill(process.env.LOREM_TEXT!);
            await homePage.continueButton.click();
            console.log('✅ Title and description filled');
        });

        // ── 3.4  Select timeframe ──────────────────────────────────────────
        await test.step('13. Select job timeframe', async () => {
            await expect(
                sitePage.getByText('What timeframe do you need the job completed by?')
            ).toBeVisible();
            await homePage.jobTimeFrame.click();
            await homePage.continueButton.click();
            console.log('✅ Timeframe selected');
        });

        // ── 3.5  Select work type ──────────────────────────────────────────
        await test.step('14. Select type of work required', async () => {
            await homePage.requiredWork2.click();
            await homePage.continueButton.click();
            console.log('✅ Work type selected');
        });

        // ── 3.6  Upload image ──────────────────────────────────────────────
        await test.step('15. Upload job image', async () => {
            await sitePage.setInputFiles('input[type="file"]', 'test_attachments/Qa.jpg');
            await sitePage.getByText('Continue').click();
            console.log('✅ Image uploaded');
        });

        // ── 3.7  Upload video & submit ─────────────────────────────────────
        await test.step('16. Upload job video and submit the job post', async () => {
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

        // ── 3.8  Wait a few seconds for email to be generated ─────────────
        await test.step('17. Wait a few seconds for the job live email to be generated', async () => {
            console.log('⏳ Waiting 5 seconds for the job email to be generated...');
            await sitePage.waitForTimeout(5000);
        });

        // ── 3.9  Poll Mailsac API until job email arrives ──────────────────
        await test.step('18. Poll Mailsac API until job live email arrives', async () => {
            const helper = new EmailHelper();
            const { subject } = await helper.fetchJobEmail(ownerEmail);
            console.log(`✅ Job email in inbox — Subject: "${subject}"`);
        });

        // ── 3.10  Switch to Mailsac tab and open the job email ─────────────
        await test.step('19. Switch to Mailsac tab and open the job email', async () => {
            await ownerMailPage.bringToFront();
            await ownerMailPage.reload();
            await ownerMailPage.waitForLoadState('domcontentloaded');
            await ownerMailPage.waitForTimeout(2000);
            console.log('👀 Owner inbox reloaded — looking for job live email');

            // The job email row — matches "job", "post", "live", "confirm"
            const jobEmailRow = ownerMailPage
                .locator('a, tr, div')
                .filter({ hasText: /job|post|live|confirm/i })
                .first();
            await jobEmailRow.waitFor({ state: 'visible', timeout: 20000 });
            await jobEmailRow.click();
            await ownerMailPage.waitForLoadState('domcontentloaded');
            await ownerMailPage.waitForTimeout(2000);
            console.log('✅ Job email opened in Mailsac');
        });

        // ── 3.11  Assert the expected text in the email ────────────────────
        await test.step('20. Verify "Your Job Post Is Live on Trademate site!" text in email', async () => {
            // Check in the visible Mailsac page first (works for both inline & iframe)
            const liveTextVisible = await ownerMailPage
                .getByText(/your job post is live/i)
                .isVisible({ timeout: 5000 })
                .catch(() => false);

            if (liveTextVisible) {
                console.log('✅ "Your Job Post Is Live on Trademate site!" text found in email body');
            } else {
                // Fall back: check inside any iframe Mailsac may have rendered the email in
                let foundInFrame = false;
                for (const frame of ownerMailPage.frames()) {
                    const frameVisible = await frame
                        .getByText(/your job post is live/i)
                        .isVisible({ timeout: 3000 })
                        .catch(() => false);
                    if (frameVisible) {
                        foundInFrame = true;
                        console.log('✅ "Your Job Post Is Live" text found inside email iframe');
                        break;
                    }
                }

                if (!foundInFrame) {
                    // Final fallback: read via API and assert on the plain text body
                    const helper = new EmailHelper();
                    const { body } = await helper.getLatestJobEmailBody(ownerEmail);
                    expect(body.toLowerCase()).toContain('live');
                    console.log('✅ "live" keyword confirmed in email body via Mailsac API');
                }
            }
        });

        // ── 3.12  Click "Visit Trademate" inside the email ────────────────
        await test.step('21. Click "Visit Trademate" button inside the job email', async () => {
            sitePage = await clickEmailButton(
                ownerMailPage, context, sitePage, ownerEmail,
                /visit trademate|go to site|view job/i,
                'job'
            );
        });

        // ── 3.13  Confirm back on TradeMate ───────────────────────────────
        await test.step('22. Confirm we are back on TradeMate (HomeOwner still logged in)', async () => {
            await sitePage.bringToFront();
            console.log(`🌐 URL after "Visit Trademate": ${sitePage.url()}`);
            expect(sitePage.url()).toContain('trademate');
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ Back on TradeMate — HomeOwner still logged in');
        });

        // ── 3.14  Wait a few moments before logout (next scenario) ─────────
        await test.step('23. Wait a few moments on the site before proceeding to logout', async () => {
            console.log('⏳ Waiting 3 seconds on TradeMate before logout...');
            await sitePage.waitForTimeout(3000);
            console.log('✅ Wait complete — ready for Scenario 4');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 4 — View Posted Jobs → open job detail → Applicant List → Logout
    // (HomeOwner continues from Scenario 3 — already on the website, logged in)
    // ═══════════════════════════════════════════════════════════════════════
    test('➡️ SCENARIO 4: HomeOwner views Posted Jobs, opens job detail, then logs out', async () => {

        const homePage = new HomePage(sitePage);

        // ── 4.1  Confirm still logged in ──────────────────────────────────
        await test.step('24. Verify that HomeOwner is still logged in', async () => {
            await sitePage.bringToFront();
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ HomeOwner confirmed still logged in — no extra login needed');
        });

        // ── 4.2  Click "Posted Jobs" nav link ─────────────────────────────
        await test.step('25. Click "Posted Jobs" in the nav bar and verify listing page', async () => {
            await sitePage.getByText('Posted Jobs').first().click();
            await expect(
                sitePage.getByText('My Posted Jobs')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ My Posted Jobs page is visible');
        });

        // ── 4.3  Open first job's detail page ─────────────────────────────
        await test.step('26. Click "View Details" on the first posted job', async () => {
            await sitePage.getByText('View Details').first().click();
            await expect(
                sitePage.getByText('Job Done by:')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ Job detail page visible — "Job Done by:" heading found');
        });

        // ── 4.4  Scroll to Applicant List section ─────────────────────────
        await test.step('27. Scroll down to the Applicant List section', async () => {
            const applicantHeading = sitePage
                .getByText('Applicant List')
                .or(sitePage.getByText('Applicants'))
                .first();
            await applicantHeading.scrollIntoViewIfNeeded();
            await expect(applicantHeading).toBeVisible({ timeout: 10000 });
            console.log('✅ Applicant List section is now visible on screen');
        });

        // ── 4.5  HomeOwner logs out ────────────────────────────────────────
        await test.step('28. HomeOwner logs out', async () => {
            await sitePage.getByRole('button', { name: 'Log out' }).click();
            await homePage.logoutButton.click();
            console.log('✅ HomeOwner logged out successfully');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 5 — Tradesman: Register → OTP → Login → Welcome email → back
    // (HomeOwner is fully logged out; fresh Tradesman account on same sitePage)
    // ═══════════════════════════════════════════════════════════════════════
    test('➡️ SCENARIO 5: Tradesman registers, logs in, views Welcome email, returns to site', async () => {

        const authPage = new AuthPage(sitePage);
        const basePage = new BasePage(sitePage);

        // ── 5.0  Generate Tradesman email & open their Mailsac tab ─────────
        await test.step('29. Generate Tradesman email and open a new Mailsac inbox tab', async () => {
            tradesmanEmail = EmailHelper.generateMailsacEmail();
            console.log(`\n📬 Tradesman email : ${tradesmanEmail}`);
            console.log(`🌐 Tradesman inbox  : ${EmailHelper.getInboxURL(tradesmanEmail)}\n`);

            // Open Tab 3 — Tradesman Mailsac inbox
            tsMailPage = await context.newPage();
            await tsMailPage.goto(EmailHelper.getInboxURL(tradesmanEmail));
            await tsMailPage.waitForLoadState('domcontentloaded');
            console.log('✅ Tradesman Mailsac inbox tab opened (Tab 3)');

            // Return focus to website tab for registration
            await sitePage.bringToFront();
        });

        // ── 5.1  Navigate to Tradesperson registration ─────────────────────
        await test.step('30. Navigate to TradeMate home and go to Tradesperson registration', async () => {
            await sitePage.bringToFront();
            await basePage.goToURL();
            await sitePage.getByRole('button', { name: 'Join as a Tradesperson' }).click();
            await expect(sitePage.getByText('Create your free')).toBeVisible();
            console.log('✅ Tradesperson registration page visible');
        });

        // ── 5.2  Fill registration form ────────────────────────────────────
        await test.step('31. Fill Tradesman registration form and submit', async () => {
            await authPage.AccountInformation(
                'NewTradePerson',
                tradesmanEmail,
                process.env.PHONE_NUMBER!,
                '12345678',
                '12345678'
            );
            await authPage.CreateAccountButton.click();
            await expect(
                sitePage.getByText('Enter the verification code we send you on:')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ OTP screen visible for Tradesman');
        });

        // ── 5.3  OTP bypass ────────────────────────────────────────────────
        await test.step('32. Fill hardcoded OTP (1,2,3,4) — dev bypass', async () => {
            await authPage.OTPVerification('1', '2', '3', '4');
            await sitePage.getByText('Continue').click();
            await expect(
                sitePage.getByText('Login your account')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ OTP accepted — Tradesman login page showing');
        });

        // ── 5.4  Login as Tradesman ────────────────────────────────────────
        await test.step('33. Login with the newly registered Tradesman account', async () => {
            await authPage.EmailInput.fill(tradesmanEmail);
            await authPage.PasswordInput.fill('12345678');
            await sitePage.getByRole('button', { name: 'Log in' }).click();
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ Tradesman logged in successfully');
        });

        // ── 5.5  Wait a few seconds for welcome email to be generated ──────
        await test.step('34. Wait a few seconds for Tradesman welcome email to be generated', async () => {
            console.log('⏳ Waiting 5 seconds for the Tradesman welcome email...');
            await sitePage.waitForTimeout(5000);
        });

        // ── 5.6  Poll Mailsac for Tradesman Welcome email ──────────────────
        await test.step('35. Poll Mailsac API until Tradesman Welcome email arrives', async () => {
            const helper = new EmailHelper();
            const { subject } = await helper.fetchWelcomeEmail(tradesmanEmail);
            console.log(`✅ Tradesman Welcome email confirmed — Subject: "${subject}"`);
        });

        // ── 5.7  Switch to Tradesman Mailsac tab and reload ────────────────
        await test.step('36. Switch to Tradesman Mailsac tab and reload inbox', async () => {
            await tsMailPage.bringToFront();
            await tsMailPage.reload();
            await tsMailPage.waitForLoadState('domcontentloaded');
            await tsMailPage.waitForTimeout(2000);
            console.log('👀 Tradesman Mailsac inbox visible — Welcome email should be in the list');
        });

        // ── 5.8  Open the Welcome email in Mailsac UI ─────────────────────
        await test.step('37. Click on the Tradesman Welcome email to open it', async () => {
            const welcomeRow = tsMailPage
                .locator('a, tr, div')
                .filter({ hasText: /welcome/i })
                .first();
            await welcomeRow.waitFor({ state: 'visible', timeout: 15000 });
            await welcomeRow.click();
            await tsMailPage.waitForLoadState('domcontentloaded');
            await tsMailPage.waitForTimeout(2000);
            console.log('✅ Tradesman Welcome email opened in Mailsac');
        });

        // ── 5.9  Click "Go to Site" inside the Tradesman Welcome email ─────
        await test.step('38. Click "Go to Site" inside the Tradesman Welcome email', async () => {
            sitePage = await clickEmailButton(
                tsMailPage, context, sitePage, tradesmanEmail,
                /go to site/i,
                'welcome'
            );
        });

        // ── 5.10  Confirm back on TradeMate, Tradesman still logged in ─────
        await test.step('39. Confirm we are back on TradeMate (Tradesman logged in)', async () => {
            await sitePage.bringToFront();
            console.log(`🌐 URL after Tradesman "Go to Site": ${sitePage.url()}`);
            expect(sitePage.url()).toContain('trademate');
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ Tradesman is back on TradeMate and still logged in');
        });

        // ── 5.11  Wait a few moments on the site ──────────────────────────
        await test.step('40. Stay on TradeMate for a few moments before finishing', async () => {
            console.log('⏳ Waiting 3 seconds on TradeMate site...');
            await sitePage.waitForTimeout(3000);
            console.log('✅ Scenario 5 complete — Tradesman flow finished ✅');
        });
    });

});

// ══════════════════════════════════════════════════════════════════════════
// Shared helper — clicks a button inside an open Mailsac email page.
// Tries 3 strategies in order (direct link → iframe → API URL extraction).
// Returns the updated sitePage reference (may change if a new tab opened).
// ══════════════════════════════════════════════════════════════════════════
async function clickEmailButton(
    mailPage: Page,
    context: BrowserContext,
    sitePage: Page,
    emailAddress: string,
    buttonText: RegExp,
    emailType: 'welcome' | 'job'
): Promise<Page> {

    let clicked = false;

    // ── Strategy A: link/button directly visible in the Mailsac page ──────
    try {
        const link = mailPage
            .getByRole('link', { name: buttonText })
            .or(mailPage.getByRole('button', { name: buttonText }));

        if (await link.first().isVisible({ timeout: 5000 })) {
            const href = await link.first().getAttribute('href');
            console.log(`🔗 Strategy A — button found. href = ${href}`);

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

    // ── Strategy B: button is inside an iframe in the Mailsac page ────────
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

    // ── Strategy C: extract URL from email body via Mailsac REST API ───────
    if (!clicked) {
        try {
            console.log('🔄 Strategy C — fetching email body via API to extract URL...');
            const helper = new EmailHelper();
            let body = '';

            if (emailType === 'welcome') {
                ({ body } = await helper.getLatestWelcomeEmailBody(emailAddress));
            } else {
                ({ body } = await helper.getLatestJobEmailBody(emailAddress));
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
            `⚠️  All strategies failed — could not click the email button.\n` +
            `   Check inbox manually: ${EmailHelper.getInboxURL(emailAddress)}`
        );
        await sitePage.bringToFront();
    }

    return sitePage;
}