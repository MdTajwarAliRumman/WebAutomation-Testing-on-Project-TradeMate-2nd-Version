import { test, expect } from '@playwright/test';
import { AuthPage } from '../../../src/pages/AuthPage';
import { BasePage } from '../../../src/pages/BasePage';
import { HomePage } from '../../../src/pages/HomePage';
import testData from '../../../test_data/testdata.json';
import dotenv from 'dotenv';
dotenv.config();


test.describe('Invalid Signup Flow', () => {
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

    test('➡️ Verify users could not signup with invalid credentials', async ({ page }) => {

        await test.step('Validate the create account page is visible', async () => {
            await page.getByRole('button', { name: 'Join as a Tradesperson' }).click();
            await expect(page.getByText('Create your free')).toBeVisible();
        })

        await test.step('Verify Keeping the input fields empty', async () => {
            await authPage.AccountInformation('', '', '', '', '');
            await authPage.CreateAccountButton.click();
            await expect(page.getByText('Username must be at least 3 characters long')).toBeVisible();
            await expect(page.getByText('Invalid email address')).toBeVisible();
            await expect(page.getByText('Phone number must be at least 10 characters long')).toBeVisible();
            await expect(page.getByText('Password must be at least 6 characters long').first()).toBeVisible();
        })

        await test.step('Verify signup with invalid email', async () => {
            await authPage.AccountInformation('Tajwar', 'diver4082##6abaos.com', '123456890', '12345678', '12345678');
            // await authPage.CreateAccountButton.click();
            await expect(page.getByText('Invalid email address')).toBeVisible();
        })

        await test.step('Verify signup with invalid phone number', async () => {
            await authPage.AccountInformation('Tajwar', email, '1', '12345678', '12345678');
            await authPage.CreateAccountButton.click();
            await expect(page.getByText('Phone number must be at least 10 characters long')).toBeVisible();
        })

        await test.step('Verify signup with invalid password', async () => {
            await authPage.AccountInformation('Tajwar', email, '123456890', '123', '12345678');
            // await authPage.CreateAccountButton.click();
            await expect(page.getByText('Password must be at least 6 characters long').first()).toBeVisible();
        })

        await test.step('Verify signup with invalid confirm password', async () => {
            await authPage.AccountInformation('Tajwar', email, '123456890', '12345678', '1233456789');
            // await authPage.CreateAccountButton.click();
            await expect(page.getByText("Passwords don't match")).toBeVisible();
        })

    })

    test('➡️ Verify users could not Verify their email with invalid credentials', async ({ page }) => {

        await test.step('Validate the create account page is visible', async () => {
            await page.getByRole('button', { name: 'Join as a Tradesperson' }).click();
            await expect(page.getByText('Create your free')).toBeVisible();
        })

        await test.step('Validate the creating a HomeOwner account', async () => {
            await authPage.AccountInformation('Tajwar', email, process.env.PHONE_NUMBER!, '12345678', '12345678');
            await authPage.CreateAccountButton.click();
            await expect(page.getByText('Enter the verification code we send you on:')).toBeVisible();
        })

        await test.step('Validate the OTP verification', async () => {
            await authPage.OTPVerification('1', '1', '1', '1');
            await page.getByText('Continue').click();
            await expect(page.getByText('Invalid OTP. Please try again.')).toBeVisible();
        })

    })

    test('➡️ Verify users could not Login with invalid credentials', async ({ page }) => {

        await test.step('Validate the create account page is visible', async () => {
            await page.getByRole('button', { name: 'Join as a Tradesperson' }).click();
            await expect(page.getByText('Create your free')).toBeVisible();
            await authPage.LoginButton.click();
            await expect(page.getByText('Login your account')).toBeVisible();
        })


        await test.step('Validate the Login with Blank fields', async () => {
            await authPage.EmailInput.fill('');
            await authPage.PasswordInput.fill('');
            await page.getByRole('button', { name: 'Log in' }).click();
            await expect(page.getByText('Invalid email address')).toBeVisible();
            await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
        })

        await test.step('Validate the Login with invalid email', async () => {
            await authPage.EmailInput.fill('diver4082##6abaos.com');
            await authPage.PasswordInput.fill('12345678');
            await page.getByRole('button', { name: 'Log in' }).click();
            await expect(page.getByText('Invalid email address')).toBeVisible();
        })

        await test.step('Validate the Login with invalid password', async () => {
            await authPage.EmailInput.fill(email);
            await authPage.PasswordInput.fill('123');
            await page.getByRole('button', { name: 'Log in' }).click();
            await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
        })

    })

});

