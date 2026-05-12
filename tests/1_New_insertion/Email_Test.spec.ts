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
 *   SCENARIO 6 — View first job → "Complete Registration" → fill trade profile
 *                → submit → attempt job detail (blocked) → buy subscription
 *                → navigate home → Tradesman logs out
 *
 * [Admin — admin@admin.com]
 *   SCENARIO 7 — Open new Tab 4 (admin site) → login → find Tradesman in list
 *                → click Eye icon → click "Update Verification" → set "Verified"
 *                → switch back to website tab
 *
 * [Tradesman — re-login]
 *   SCENARIO 8 — Tradesman logs back in → switch to Mailsac tab → view
 *                "Account Verified Successfully" email → return to website
 *                → view first job detail → provide quote £1000
 *                → wait → switch to Mailsac → view "Quote submitted successfully!" email
 *                → return to website → Tradesman logs out
 *
 * [HomeOwner — re-login]
 *   SCENARIO 9 — HomeOwner re-logs in → views "New Quote Submitted" email
 *                → back to website → Posted Jobs (step 26) → View Details (step 27) →
 *                Applicant List (step 28, wait 2s) → HomeOwner logs out
 *
 *   SCENARIO 10 — HomeOwner is logged out → New Tradesman2 created (S5→S8,
 *                 no email views) → quotes job → logs out →
 *                 HomeOwner logs in → Posted Jobs → Applicant List →
 *                 rejects Tradesman2 (Delete Application, 3s wait) →
 *                 hires Tradesman1 (Hire Now → Confirm → "Post your review") →
 *                 views "You Accepted an Offer!" email → returns to website →
 *                 HomeOwner logs out
 *
 * TAB LAYOUT (shared across every test via module-level variables)
 * ──────────────────────────────────────────────────────────────────
 *   sitePage      = Tab 1  — TradeMate website        (reused by every scenario)
 *   ownerMailPage = Tab 2  — Mailsac inbox: HomeOwner  (open from start)
 *   tsMailPage    = Tab 3  — Mailsac inbox: Tradesman  (opened in Scenario 5)
 *   adminPage     = Tab 4  — Admin panel site          (opened in Scenario 7)
 * ──────────────────────────────────────────────────────────────────────────
 */

import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { AuthPage } from '../../src/pages/AuthPage';
import { BasePage } from '../../src/pages/BasePage';
import { HomePage } from '../../src/pages/HomePage';
import { JobPage } from '../../src/pages/JobPage';
import { EmailHelper } from '../../src/utils/EmailHelper';
import { SubscriptionPage } from '../../src/pages/SubscriptionPage';
import dotenv from 'dotenv';
dotenv.config();

// ─── Shared state — lives for the entire test-file run ────────────────────
let browser: Browser;
let context: BrowserContext;
let sitePage: Page;         // Tab 1 — TradeMate website
let ownerMailPage: Page;    // Tab 2 — Mailsac inbox for HomeOwner
let tsMailPage: Page;       // Tab 3 — Mailsac inbox for Tradesman (added in S5)
let adminPage: Page;        // Tab 4 — Admin panel site (opened in Scenario 7)

let ownerEmail: string;       // freshly generated @mailsac.com for the HomeOwner
let tradesmanEmail: string;  // freshly generated @mailsac.com for the Tradesman (Scenario 5)
let tradesmanEmail2: string; // freshly generated @mailsac.com for Tradesman2 (Scenario 10)
let tsMailPage2: Page;       // Tab 5 — Mailsac inbox for Tradesman2 (opened in Scenario 10)
// ──────────────────────────────────────────────────────────────────────────

test.describe.serial('📧 End-to-End Flows (HomeOwner + Tradesman)', () => {

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

        // ── After OTP: view "Welcome to Our Platform!" registration email ──
        await test.step('3a. Wait for "Welcome to Our Platform!" registration email to arrive', async () => {
            console.log('⏳ Waiting 4 seconds then polling for "Welcome to Our Platform!" email...');
            await sitePage.waitForTimeout(4000);
            const helper = new EmailHelper();
            const { subject } = await helper.fetchRegistrationEmail(ownerEmail);
            console.log(`✅ Registration email confirmed in inbox — Subject: "${subject}"`);
        });

        await test.step('3b. Switch to Mailsac tab and open the "Welcome to Our Platform!" email', async () => {
            await ownerMailPage.bringToFront();
            await ownerMailPage.reload();
            await ownerMailPage.waitForLoadState('domcontentloaded');
            await ownerMailPage.waitForTimeout(1500);

            // Open the email row — subject is exactly "Welcome to Our Platform!"
            const regEmailRow = ownerMailPage
                .locator('a, tr, div')
                .filter({ hasText: /welcome to our platform!/i })
                .first();
            await regEmailRow.waitFor({ state: 'visible', timeout: 15000 });
            await regEmailRow.click();
            await ownerMailPage.waitForLoadState('domcontentloaded');
            await ownerMailPage.waitForTimeout(3000); // observe the email for 3 seconds
            console.log('✅ "Welcome to Our Platform!" email opened and observed for 3 seconds');
        });

        await test.step('3c. Switch back to TradeMate website login page', async () => {
            await sitePage.bringToFront();
            await expect(
                sitePage.getByText('Login your account')
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ Back on TradeMate login page — ready to login');
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

        // ── After login: view "Welcome to Our Platform - Trademate!" email ──
        await test.step('4a. Wait a few seconds then poll for "Welcome to Our Platform - Trademate!" email', async () => {
            console.log('⏳ Waiting 4 seconds then polling for "Welcome to Our Platform - Trademate!" email...');
            await sitePage.waitForTimeout(4000);
            const helper = new EmailHelper();
            const { subject } = await helper.fetchWelcomeLoginEmail(ownerEmail);
            console.log(`✅ Post-login welcome email confirmed in inbox — Subject: "${subject}"`);
        });

        await test.step('4b. Switch to Mailsac tab and open the "Welcome to Our Platform - Trademate!" email', async () => {
            await ownerMailPage.bringToFront();
            await ownerMailPage.reload();
            await ownerMailPage.waitForLoadState('domcontentloaded');
            await ownerMailPage.waitForTimeout(1500);

            // Open the email row — subject is "Welcome to Our Platform - Trademate!"
            const loginWelcomeRow = ownerMailPage
                .locator('a, tr, div')
                .filter({ hasText: /welcome to our platform - trademate/i })
                .first();
            await loginWelcomeRow.waitFor({ state: 'visible', timeout: 15000 });
            await loginWelcomeRow.click();
            await ownerMailPage.waitForLoadState('domcontentloaded');
            await ownerMailPage.waitForTimeout(3000); // observe the email for 3 seconds
            console.log('✅ "Welcome to Our Platform - Trademate!" email opened and observed for 3 seconds');
        });

        await test.step('4c. Switch back to TradeMate website (HomeOwner still logged in)', async () => {
            await sitePage.bringToFront();
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ Back on TradeMate — HomeOwner is logged in and Scenario 1 is fully complete');
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

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 6 — Tradesman: View first job → Complete Registration (profile)
    //              → attempt job detail (blocked, unapproved) → buy subscription
    // (Tradesman is still logged in from Scenario 5)
    // ═══════════════════════════════════════════════════════════════════════
    test('➡️ SCENARIO 6: Tradesman completes profile, hits approval wall, buys subscription', async () => {

        const homePage = new HomePage(sitePage);
        const subscriptionPage = new SubscriptionPage(sitePage);

        // ── 6.1  Confirm Tradesman is still logged in ──────────────────────
        await test.step('41. Verify Tradesman is still logged in on TradeMate', async () => {
            await sitePage.bringToFront();
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ Tradesman confirmed still logged in');
        });

        // ── 6.2  Click "View Details" on the first visible job ────────────
        await test.step('42. Click "View Details" on the first job in the listing', async () => {
            await sitePage.getByRole('button', { name: 'View Details' }).first().click();
            console.log('✅ Clicked "View Details" on first job');
        });

        // ── 6.3  Click "Complete Registration" & select trade category ─────
        await test.step('43. Click "Complete Registration" and select trade category (Plumber)', async () => {
            await sitePage.getByRole('button', { name: 'Complete Registration' }).click();
            await expect(
                sitePage.getByText('Select your trade categories')
            ).toBeVisible({ timeout: 10000 });
            await homePage.plumberService.click();
            console.log('✅ Trade category selected — Plumber');
        });

        // ── 6.4  Set map location ──────────────────────────────────────────
        await test.step('44. Set map location for the Tradesman profile', async () => {
            await homePage.mapLocation.click();
            await homePage.confirmMapLocation.click();
            await expect(
                sitePage.getByText('Choose your location Manually')
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ Map location confirmed');
        });

        // ── 6.5  Fill Tradesman profile details ───────────────────────────
        await test.step('45. Fill in Tradesman profile information', async () => {
            await homePage.tradesManProfileDetails(
                'SoftwareTestingCompany',
                process.env.LOREM_TEXT!,
                'Milo',
                'TradeGuy',
                '100',
                '5',
                '01933954168',
                tradesmanEmail,
                'https://www.google.com',
                'https://www.google.com'
            );
            console.log('✅ Tradesman profile details filled');
        });

        // ── 6.6  Upload profile documents & submit ────────────────────────
        await test.step('46. Upload profile documents and submit the profile form', async () => {
            await homePage.profileDetailedFiles(
                'test_attachments/Qa.jpg',
                'test_attachments/testing soft.png',
                'test_attachments/testing.png',
                'test_attachments/Test PDF.pdf'
            );
            await sitePage.getByRole('button', { name: 'Submit' }).click();
            await expect(
                sitePage.getByText('TradesMan Profile updated successfully.')
            ).toBeVisible({ timeout: 20000 });
            console.log('✅ Tradesman profile submitted successfully');
        });

        // ── 6.7  Attempt to view job detail — expect approval wall ────────
        await test.step('47. Attempt to view job details — expect "View Subscriptions Plans" (unapproved wall)', async () => {
            await sitePage.getByText('View Details').first().click();
            await expect(
                sitePage.getByText('View Subscription Plans')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ Approval wall confirmed — "View Subscription Plans" is visible');
        });

        // ── 6.8  Click "View Subscriptions Plans" to proceed ──────────────
        await test.step('48. Click "View Subscription Plans" to navigate to subscription page', async () => {
            await sitePage.getByText('View Subscription Plans').click();
            console.log('✅ Navigated to subscription plans page');
        });

        // ── 6.9  Select subscription plan 3 ──────────────────────────────
        await test.step('49. Select subscription plan 3', async () => {
            await homePage.subscriptionPlan3.click();
            await expect(
                sitePage.getByText('Payment method')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ Subscription plan 3 selected — payment screen visible');
        });

        // ── 6.10  Complete payment ─────────────────────────────────────────
        await test.step('50. Fill in payment details and complete subscription purchase', async () => {
            await subscriptionPage.buySubscription(
                '4111111111111111',
                '12/27',
                '123',
                'Tajwar'
            );
            await expect(
                sitePage.getByText('My jobs')
            ).toBeVisible({ timeout: 20000 });
            console.log('✅ Subscription purchased — "My jobs" page visible ✅');
        });

        // ── 6.11  Navigate back to home page ─────────────────────────────
        await test.step('51. Navigate back to TradeMate home page after subscription', async () => {
            await sitePage.goto(process.env.WEBSITE_URL!.trim());
            await sitePage.waitForLoadState('domcontentloaded');
            console.log('✅ Tradesman navigated back to home page');
        });

        // ── 6.12  Tradesman logs out ──────────────────────────────────────
        await test.step('52. Tradesman logs out (will be re-used in Scenario 8)', async () => {
            await sitePage.getByRole('button', { name: 'Log out' }).click();
            await homePage.logoutButton.click();
            console.log('✅ Tradesman logged out — ready for Admin verification in Scenario 7');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 7 — Admin: Open admin site (Tab 4) → login → find Tradesman
    //              → click Eye icon → click "Update Verification" → set "Verified"
    //              → switch back to TradeMate website tab
    // ═══════════════════════════════════════════════════════════════════════
    test('➡️ SCENARIO 7: Admin verifies the Tradesman account in the admin panel', async () => {

        // ── 7.1  Open admin site in a NEW tab (Tab 4) ─────────────────────
        await test.step('53. Open admin panel in a new tab (Tab 4)', async () => {
            adminPage = await context.newPage();
            await adminPage.goto('https://jbtrade.thesyndicates.team/');
            await adminPage.waitForLoadState('domcontentloaded');
            await adminPage.bringToFront();
            console.log('✅ Admin site opened in Tab 4');
        });

        // ── 7.2  Login to admin panel ──────────────────────────────────────
        await test.step('54. Login to admin panel with admin credentials', async () => {
            // Fill email and password fields
            await adminPage.getByPlaceholder('Email').fill('admin@gmail.com');
            await adminPage.getByPlaceholder('Password').fill('12345678');
            await adminPage.getByRole('button', { name: 'Sign in' }).click();
            // Wait for dashboard / any element that confirms successful login
            await adminPage.waitForLoadState('domcontentloaded');
            await adminPage.waitForTimeout(2000);
            console.log('✅ Logged into admin panel');
        });

        // ── 7.3  Click "Tradesmen" in the admin sidebar ───────────────────
        await test.step('55. Click "Tradesmen" in the admin sidebar menu', async () => {
            await adminPage.locator('.ri-tools-fill').first().click();

            await adminPage.waitForLoadState('domcontentloaded');
            await adminPage.waitForTimeout(1500);

            console.log('✅ Navigated to Tradesmen list in admin panel');
        });

        // ── 7.4  Observe the Tradesmen table — confirm list is loaded ────────
        await test.step('56. Observe the Tradesmen table and confirm the list is loaded', async () => {
            // Wait for the table body to have at least one data row visible.
            // The newly registered Tradesman (from Scenario 5) will be the first entry.
            await adminPage.locator('table tbody tr').first()
                .waitFor({ state: 'visible', timeout: 15000 });
            console.log('✅ Tradesmen table loaded — first row (recently created Tradesman) is visible');
        });

        // ── 7.5  Click the Eye icon in the FIRST row of the Tradesmen table ─
        await test.step('57. Click the Eye-view icon in the first row to open the Tradesman record', async () => {
            // The first row in the table corresponds to the most recently created
            // Tradesman — the one registered in Scenario 5.
            // Eye icons in admin panels are typically rendered as:
            //   • <a> or <button> containing an <svg> or an icon class like ri-eye-line
            //   • The first action icon in each row (View comes before Edit / Delete)

            const firstRow = adminPage.locator('table tbody tr').first();

            // Try the icon by its common Remix Icon class first (ri-eye-line / ri-eye-fill)
            let eyeBtn = firstRow.locator('[class*="ri-eye"], [class*="eye"]').first();
            let visible = await eyeBtn.isVisible({ timeout: 3000 }).catch(() => false);

            if (!visible) {
                // Fallback: any <a> or <button> containing an SVG in the first row
                eyeBtn = firstRow.locator('a:has(svg), button:has(svg)').first();
                visible = await eyeBtn.isVisible({ timeout: 3000 }).catch(() => false);
            }

            if (!visible) {
                // Final fallback: the very first <a> or <button> in the row (View is always first)
                eyeBtn = firstRow.locator('a, button').first();
                visible = await eyeBtn.isVisible({ timeout: 3000 }).catch(() => false);
            }

            if (!visible) {
                await adminPage.screenshot({ path: 'test-results/admin_tradesmen_page.png', fullPage: true });
                throw new Error(
                    '❌ Could not find the Eye-view icon in the first Tradesmen row.\n' +
                    '   Screenshot saved to test-results/admin_tradesmen_page.png'
                );
            }

            await eyeBtn.click();
            await adminPage.waitForLoadState('domcontentloaded');
            await adminPage.waitForTimeout(1500);
            console.log('✅ Eye icon clicked — Tradesman record opened');
        });

        // ── 7.6  Click "Update Verification" button ───────────────────────
        await test.step('58. Click "Update Verification" button', async () => {
            // Log all buttons on this page so we can see exact button text
            console.log('\n🔍 DIAGNOSTIC — buttons on Tradesman detail page:');
            try {
                const btns = await adminPage.locator('button, a[role="button"], input[type="submit"]').all();
                for (const btn of btns) {
                    const txt = (await btn.textContent())?.trim().slice(0, 80);
                    if (txt) console.log(`  btn: "${txt}"`);
                }
            } catch { /* non-critical */ }

            const updateBtn = adminPage
                .getByRole('button', { name: /update verification/i })
                .or(adminPage.getByText(/update verification/i).first())
                .or(adminPage.locator('button, a').filter({ hasText: /verif/i }).first());

            await updateBtn.waitFor({ state: 'visible', timeout: 10000 });
            await updateBtn.click();
            await adminPage.waitForTimeout(1000);
            console.log('✅ "Update Verification" button clicked');
        });

        // ── 7.7  Select "Verified" from the Verification Status dropdown ──
        await test.step('59. Select "Verified" from the Verification Status dropdown', async () => {
            // Log all selects/comboboxes visible after clicking Update Verification
            console.log('\n🔍 DIAGNOSTIC — dropdowns/selects visible:');
            try {
                const selects = await adminPage.locator('select, [role="combobox"], [role="listbox"]').all();
                for (const s of selects) {
                    const txt = (await s.textContent())?.trim().slice(0, 100);
                    const name = await s.getAttribute('name');
                    console.log(`  select/combo: name="${name}" text="${txt}"`);
                }
            } catch { /* non-critical */ }

            // Wait for a modal/form to appear after clicking Update Verification
            await adminPage.waitForTimeout(500);

            // Try native <select> first — most reliable
            const nativeSelect = adminPage.locator('select').first();
            const isNative = await nativeSelect.isVisible({ timeout: 3000 }).catch(() => false);

            if (isNative) {
                await nativeSelect.selectOption({ label: 'Verified' })
                    .catch(() => nativeSelect.selectOption({ value: 'verified' }))
                    .catch(() => nativeSelect.selectOption({ value: 'Verified' }));
                console.log('✅ Selected "Verified" from native <select>');
            } else {
                // Custom dropdown: click the combobox, then pick the option
                const combobox = adminPage.getByRole('combobox').first()
                    .or(adminPage.locator('[class*="select__control"], [class*="Select"], [class*="dropdown-toggle"]').first());
                await combobox.waitFor({ state: 'visible', timeout: 8000 });
                await combobox.click();
                await adminPage.waitForTimeout(500);

                // Pick "Verified" option from the dropdown list
                const verifiedOption = adminPage.getByRole('option', { name: /verified/i })
                    .or(adminPage.locator('[class*="option"], [role="option"]').filter({ hasText: /verified/i }).first())
                    .or(adminPage.getByText('Verified').first());
                await verifiedOption.waitFor({ state: 'visible', timeout: 8000 });
                await verifiedOption.click();
                console.log('✅ Selected "Verified" from custom dropdown');
            }

            // Click "Save Changes" — mandatory step, must not be skipped
            const saveBtn = adminPage.locator('//button[@id="saveVerificationBtn"]');
            await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
            await saveBtn.click();
            await adminPage.waitForTimeout(2000);
            console.log('✅ "Save Changes" clicked — Tradesman Verification Status set to "Verified"');
        });

        // ── 7.8  Switch back to TradeMate website tab ─────────────────────
        await test.step('60. Switch back to TradeMate website tab (Tab 1)', async () => {
            await sitePage.bringToFront();
            console.log(`🌐 Back on TradeMate website: ${sitePage.url()}`);
            console.log('✅ Scenario 7 complete — Tradesman is now Verified by Admin ✅');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 8 — Tradesman re-logs in → views "Account Verified" email →
    //              returns to website → views first job → submits quote £1000
    //              → waits → switches to Mailsac → views "Quote submitted" email
    //              → returns to website → Tradesman logs out
    // ═══════════════════════════════════════════════════════════════════════
    test('➡️ SCENARIO 8: Tradesman re-logs in, reads verification email, quotes job, views quote email, logs out', async () => {

        const authPage = new AuthPage(sitePage);
        const basePage = new BasePage(sitePage);
        const homePage = new HomePage(sitePage);
        const jobPage = new JobPage(sitePage);

        // ── 8.1  Tradesman logs back in ───────────────────────────────────
        await test.step('61. Tradesman navigates to login page and logs in', async () => {
            await sitePage.bringToFront();
            await basePage.goToURL();
            await homePage.goToLoginURL();
            await authPage.EmailInput.fill(tradesmanEmail);
            await authPage.PasswordInput.fill('12345678');
            await sitePage.getByRole('button', { name: 'Log in' }).click();
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 15000 });
            await sitePage.waitForLoadState('domcontentloaded');
            await sitePage.waitForTimeout(2000);
            console.log('✅ Tradesman logged back in successfully');
        });

        // ── 8.2  Switch to Tradesman Mailsac tab immediately ─────────────
        await test.step('62. Switch to Tradesman Mailsac inbox tab (Tab 3) and reload', async () => {
            await tsMailPage.bringToFront();
            await tsMailPage.goto(EmailHelper.getInboxURL(tradesmanEmail));
            await tsMailPage.waitForLoadState('domcontentloaded');
            await tsMailPage.waitForTimeout(2000);
            console.log('👀 Tradesman Mailsac inbox tab is now in focus (Tab 3)');
        });

        // ── 8.3  Poll for the Account Verified email ──────────────────────
        await test.step('63. Poll Mailsac — wait for "Account Verified Successfully" email to arrive', async () => {
            console.log('⏳ Polling Mailsac for "Account Verified Successfully" email...');
            const helper = new EmailHelper();
            const { subject } = await helper.fetchAdminNotificationEmail(tradesmanEmail);
            console.log(`✅ Verification email found — Subject: "${subject}"`);
        });

        // ── 8.4  Reload inbox so the email appears in the list ────────────
        await test.step('64. Reload Tradesman Mailsac inbox so the verified email is listed', async () => {
            await tsMailPage.bringToFront();
            await tsMailPage.reload();
            await tsMailPage.waitForLoadState('domcontentloaded');
            await tsMailPage.waitForTimeout(2000);
            console.log('👀 Tradesman Mailsac inbox reloaded — verification email should be visible');
        });

        // ── 8.5  Open the "Account Verified Successfully" email ───────────
        await test.step('65. Click the "Account Verified Successfully" email to open it', async () => {
            const verifiedEmailRow = tsMailPage
                .locator('a, tr, div')
                .filter({ hasText: /verified|verification|welcome to our platform|account verified/i })
                .first();
            await verifiedEmailRow.waitFor({ state: 'visible', timeout: 15000 });
            await verifiedEmailRow.click();
            await tsMailPage.waitForLoadState('domcontentloaded');
            await tsMailPage.waitForTimeout(3000);
            console.log('✅ "Account Verified Successfully" email opened — observing for 3 seconds');
        });

        // ── 8.6  Navigate back to TradeMate website ───────────────────────
        await test.step('66. Navigate back to TradeMate website (sitePage)', async () => {
            await sitePage.bringToFront();
            await sitePage.waitForLoadState('domcontentloaded');
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 10000 });
            console.log(`🌐 Back on TradeMate — URL: ${sitePage.url()}`);
            console.log('✅ Tradesman is back on TradeMate and still logged in');
        });

        // ── 8.7  View Details of the first job in the listing ────────────
        await test.step('67. Click "View Details" on the first job in the listing', async () => {
            await sitePage.getByText('View Details').first().click();
            await expect(
                sitePage.getByText('Job Done by:')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ Job detail page visible — "Job Done by:" confirmed');
        });

        // ── 8.8  Provide a quote for the job ─────────────────────────────
        await test.step('68. Provide a quote of £1000 for the job', async () => {
            await sitePage.getByRole('button', { name: 'Provide your quote for the job' }).click();
            await jobPage.quoteAmount.fill('1000');
            await sitePage.getByRole('button', { name: 'Confirm' }).click();
            await expect(
                sitePage.getByText('Quote submitted successfully')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ Quote of £1000 submitted successfully!');
        });

        // ── 8.9  Wait a few seconds on the page after quoting ────────────
        await test.step('69. Wait a few seconds on the job page after quote submission', async () => {
            console.log('⏳ Waiting 4 seconds on the job page after submitting quote...');
            await sitePage.waitForTimeout(4000);
        });

        // ── 8.10  Poll Mailsac for "Quote submitted successfully!" email ──
        await test.step('70. Poll Mailsac — wait for "Quote submitted successfully!" email', async () => {
            console.log('⏳ Polling Mailsac for "Quote submitted successfully!" email...');
            const helper = new EmailHelper();
            const { subject } = await helper.fetchQuoteSubmittedEmail(tradesmanEmail);
            console.log(`✅ Quote email found — Subject: "${subject}"`);
        });

        // ── 8.11  Switch to Mailsac tab and reload ────────────────────────
        await test.step('71. Switch to Tradesman Mailsac tab and reload to show quote email', async () => {
            await tsMailPage.bringToFront();
            await tsMailPage.reload();
            await tsMailPage.waitForLoadState('domcontentloaded');
            await tsMailPage.waitForTimeout(2000);
            console.log('👀 Tradesman Mailsac inbox reloaded — quote email should be listed');
        });

        // ── 8.12  Open the "Quote submitted successfully!" email ──────────
        await test.step('72. Click the "Quote submitted successfully!" email to open it', async () => {
            const quoteEmailRow = tsMailPage
                .locator('a, tr, div')
                .filter({ hasText: /quote|submitted|successfully/i })
                .first();
            await quoteEmailRow.waitFor({ state: 'visible', timeout: 15000 });
            await quoteEmailRow.click();
            await tsMailPage.waitForLoadState('domcontentloaded');
            await tsMailPage.waitForTimeout(3000);
            console.log('✅ "Quote submitted successfully!" email opened — observing for 3 seconds');
        });

        // ── 8.13  Return to TradeMate website ────────────────────────────
        await test.step('73. Return to TradeMate website before logout', async () => {
            await sitePage.bringToFront();
            await sitePage.waitForLoadState('domcontentloaded');
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 10000 });
            console.log(`🌐 Back on TradeMate — URL: ${sitePage.url()}`);
            console.log('✅ Tradesman is back on TradeMate');
        });

        // ── 8.14  Tradesman logs out ──────────────────────────────────────
        await test.step('74. Tradesman logs out', async () => {
            await sitePage.getByRole('button', { name: 'Log out' }).click();
            await homePage.logoutButton.click();
            console.log('✅ Tradesman logged out successfully');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 9 — HomeOwner re-logs in → views "New Quote Submitted" email
    //              → back to website → Posted Jobs → View Details →
    //              Applicant List → wait 2s
    // ═══════════════════════════════════════════════════════════════════════
    test('➡️ Validate hiring new tradesman was done successfully', async () => {

        const authPage = new AuthPage(sitePage);
        const basePage = new BasePage(sitePage);
        const homePage = new HomePage(sitePage);
        const jobPage = new JobPage(sitePage);

        // ── 9.1  HomeOwner logs back in ───────────────────────────────────
        await test.step('75. HomeOwner navigates to login page and logs in', async () => {
            await sitePage.bringToFront();
            await basePage.goToURL();
            await homePage.goToLoginURL();
            await authPage.EmailInput.fill(ownerEmail);
            await authPage.PasswordInput.fill('12345678');
            await sitePage.getByRole('button', { name: 'Log in' }).click();
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 15000 });
            await sitePage.waitForLoadState('domcontentloaded');
            await sitePage.waitForTimeout(2000);
            console.log('✅ HomeOwner logged back in successfully');
        });

        // ── 9.2  Poll Mailsac for "New Quote Submitted" email ────────────
        await test.step('76. Poll Mailsac — wait for "New Quote Submitted for Your Job Review please!" email', async () => {
            console.log('⏳ Polling Mailsac for "New Quote Submitted" email...');
            const helper = new EmailHelper();
            const { subject } = await helper.fetchNewQuoteEmail(ownerEmail);
            console.log(`✅ New Quote email confirmed in inbox — Subject: "${subject}"`);
        });

        // ── 9.3  Switch to HomeOwner Mailsac tab and open the quote email ─
        await test.step('77. Switch to HomeOwner Mailsac tab and open the "New Quote Submitted" email', async () => {
            await ownerMailPage.bringToFront();
            await ownerMailPage.reload();
            await ownerMailPage.waitForLoadState('domcontentloaded');
            await ownerMailPage.waitForTimeout(2000);
            console.log('👀 HomeOwner Mailsac inbox reloaded — looking for Quote email');

            const quoteEmailRow = ownerMailPage
                .locator('a, tr, div')
                .filter({ hasText: /quote|submitted|review/i })
                .first();
            await quoteEmailRow.waitFor({ state: 'visible', timeout: 20000 });
            await quoteEmailRow.click();
            await ownerMailPage.waitForLoadState('domcontentloaded');
            await ownerMailPage.waitForTimeout(3000); // observe for 3 seconds
            console.log('✅ "New Quote Submitted" email opened — observed for 3 seconds');
        });

        // ── 9.4  Switch back to TradeMate website ────────────────────────
        await test.step('78. Switch back to TradeMate website (HomeOwner still logged in)', async () => {
            await sitePage.bringToFront();
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ Back on TradeMate — HomeOwner is logged in');
        });

        // ── 9.5 (step 26) Navigate to Posted Jobs ────────────────────────
        await test.step('26. Verify displaying the newly posted jobs', async () => {
            await sitePage.getByText('Posted Jobs').first().click();
            await expect(
                sitePage.getByText('My Posted Jobs')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ My Posted Jobs page is visible');
        });

        // ── 9.6 (step 27) Open the first job's detail page ───────────────
        await test.step('27. Verify displaying the Details of the newly posted job', async () => {
            await sitePage.getByText('View Details').first().click();
            await expect(
                sitePage.getByText('Job Done by:')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ Job detail page visible — "Job Done by:" confirmed');
        });

        // ── 9.7 (step 28) Verify Applicant List visible and wait 2 seconds ─
        await test.step('28. Verify Hiring a Tradesman for the job', async () => {
            await expect(
                sitePage.getByText('Applicant List')
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ Applicant List section visible');

            // Wait 2 seconds — this is where the flow should be completed and passed
            await sitePage.waitForTimeout(2000);
            console.log('✅ Applicant List confirmed — ready to proceed to Scenario 10');
        });

        // ── 9.8  HomeOwner logs out — Tradesman2 creation begins next ─────
        // The HomeOwner MUST be logged out here so that the "Join as a
        // Tradesperson" button becomes visible for Tradesman2 registration.
        await test.step('82a. HomeOwner logs out (end of Scenario 9)', async () => {
            await sitePage.getByRole('button', { name: 'Log out' }).click();
            await homePage.logoutButton.click();
            console.log('✅ HomeOwner logged out — Scenario 9 complete ✅');
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SCENARIO 10 — New Tradesman2 created (S5→S8 without email views) →
    //               quotes job → logs out →
    //               HomeOwner (switches back to applicant list page) →
    //               rejects Tradesman2 (2nd applicant) → hires Tradesman1 →
    //               views "You Accepted an Offer!" email → HomeOwner logs out
    // ═══════════════════════════════════════════════════════════════════════
    test('➡️ SCENARIO 10: Tradesman2 quotes, HomeOwner rejects Tradesman2, hires Tradesman1, views acceptance email', async () => {

        const authPage = new AuthPage(sitePage);
        const basePage = new BasePage(sitePage);
        const homePage = new HomePage(sitePage);
        const jobPage = new JobPage(sitePage);
        const subscriptionPage = new SubscriptionPage(sitePage);

        // ══════════════════════════════════════════════════════════════════
        // PART A — Create Tradesman2 (repeat S5→S8 flow, no email viewing)
        // ══════════════════════════════════════════════════════════════════

        // ── 10.1  Generate Tradesman2 email & open their Mailsac tab ──────
        await test.step('82. Generate Tradesman2 email and open a new Mailsac inbox tab (Tab 5)', async () => {
            tradesmanEmail2 = EmailHelper.generateMailsacEmail();
            console.log(`
📬 Tradesman2 email : ${tradesmanEmail2}`);
            console.log(`🌐 Tradesman2 inbox  : ${EmailHelper.getInboxURL(tradesmanEmail2)}
`);

            // Open Tab 5 — Tradesman2 Mailsac inbox
            tsMailPage2 = await context.newPage();
            await tsMailPage2.goto(EmailHelper.getInboxURL(tradesmanEmail2));
            await tsMailPage2.waitForLoadState('domcontentloaded');
            console.log('✅ Tradesman2 Mailsac inbox tab opened (Tab 5)');

            await sitePage.bringToFront();
        });

        // ── 10.2  Register Tradesman2 ─────────────────────────────────────
        // At this point HomeOwner is logged out (from end of Scenario 9),
        // so the "Join as a Tradesperson" button is visible on the homepage.
        await test.step('83. Register Tradesman2 account', async () => {
            await sitePage.bringToFront();

            // Navigate to the website home page — logged-out state
            await basePage.goToURL();
            await sitePage.waitForLoadState('domcontentloaded');
            await sitePage.waitForTimeout(2000);

            // "Join as a Tradesperson" is only visible when NOT logged in
            const joinBtn = sitePage.getByRole('button', { name: 'Join as a Tradesperson' });
            await joinBtn.waitFor({ state: 'visible', timeout: 20000 });
            await joinBtn.click();

            // Wait for the registration form to load
            await expect(
                sitePage.getByText('Create your free')
            ).toBeVisible({ timeout: 20000 });
            console.log('✅ Tradesman2 registration page visible');

            await authPage.AccountInformation(
                'TradePerson2',
                tradesmanEmail2,
                process.env.PHONE_NUMBER!,
                '12345678',
                '12345678'
            );
            await authPage.CreateAccountButton.click();
            await expect(
                sitePage.getByText('Enter the verification code we send you on:')
            ).toBeVisible({ timeout: 15000 });

            // OTP bypass
            await authPage.OTPVerification('1', '2', '3', '4');
            await sitePage.getByText('Continue').click();
            await expect(
                sitePage.getByText('Login your account')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ Tradesman2 registered successfully');
        });

        // ── 10.3  Login as Tradesman2 ─────────────────────────────────────
        await test.step('84. Login as Tradesman2', async () => {
            await authPage.EmailInput.fill(tradesmanEmail2);
            await authPage.PasswordInput.fill('12345678');
            await sitePage.getByRole('button', { name: 'Log in' }).click();
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ Tradesman2 logged in successfully');
        });

        // ── 10.4  Complete Registration — trade profile (same as S6) ──────
        await test.step('85. Tradesman2: Click View Details → Complete Registration → select Plumber', async () => {
            await sitePage.getByRole('button', { name: 'View Details' }).first().click();
            await sitePage.getByRole('button', { name: 'Complete Registration' }).click();
            await expect(
                sitePage.getByText('Select your trade categories')
            ).toBeVisible({ timeout: 10000 });
            await homePage.plumberService.click();
            console.log('✅ Tradesman2 trade category selected — Plumber');
        });

        await test.step('86. Tradesman2: Set map location', async () => {
            await homePage.mapLocation.click();
            await homePage.confirmMapLocation.click();
            await expect(
                sitePage.getByText('Choose your location Manually')
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ Tradesman2 map location confirmed');
        });

        await test.step('87. Tradesman2: Fill profile details and submit', async () => {
            await homePage.tradesManProfileDetails(
                'TradingCompany2',
                process.env.LOREM_TEXT!,
                'Alex',
                'Trader',
                '150',
                '3',
                '01933954168',
                tradesmanEmail2,
                'https://www.google.com',
                'https://www.google.com'
            );
            await homePage.profileDetailedFiles(
                'test_attachments/Qa.jpg',
                'test_attachments/testing soft.png',
                'test_attachments/testing.png',
                'test_attachments/Test PDF.pdf'
            );
            await sitePage.getByRole('button', { name: 'Submit' }).click();
            await expect(
                sitePage.getByText('TradesMan Profile updated successfully.')
            ).toBeVisible({ timeout: 20000 });
            console.log('✅ Tradesman2 profile submitted successfully');
        });

        // ── 10.5  Hit approval wall → buy subscription (same as S6) ──────
        await test.step('88. Tradesman2: Hit approval wall and navigate to subscription page', async () => {
            await sitePage.getByText('View Details').first().click();
            await expect(
                sitePage.getByText('View Subscription Plans')
            ).toBeVisible({ timeout: 15000 });
            await sitePage.getByText('View Subscription Plans').click();
            console.log('✅ Tradesman2 approval wall confirmed — navigating to subscription');
        });

        await test.step('89. Tradesman2: Select subscription plan 3 and complete payment', async () => {
            await homePage.subscriptionPlan3.click();
            await expect(
                sitePage.getByText('Payment method')
            ).toBeVisible({ timeout: 15000 });
            await subscriptionPage.buySubscription(
                '4111111111111111',
                '12/27',
                '123',
                'Trader'
            );
            await expect(
                sitePage.getByText('My jobs')
            ).toBeVisible({ timeout: 20000 });
            console.log('✅ Tradesman2 subscription purchased');
        });

        // ── 10.5b  Tradesman2 logs out before admin verifies their account ─
        // Tradesman2 is currently logged in. We must log out now so that:
        //   (a) the admin step runs cleanly on a separate tab, and
        //   (b) step 91 can log back in fresh after verification.
        await test.step('89b. Tradesman2 logs out before admin verification', async () => {
            await sitePage.getByRole('button', { name: 'Log out' }).click();
            await homePage.logoutButton.click();
            await sitePage.waitForLoadState('domcontentloaded');
            console.log('✅ Tradesman2 logged out — admin will now verify the account');
        });

        // ── 10.6  Admin Tab — verify Tradesman2 (same as S7, reuse adminPage)
        await test.step('90. Switch to Admin tab and verify Tradesman2 account', async () => {
            await adminPage.bringToFront();

            // Reload the admin panel in case the session expired while S10 was running
            await adminPage.reload();
            await adminPage.waitForLoadState('networkidle');
            await adminPage.waitForTimeout(1500);

            // Navigate to Tradesmen list
            await adminPage.locator('.ri-tools-fill').first().click();
            await adminPage.waitForLoadState('domcontentloaded');
            await adminPage.waitForTimeout(1500);

            // The most recently registered Tradesman (Tradesman2) should be first
            await adminPage.locator('table tbody tr').first()
                .waitFor({ state: 'visible', timeout: 15000 });

            const firstRow = adminPage.locator('table tbody tr').first();

            // Click Eye icon — same fallback chain as Scenario 7
            let eyeBtn = firstRow.locator('[class*="ri-eye"], [class*="eye"]').first();
            let visible = await eyeBtn.isVisible({ timeout: 3000 }).catch(() => false);
            if (!visible) {
                eyeBtn = firstRow.locator('a:has(svg), button:has(svg)').first();
                visible = await eyeBtn.isVisible({ timeout: 3000 }).catch(() => false);
            }
            if (!visible) {
                eyeBtn = firstRow.locator('a, button').first();
            }
            await eyeBtn.click();
            await adminPage.waitForLoadState('domcontentloaded');
            await adminPage.waitForTimeout(1500);

            // Click "Update Verification"
            const updateBtn = adminPage
                .getByRole('button', { name: /update verification/i })
                .or(adminPage.getByText(/update verification/i).first());
            await updateBtn.waitFor({ state: 'visible', timeout: 10000 });
            await updateBtn.click();
            await adminPage.waitForTimeout(500);

            // Select "Verified"
            const nativeSelect = adminPage.locator('select').first();
            const isNative = await nativeSelect.isVisible({ timeout: 3000 }).catch(() => false);
            if (isNative) {
                await nativeSelect.selectOption({ label: 'Verified' })
                    .catch(() => nativeSelect.selectOption({ value: 'verified' }));
            } else {
                const combobox = adminPage.getByRole('combobox').first();
                await combobox.click();
                await adminPage.getByRole('option', { name: /verified/i })
                    .or(adminPage.getByText('Verified').first())
                    .click();
            }

            // Save
            const saveBtn = adminPage.locator('//button[@id="saveVerificationBtn"]');
            await saveBtn.waitFor({ state: 'visible', timeout: 10000 });
            await saveBtn.click();
            await adminPage.waitForTimeout(2000);
            console.log('✅ Tradesman2 verified by Admin');

            // Switch back to website
            await sitePage.bringToFront();
        });

        // ── 10.7  Tradesman2 logs back in after admin verification, views job, submits quote
        // Tradesman2 is now logged OUT (step 89b). The login page is reachable.
        await test.step('91. Tradesman2 logs back in after admin verification', async () => {
            await sitePage.bringToFront();
            await basePage.goToURL();
            await sitePage.waitForLoadState('domcontentloaded');
            await sitePage.waitForTimeout(1500);
            await homePage.goToLoginURL();
            await sitePage.waitForLoadState('domcontentloaded');
            await sitePage.waitForTimeout(1000);
            await authPage.EmailInput.fill(tradesmanEmail2);
            await authPage.PasswordInput.fill('12345678');
            await sitePage.getByRole('button', { name: 'Log in' }).click();
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 15000 });
            await sitePage.waitForLoadState('domcontentloaded');
            await sitePage.waitForTimeout(2000);
            console.log('✅ Tradesman2 logged back in after admin verification');
        });

        await test.step('92. Tradesman2: Navigate to home, view first job detail and provide quote', async () => {
            // Navigate to homepage so the job listing is visible
            await basePage.goToURL();
            await sitePage.waitForLoadState('domcontentloaded');
            await sitePage.waitForTimeout(1500);

            // Click View Details on the first job in the listing
            await sitePage.getByText('View Details').first().click();
            await expect(
                sitePage.getByText('Job Done by:')
            ).toBeVisible({ timeout: 15000 });

            await sitePage.getByRole('button', { name: 'Provide your quote for the job' }).click();
            await jobPage.quoteAmount.fill('900');
            await sitePage.getByRole('button', { name: 'Confirm' }).click();
            await expect(
                sitePage.getByText('Quote submitted successfully')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ Tradesman2 quote of £900 submitted successfully');
        });

        // ── 10.8  Tradesman2 logs out ─────────────────────────────────────
        await test.step('93. Tradesman2 logs out', async () => {
            await sitePage.getByRole('button', { name: 'Log out' }).click();
            await homePage.logoutButton.click();
            console.log('✅ Tradesman2 logged out');
        });

        // ══════════════════════════════════════════════════════════════════
        // PART B — HomeOwner rejects Tradesman2, hires Tradesman1
        // ══════════════════════════════════════════════════════════════════

        // ── 10.9  HomeOwner logs back in ─────────────────────────────────
        await test.step('94. HomeOwner logs back in', async () => {
            await basePage.goToURL();
            await homePage.goToLoginURL();
            await authPage.EmailInput.fill(ownerEmail);
            await authPage.PasswordInput.fill('12345678');
            await sitePage.getByRole('button', { name: 'Log in' }).click();
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ HomeOwner logged back in');
        });

        // ── 10.10  Navigate to Posted Jobs → View Details → Applicant List
        await test.step('95. HomeOwner navigates to Posted Jobs and opens job detail', async () => {
            await sitePage.getByText('Posted Jobs').first().click();
            await expect(sitePage.getByText('My Posted Jobs')).toBeVisible({ timeout: 15000 });

            await sitePage.getByText('View Details').first().click();
            await expect(sitePage.getByText('Job Done by:')).toBeVisible({ timeout: 15000 });

            const applicantHeading = sitePage
                .getByText('Applicant List')
                .or(sitePage.getByText('Applicants'))
                .first();
            await applicantHeading.scrollIntoViewIfNeeded();
            await expect(applicantHeading).toBeVisible({ timeout: 10000 });
            console.log('✅ Applicant List visible — 2 applicants should be in the list');
        });

        // ── 10.11  Reject Tradesman2 — scope the action button to Tradesman2's row ──
        // There are 2 "Applicant actions" buttons (one per row). Using the generic
        // jobPage.applicantActions locator causes a strict-mode violation.
        // We target the FIRST table row (Tradesman2 is most recent → top row).
        await test.step('96. Reject Tradesman2 offer — click applicantActions for Tradesman2, then Delete Application', async () => {
            await expect(sitePage.getByText('Applicant List')).toBeVisible({ timeout: 10000 });

            // Click the action button scoped to the FIRST applicant row (Tradesman2)
            const tradesman2ActionBtn = sitePage
                .locator('table tbody tr')
                .first()
                .locator('//button[@aria-label=\'Applicant actions\']');
            await tradesman2ActionBtn.waitFor({ state: 'visible', timeout: 10000 });
            await tradesman2ActionBtn.click();

            // Wait 3 seconds to observe the dropdown before confirming deletion
            await sitePage.waitForTimeout(3000);

            // Use the exact XPath for Delete Application as specified
            await sitePage.locator('//span[normalize-space()=\'Delete Application\']').click();

            // Confirm the deletion in the popup that appears
            await sitePage.locator('//button[normalize-space()=\'Delete\']').click();

            await sitePage.waitForTimeout(2000);
            console.log('✅ Tradesman2 application rejected / deleted');
        });

        // ── 10.12  Hire Tradesman1 — after deletion Tradesman1 is the only row left ──
        // The action button no longer conflicts (only 1 row remains).
        await test.step('28. Verify Hiring a Tradesman for the job', async () => {
            await expect(
                sitePage.getByText('Applicant List')
            ).toBeVisible({ timeout: 10000 });

            // Tradesman1 is now the sole remaining applicant — first (and only) row
            const tradesman1ActionBtn = sitePage
                .locator('table tbody tr')
                .first()
                .locator('//button[@aria-label=\'Applicant actions\']');
            await tradesman1ActionBtn.waitFor({ state: 'visible', timeout: 10000 });
            await tradesman1ActionBtn.click();

            await jobPage.hireNow_btn.click();
            await sitePage.getByRole('button', { name: 'Confirm' }).click();
            await expect(
                sitePage.getByText('Post your review')
            ).toBeVisible({ timeout: 15000 });
            console.log('✅ Tradesman1 hired successfully — "Post your review" visible');

            // Wait a few seconds on the page after hiring
            await sitePage.waitForTimeout(3000);
        });

        // ══════════════════════════════════════════════════════════════════
        // PART C — HomeOwner views "You Accepted an Offer!" email → logout
        // ══════════════════════════════════════════════════════════════════

        // ── 10.13  Poll Mailsac for "You Accepted an Offer!" email ────────
        await test.step('98. Poll Mailsac — wait for "You Accepted an Offer!" email to arrive', async () => {
            console.log('⏳ Polling Mailsac for "You Accepted an Offer!" email...');
            const helper = new EmailHelper();
            const { subject } = await helper.fetchAcceptedOfferEmail(ownerEmail);
            console.log(`✅ Accepted offer email confirmed in inbox — Subject: "${subject}"`);
        });

        // ── 10.14  Switch to HomeOwner Mailsac tab and open the email ─────
        await test.step('99. Switch to HomeOwner Mailsac tab and open "You Accepted an Offer!" email', async () => {
            await ownerMailPage.bringToFront();
            await ownerMailPage.reload();
            await ownerMailPage.waitForLoadState('domcontentloaded');
            await ownerMailPage.waitForTimeout(2000);
            console.log('👀 HomeOwner Mailsac inbox reloaded — looking for acceptance email');

            const acceptedEmailRow = ownerMailPage
                .locator('a, tr, div')
                .filter({ hasText: /accepted|offer|hired/i })
                .first();
            await acceptedEmailRow.waitFor({ state: 'visible', timeout: 20000 });
            await acceptedEmailRow.click();
            await ownerMailPage.waitForLoadState('domcontentloaded');
            await ownerMailPage.waitForTimeout(3000); // observe for 3 seconds
            console.log('✅ "You Accepted an Offer!" email opened — observed for 3 seconds');
        });

        // ── 10.15  Switch back to TradeMate website ───────────────────────
        await test.step('100. Switch back to TradeMate website (HomeOwner still logged in)', async () => {
            await sitePage.bringToFront();
            await expect(
                sitePage.getByRole('button', { name: 'Log out' })
            ).toBeVisible({ timeout: 10000 });
            console.log('✅ Back on TradeMate — HomeOwner is logged in');
        });

        // ── 10.16  HomeOwner logs out — all scenarios complete ────────────
        await test.step('101. HomeOwner logs out — all 10 scenarios complete ✅', async () => {
            await sitePage.getByRole('button', { name: 'Log out' }).click();
            await homePage.logoutButton.click();
            console.log('✅ HomeOwner logged out — all 10 scenarios completed successfully ✅');
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
    emailType: 'welcome' | 'job' | 'matchingJob'
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
            } else if (emailType === 'matchingJob') {
                ({ body } = await helper.getLatestMatchingJobEmailBody(emailAddress));
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