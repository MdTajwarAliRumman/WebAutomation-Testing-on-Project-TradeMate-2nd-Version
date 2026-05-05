import { test, expect } from '@playwright/test';
import { AuthPage } from '../../../src/pages/AuthPage';
import { BasePage } from '../../../src/pages/BasePage';
import { HomePage } from '../../../src/pages/HomePage';
import { JobPage } from '../../../src/pages/JobPage';
import dotenv from 'dotenv';
dotenv.config();

test.describe('Job Apply Flow', () => {
    let authPage: AuthPage;
    let basePage: BasePage;
    let homePage: HomePage;
    let jobPage: JobPage;
    let email: string;

    test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
        basePage = new BasePage(page);
        homePage = new HomePage(page);
        jobPage = new JobPage(page);

        await homePage.goToLoginURL();
    });

    //HomeOwner
    test('➡️ Validate that Job Post as a Homeowner was done successfully', async ({ page }) => {
        await homePage.homeOwnerLogin();

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
            await page.waitForTimeout(3000);

            await expect(page.getByText('Job Done By')).toBeVisible();
            await homePage.jobSubmitButton.click();
            await expect(page.getByText('Job Posted Successfully')).toBeVisible();
        });
    })

    // TradesMan
    test('➡️ Validate the Tradesman could apply for a job successfully', async ({ page }) => {
        await homePage.tradesManLogin();

        await test.step('Verify viewing a job post', async () => {
            await (page.getByText('View Details').first()).click();
            await expect(page.getByText('Job Done by:')).toBeVisible();
        })

        await test.step('Verify providing a quote for the job', async () => {
            await page.getByRole('button', { name: 'Provide your quote for the job' }).click();
            await jobPage.quoteAmount.fill('1000');
            await page.getByRole('button', { name: 'Confirm' }).click();
            await expect(page.getByText('Quote submitted successfully')).toBeVisible();
        })

    })

    //HomeOwner
    test('➡️ Verify if the HomeOwner could see the job post applications', async ({ page }) => {
        await homePage.homeOwnerLogin();
        await page.waitForTimeout(5000);
        await test.step('Verify dsiplaying the newly posted jobs', async () => {
            await page.getByText('Posted Jobs').first().click();
            await expect(page.getByText('My Posted Jobs')).toBeVisible();
        })

        await test.step('Verify dsiplaying the Details of the newly posted job', async () => {
            await page.getByText('View Details').first().click();
            await expect(page.getByText('Job Done by:')).toBeVisible();
        })

        await test.step('Verify dsiplaying the Job Applications list', async () => {
            await expect(page.getByText('Applicant List')).toBeVisible();
            await jobPage.applicantActions.click();
            await jobPage.profileView_btn.click();
            await expect(page.getByText('Reviews and Ratings')).toBeVisible();
        })

        // await test.step('Verify Hiring a Tradesman for the job', async () => {
        //     await expect(page.getByText('Applicant List')).toBeVisible();
        //     await jobPage.applicantActions.click();
        //     await jobPage.hireNow_btn.click();
        //     await page.getByRole('button', { name: 'Confirm' }).click();
        //     await expect(page.getByText('Post your review')).toBeVisible();
        //     homePage.logout();
        // })

        await test.step('Verify Hiring a Tradesman for the job', async () => {
            await jobPage.hireNow_btn.click();
            await expect(page.getByText('Hire this tradesperson?')).toBeVisible();
            await page.getByRole('button', { name: 'Confirm' }).click();
            await expect(page.getByText('Post your review')).toBeVisible();
        })

    })

    // TradesMan
    test('➡️ Validate that the Tradesman could View the jobs in progress and for which he is hired', async ({ page }) => {
        await homePage.tradesManLogin();
        await page.waitForTimeout(5000);

        await test.step('Verify viewing a job post', async () => {
            await (page.getByText('Job Board').first()).click();
            await jobPage.inProgressJobs.click();
            await expect(page.getByText('View Details').first()).toBeVisible();
        })

        await test.step('Verify Observing the details of the job', async () => {
            await page.getByText('View Details').first().click();
            await expect(page.getByText('This job is in progress').first()).toBeVisible();
        })

    })

    //HomeOwner
    test('➡️ Validate service completion by the Tradesman and mark the job as completed by the HomeOwner', async ({ page }) => {
        await homePage.homeOwnerLogin();
        await page.waitForTimeout(7000);

        await test.step('Verify viewing a job post', async () => {
            await page.getByText('Posted Jobs').first().click();
            await expect(page.getByText('My Posted Jobs')).toBeVisible();
            await page.getByText('Jobs In Progress').first().click();
            await page.getByText('View Details').first().click();
        })

        await test.step('Verify Reviewing and Rating the Tradesman', async () => {
            await jobPage.starRating.click();
            await jobPage.writeReview.fill(process.env.LOREM_TEXT!);
            await page.getByText('Post your review').click();
            await jobPage.markAsDone.click();
            await page.getByRole('button', { name: 'Continue' }).click();
            await expect(page.getByText('Mark As Done completed successfully.')).toBeVisible();
        })


        // if (await page.getByText('View Details').isVisible()) {
        //     await page.getByText('View Details').first().click();
        //     await jobPage.markAsDone.click();
        //     await page.getByRole('button', { name: 'Confirm' }).click();
        //     await expect(page.getByText('Mark As Done completed successfully.')).toBeVisible();
        // }

        // else {
        //     await expect(page.getByText('No jobs found')).toBeVisible();
        // }

    })


});



