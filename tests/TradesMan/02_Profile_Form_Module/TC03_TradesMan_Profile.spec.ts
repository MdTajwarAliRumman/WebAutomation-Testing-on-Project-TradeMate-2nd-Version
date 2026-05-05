import { test, expect } from '@playwright/test';
import { AuthPage } from '../../../src/pages/AuthPage';
import { BasePage } from '../../../src/pages/BasePage';
import { HomePage } from '../../../src/pages/HomePage';
import { SubscriptionPage } from '../../../src/pages/SubscriptionPage';
import dotenv from 'dotenv';
dotenv.config();

test.describe('TradesMan Profile Form Flow', () => {
    let authPage: AuthPage;
    let basePage: BasePage;
    let homePage: HomePage;
    let subscriptionPage: SubscriptionPage;
    let email: string;

    test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
        basePage = new BasePage(page);
        homePage = new HomePage(page);
        subscriptionPage = new SubscriptionPage(page);

        email = basePage.generateEmail();
        await basePage.goToURL();
    });

    test('➡️ Validate the Tradesman Profile Form details insertion was done successfully', async ({ page }) => {

        await test.step('Validate the create account page is visible', async () => {
            await page.getByRole('button', { name: 'Join as a Tradesperson' }).click();
            await expect(page.getByText('Create your free')).toBeVisible();
        })

        await test.step('Validate the creating a Tradesman account', async () => {
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

        await test.step('Verify Job posts are being visible and clickable', async () => {
            await page.getByRole('button', { name: 'View Details' }).first().click();
        })

        await test.step('Verify selecting specific trade category', async () => {
            await page.getByRole('button', { name: 'Complete Registration' }).click();
            await expect(page.getByText('Select your trade categories')).toBeVisible();
            await homePage.plumberService.click();
        })

        await test.step('Validate inserting TradeMan Profile Information Into The Form', async () => {
            await homePage.mapLocation.click();
            await homePage.confirmMapLocation.click();
            await expect(page.getByText('Choose your location Manually')).toBeVisible();
            await homePage.tradesManProfileDetails('SoftwareTestingCompany', process.env.LOREM_TEXT!, 'Md.Tajwar', 'Ali', '100', '5', '01933954168', email, 'https://www.google.com', 'https://www.google.com');
        })

        await test.step('Validate inserting TradeMans detailed papers Into The Form', async () => {
            await homePage.profileDetailedFiles('test_attachments/Qa.jpg', 'test_attachments/testing soft.png', 'test_attachments/testing.png', 'test_attachments/Test PDF.pdf');
            await page.getByRole('button', { name: 'Submit' }).click();
            await expect(page.getByText('TradesMan Profile updated successfully.')).toBeVisible();
        })
    })


    test('➡️ Validate the Tradesman could purchase subscription package successfully and View Jobs', async ({ page }) => {

        await test.step('Validate the create account page is visible', async () => {
            await page.getByRole('button', { name: 'Join as a Tradesperson' }).click();
            await expect(page.getByText('Create your free')).toBeVisible();
        })

        await test.step('Validate the creating a Tradesman account', async () => {
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

        await test.step('Verify Job posts are being visible and clickable', async () => {
            await page.getByRole('button', { name: 'View Details' }).first().click();
        })

        await test.step('Verify selecting specific trade category', async () => {
            await page.getByRole('button', { name: 'Complete Registration' }).click();
            await expect(page.getByText('Select your trade categories')).toBeVisible();
            await homePage.plumberService.click();
        })

        await test.step('Validate inserting TradeMan Profile Information Into The Form', async () => {
            await homePage.mapLocation.click();
            await homePage.confirmMapLocation.click();
            await expect(page.getByText('Choose your location Manually')).toBeVisible();
            await homePage.tradesManProfileDetails('SoftwareTestingCompany', process.env.LOREM_TEXT!, 'Md.Tajwar', 'Ali', '3', '5', '01933954168', email, 'https://www.google.com', 'https://www.google.com');
        })

        await test.step('Validate inserting TradeMans detailed papers Into The Form', async () => {
            await homePage.profileDetailedFiles('test_attachments/Qa.jpg', 'test_attachments/testing soft.png', 'test_attachments/testing.png', 'test_attachments/Test PDF.pdf');
            await page.getByRole('button', { name: 'Submit' }).click();
            await expect(page.getByText('TradesMan Profile updated successfully.')).toBeVisible();
        })

        await test.step('Verify purchasing subscription plan', async () => {
            await homePage.subscriptionPlan3.click();
            await expect(page.getByText('Payment method')).toBeVisible();
            await subscriptionPage.buySubscription('4111111111111111', '12/27', '123', 'Tajwar');
            await expect(page.getByText('My jobs')).toBeVisible();
        })

        await test.step('Verify that Tradesman can view job details after purchasing subscription plan and registration', async () => {
            // await (page.getByText('View Details')).scrollIntoViewIfNeeded();
            await (page.getByText('View Details')).first().click();
            await expect(page.getByText('Job Done by:')).toBeVisible();
        })
    })


});



