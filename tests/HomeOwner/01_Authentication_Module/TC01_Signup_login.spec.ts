import { test, expect } from '@playwright/test';
import { AuthPage } from '../../../src/pages/AuthPage';
import { BasePage } from '../../../src/pages/BasePage';
import { HomePage } from '../../../src/pages/HomePage';
import dotenv from 'dotenv';
dotenv.config();

test.describe.serial('HomeOwner Auth Flow', () => {
    let authPage: AuthPage;
    let basePage: BasePage;
    let homePage: HomePage;
    let email: string;

    test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
        basePage = new BasePage(page);
        homePage = new HomePage(page);

        email = basePage.generateEmail();
        await basePage.goToURL();
    });

    test('➡️ Verify that registration as a Homeowner was done successfully', async ({ page }) => {

        await test.step('Validate the create account page is visible', async () => {
            await page.getByRole('button', { name: 'Find a surrey tradesman' }).click();
            await expect(page.getByText('Create your free')).toBeVisible();
        })

        await test.step('Validate the creating a HomeOwner account', async () => {
            await authPage.AccountInformation('Tajwar', email, process.env.PHONE_NUMBER!, '12345678', '12345678');
            await authPage.CreateAccountButton.click();
            await expect(page.getByText('Enter the verification code we send you on:')).toBeVisible();
        })

        await test.step('Validate the OTP verification', async () => {
            await authPage.OTPVerification('1', '2', '3', '4');
            await page.getByText('Continue').click();
            await expect(page.getByText('Login your account')).toBeVisible();
        })

        await test.step('Verify Login with valid credentials', async () => {
            await authPage.EmailInput.fill(email);
            await authPage.PasswordInput.fill('12345678');
            await page.getByRole('button', { name: 'Log in' }).click();
            await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
            await page.waitForTimeout(5000);

            await homePage.notificationIcon.click();
            await expect(page.getByText('Notification').first()).toBeVisible();
            await homePage.TrashBin.click();
            await page.waitForTimeout(2000);
        })

    })

    test('➡️ Verify that Forgot password option was working successfully', async ({ page }) => {

        await test.step('Validate the create account page is visible', async () => {
            await page.getByRole('button', { name: 'Find a surrey tradesman' }).click();
            await expect(page.getByText('Create your free')).toBeVisible();
        })

        await test.step('Validate the creating a HomeOwner account', async () => {
            await authPage.AccountInformation('Tajwar', email, process.env.PHONE_NUMBER!, '12345678', '12345678');
            await authPage.CreateAccountButton.click();
            await expect(page.getByText('Enter the verification code we send you on:')).toBeVisible();
        })

        await test.step('Validate the OTP verification', async () => {
            await authPage.OTPVerification('1', '2', '3', '4');
            await page.getByText('Continue').click();
            await expect(page.getByText('Login your account')).toBeVisible();
        })

        await test.step('Validate the create account page is visible', async () => {
            await page.getByRole('button', { name: 'Find a surrey tradesman' }).click();
            await expect(page.getByText('Create your free')).toBeVisible();
            await authPage.LoginButton.click();
            await expect(page.getByText('Login your account')).toBeVisible();
        })

        await test.step('Validate the Forgot Password Option', async () => {
            await authPage.ForgotPassword.click();
            await expect(page.getByText('Enter your email for the verification process')).toBeVisible();
            await authPage.EmailInput.fill(email);
            await page.getByText('Continue').first().click();
        })

        await test.step('Validate the OTP verification', async () => {
            await authPage.OTPVerification('1', '2', '3', '4');
            await page.getByText('Continue').click();
            await expect(page.getByRole('heading', { name: 'Update Password' })).toBeVisible();
        })

        await test.step('Validate the Update Password', async () => {
            await page.getByPlaceholder('New password').fill('123456789');
            await page.getByPlaceholder('Confirm Password').fill('123456789');
            await page.getByRole('button', { name: 'Update Password' }).click();
            await expect(page.getByText('Successfully Updated!')).toBeVisible();
            await (page.getByText('Back to Home')).click();
            await expect(page.getByText('Join as a Tradesperson').first()).toBeVisible();
        })

    })

});



