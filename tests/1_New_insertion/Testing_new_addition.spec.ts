import { test, expect } from '@playwright/test';
import { AuthPage } from '../../src/pages/AuthPage';
import { BasePage } from '../../src/pages/BasePage';
import { HomePage } from '../../src/pages/HomePage';
import dotenv from 'dotenv';
dotenv.config();

test.describe.serial('Testing New Addition for Homeowner', () => {
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
        })

    })


});



