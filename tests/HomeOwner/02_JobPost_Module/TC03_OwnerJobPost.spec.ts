import { test, expect } from '@playwright/test';
import { AuthPage } from '../../../src/pages/AuthPage';
import { BasePage } from '../../../src/pages/BasePage';
import { HomePage } from '../../../src/pages/HomePage';
import dotenv from 'dotenv';
dotenv.config();

test.describe('Job Post Flow', () => {
    let authPage: AuthPage;
    let basePage: BasePage;
    let homePage: HomePage;

    test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
        basePage = new BasePage(page);
        homePage = new HomePage(page);

        await homePage.goToLoginURL();
        await homePage.homeOwnerLogin();

    });


    test('➡️ Validate that Job Post as a Homeowner was done successfully', async ({ page }) => {

        await test.step('Verify all the services are visible', async () => {
            await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
            await homePage.specificService.scrollIntoViewIfNeeded();
            await expect(page.getByText('Select the job or trade you require')).toBeVisible();
        })

        await test.step('Verify clicking on specific service and entering details', async () => {
            await homePage.plumberService.click();
            await expect(page.getByText('Enter the job location')).toBeVisible();
            await homePage.mapLocation.click();
            await homePage.confirmMapLocation.click();
            await expect(page.getByText('Choose your location Manually')).toBeVisible();
            await homePage.continueButton.click();
        })

        await test.step('Verify filling up the title and job description with valid details', async () => {
            await expect(page.getByText('Give your job a title')).toBeVisible();
            await page.getByPlaceholder('Write headline here').fill('Hiring SQA Engineer');
            await page.getByPlaceholder('Minimum of 50 characters needs entering as min description to proceed').fill(`${process.env.LOREM_TEXT}`);
            await homePage.continueButton.click();
        })

        await test.step('Verify Selecting the job timeframe', async () => {
            await expect(page.getByText('What timeframe do you need the job completed by?')).toBeVisible();
            await homePage.jobTimeFrame.click();
            await homePage.continueButton.click();
        })

        await test.step('Verify inserting details into What type of work is needed field', async () => {
            await homePage.requiredWork2.click();
            await homePage.continueButton.click();
        })

        await test.step('Verify inserting image files into the job post', async () => {
            await page.setInputFiles('input[type="file"]', 'test_attachments/Qa.jpg');
            await page.getByText('Continue').click();

        })

        await test.step('Verify inserting video files into the job post', async () => {
            await expect(page.getByText('Upload Video')).toBeVisible();
            await page.locator('input[type="file"][name="videos"]').setInputFiles('test_attachments/testVideo.mp4'); // video file
            await page.getByText('Continue').click();
            await page.waitForTimeout(5000);

            await expect(page.getByText('Job Done By')).toBeVisible();
            await homePage.jobSubmitButton.click();
            await expect(page.getByText('Job Posted Successfully')).toBeVisible();
        });
    })


    test('➡️ Validate Displaying a newly posted job and details', async ({ page }) => {

        await test.step('Verify that authorized users are able to login', async () => {
            await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
        })

        await test.step('Verify dsiplaying the newly posted jobs', async () => {
            await page.getByText('Posted Jobs').first().click();
            await expect(page.getByText('My Posted Jobs')).toBeVisible();
        })

        await test.step('Verify dsiplaying the Details of the newly posted job', async () => {
            await page.getByText('View Details').first().click();
            await expect(page.getByText('Job Done by:')).toBeVisible();
        })

    })

    test('➡️ Validate updating a newly posted job details', async ({ page }) => {

        await test.step('Verify that authorized users are able to login', async () => {
            await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
        })

        await test.step('Verify dsiplaying the newly posted jobs', async () => {
            await page.getByText('Posted Jobs').first().click();
            await expect(page.getByText('My Posted Jobs')).toBeVisible();
        })

        await test.step('Verify clicking on the Edit option for the job post', async () => {
            await page.getByText('Edit').first().click();
            await expect(page.getByText('Edit Your Job Post')).toBeVisible();
        })

        await test.step('Validate Editing fields for the job post', async () => {
            await page.getByText('Within 1-2 weeks').first().click();
            await homePage.requiredWork1.click();
            await page.getByPlaceholder('Write headline here').fill('Hiring Plumbing Engineer');
            await homePage.jobSubmitButton.click();
            await expect(page.getByText('Job Updated Successfully')).toBeVisible();
        })

    })


});



