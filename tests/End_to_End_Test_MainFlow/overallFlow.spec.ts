import { test, expect } from '@playwright/test';
import { AuthPage } from '../../src/pages/AuthPage';
import { BasePage } from '../../src/pages/BasePage';
import { HomePage } from '../../src/pages/HomePage';
import { JobPage } from '../../src/pages/JobPage';
import { SubscriptionPage } from '../../src/pages/SubscriptionPage';
import dotenv from 'dotenv';
dotenv.config();

test.describe('End-to-End Test', () => {
    let authPage: AuthPage;
    let basePage: BasePage;
    let homePage: HomePage;
    let jobPage: JobPage;
    let subscriptionPage: SubscriptionPage;
    let ownerEmail: string;
    let tradesmanEmail: string;

    test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
        basePage = new BasePage(page);
        homePage = new HomePage(page);
        jobPage = new JobPage(page);
        subscriptionPage = new SubscriptionPage(page);

        ownerEmail = homePage.OwnerEmail();
        tradesmanEmail = homePage.TradesmanEmail();
    });

    // ============================================HomeOwner=====================================================

    test('➡️ Validate the HomeOwner registration and Login was done successfully', async ({ page }) => {
        await basePage.goToURL();

        await test.step('1. Validate the create account page is visible', async () => {
            await page.getByRole('button', { name: 'Find a surrey tradesman' }).click();
            await expect(page.getByText('Create your free')).toBeVisible();
        })

        await test.step('2. Validate the creating a HomeOwner account', async () => {
            await authPage.AccountInformation('Tajwar', ownerEmail, process.env.PHONE_NUMBER!, '12345678', '12345678');
            await authPage.CreateAccountButton.click();
            await expect(page.getByText('Enter the verification code we send you on:')).toBeVisible();
        })

        await test.step('3. Validate the OTP verification', async () => {
            await authPage.OTPVerification('1', '2', '3', '4');
            await page.getByText('Continue').click();
            await expect(page.getByText('Login your account')).toBeVisible();
        })

        await test.step('4. Verify Login with valid credentials', async () => {
            await authPage.EmailInput.fill(ownerEmail);
            await authPage.PasswordInput.fill('12345678');
            await page.getByRole('button', { name: 'Log in' }).click();
            await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

        })
    });
    // ============================================HomeOwner Post Job=====================================================

    test('➡️ Validate the HomeOwner post a job was done successfully', async ({ page }) => {
        await homePage.goToLoginURL();

        await test.step('4. Verify Login with valid credentials', async () => {
            await authPage.EmailInput.fill(ownerEmail);
            await authPage.PasswordInput.fill('12345678');
            await page.getByRole('button', { name: 'Log in' }).click();
            await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

        })
        await test.step('5. Verify all the services are visible', async () => {
            await homePage.specificService.scrollIntoViewIfNeeded();
            await expect(page.getByText('Select the job or trade you require')).toBeVisible();
        })

        await test.step('6. Verify clicking on specific service and entering details', async () => {
            await homePage.plumberService.click();
            await expect(page.getByText('Enter the job location')).toBeVisible();
            await homePage.mapLocation.click();
            await homePage.confirmMapLocation.click();
            await expect(page.getByText('Choose your location Manually')).toBeVisible();
            await homePage.continueButton.click();
        })

        await test.step('7. Verify filling up the title and job description with valid details', async () => {
            await expect(page.getByText('Give your job a title').first()).toBeVisible();
            await page.getByPlaceholder('Write headline here').fill('Hiring A Plumber');
            await page.getByPlaceholder('Minimum of 50 characters needs entering as min description to proceed').fill(`${process.env.LOREM_TEXT}`);
            await homePage.continueButton.click();
        })

        await test.step('8. Verify Selecting the job timeframe', async () => {
            await expect(page.getByText('What timeframe do you need the job completed by?')).toBeVisible();
            await homePage.jobTimeFrame.click();
            await homePage.continueButton.click();
        })

        await test.step('9. Verify inserting details into What type of work is needed field', async () => {
            await homePage.requiredWork2.click();
            await homePage.continueButton.click();
        })

        await test.step('10. Verify inserting image files into the job post', async () => {
            await page.setInputFiles('input[type="file"]', 'test_attachments/Qa.jpg');
            await page.getByText('Continue').click();

        })

        await test.step('11. Verify inserting video files into the job post', async () => {
            await expect(page.getByText('Upload Video')).toBeVisible();
            await page.locator('input[type="file"][name="videos"]').setInputFiles('test_attachments/testVideo.mp4'); // video file
            await page.getByText('Continue').click();

            await expect(page.getByText('Job Done By')).toBeVisible();
            await homePage.jobSubmitButton.click();
            await expect(page.getByText('Job Posted Successfully')).toBeVisible();
        });

    });


    //     // ============================================HomeOwner Show Job Details=====================================================
    test('➡️ Validate observing the job post', async ({ page }) => {
        await test.step('12. Verify that authorized users are able to login', async () => {
            await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
        })

        await test.step('13. Verify dsiplaying the newly posted jobs', async () => {
            await page.getByText('Posted Jobs').first().click();
            await expect(page.getByText('My Posted Jobs')).toBeVisible();
        })

        await test.step('14. Verify dsiplaying the Details of the newly posted job', async () => {
            await page.getByText('View Details').first().click();
            await expect(page.getByText('Job Done by:')).toBeVisible();
            await page.getByRole('button', { name: 'Log out' }).click();
            await homePage.logoutButton.click();
        })
    });


    //     // ============================================Tradesman Signup=====================================================

    test('➡️ Validate the Tradesman Signup was done successfully', async ({ page }) => {
        await test.step('15. Validate the create account page is visible', async () => {
            await page.getByRole('button', { name: 'Join as a Tradesperson' }).click();
            await expect(page.getByText('Create your free')).toBeVisible();
        })

        await test.step('16. Validate the creating a HomeOwner account', async () => {
            await authPage.AccountInformation('NewTradePerson', tradesmanEmail, process.env.PHONE_NUMBER!, '12345678', '12345678');
            await authPage.CreateAccountButton.click();
            await expect(page.getByText('Enter the verification code we send you on:')).toBeVisible();
        })

        await test.step('17. Validate the OTP verification', async () => {
            await authPage.OTPVerification('1', '2', '3', '4');
            await page.getByText('Continue').click();
            await expect(page.getByText('Login your account')).toBeVisible();
        })

        await test.step('18. Verify Login with valid credentials', async () => {
            await authPage.EmailInput.fill(tradesmanEmail);
            await authPage.PasswordInput.fill('12345678');
            await page.getByRole('button', { name: 'Log in' }).click();
        })

        await test.step('19. Verify Job posts are being visible and clickable', async () => {
            await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
            await page.getByRole('button', { name: 'View Details' }).first().click();
        })
    });


    //     // ============================================Tradesman Update Profile=====================================================

    test('➡️ Validate the Tradesman Profile Updated was done successfully', async ({ page }) => {
        await test.step('20. Verify selecting specific trade category', async () => {
            await page.getByRole('button', { name: 'Complete Registration' }).click();
            await expect(page.getByText('Select your trade categories')).toBeVisible();
            await homePage.plumberService.click();
        })

        await test.step('21. Validate inserting TradeMan Profile Information Into The Form', async () => {
            await homePage.mapLocation.click();
            await homePage.confirmMapLocation.click();
            await expect(page.getByText('Choose your location Manually')).toBeVisible();
            await homePage.tradesManProfileDetails('SoftwareTestingCompany', process.env.LOREM_TEXT!, 'Milo', 'TradeGuy', '100', '5', '01933954168', tradesmanEmail, 'https://www.google.com', 'https://www.google.com');
        })

        await test.step('22. Validate inserting TradeMans detailed papers Into The Form', async () => {
            await homePage.profileDetailedFiles('test_attachments/Qa.jpg', 'test_attachments/testing soft.png', 'test_attachments/testing.png', 'test_attachments/Test PDF.pdf');
            await page.getByRole('button', { name: 'Submit' }).click();
            await expect(page.getByText('TradesMan Profile updated successfully.')).toBeVisible();
        })

    });


    //     // ============================================Tradesman Subscription=====================================================
    test('➡️ Validate the Tradesman Subscription was done successfully', async ({ page }) => {
        await test.step('23. Verify purchasing subscription plan', async () => {
            await homePage.subscriptionPlan3.click();
            await expect(page.getByText('Payment method')).toBeVisible();
            await subscriptionPage.buySubscription('4111111111111111', '12/27', '123', 'Tajwar');
            await expect(page.getByText('My jobs')).toBeVisible();
        })

        await test.step('24. Verify that Tradesman can view job details after purchasing subscription plan and registration', async () => {
            await (page.getByText('View Details')).first().click();
            await expect(page.getByText('Job Done by:')).toBeVisible();
        })

        // ============================================Tradesman Job Apply=====================================================

        await test.step('25. Verify providing a quote for the job', async () => {
            await page.getByRole('button', { name: 'Provide your quote for the job' }).click();
            await jobPage.quoteAmount.fill('1000');
            await page.getByRole('button', { name: 'Confirm' }).click();
            await expect(page.getByText('Quote submitted successfully')).toBeVisible();
            homePage.logout();
        })
    });


    //     // ============================================HomeOwner Login=====================================================
    test('➡️ Validate hiring new tradesman was done successfully', async ({ page }) => {
        await homePage.E2EOwnerLogin(ownerEmail);

        await test.step('26. Verify dsiplaying the newly posted jobs', async () => {
            await page.getByText('Posted Jobs').first().click();
            await expect(page.getByText('My Posted Jobs')).toBeVisible();
        })

        await test.step('27. Verify dsiplaying the Details of the newly posted job', async () => {
            await page.getByText('View Details').first().click();
            await expect(page.getByText('Job Done by:')).toBeVisible();
        })

        await test.step('28. Verify Hiring a Tradesman for the job', async () => {
            await expect(page.getByText('Applicant List')).toBeVisible();
            await jobPage.applicantActions.click();
            await jobPage.hireNow_btn.click();
            await page.getByRole('button', { name: 'Confirm' }).click();
            await expect(page.getByText('Post your review')).toBeVisible();
            homePage.logout();
        })
    });


    //     // ============================================Tradesman Login=====================================================
    test('➡️ Validate Tradesman viewing a job post was done successfully', async ({ page }) => {
        await homePage.E2ETradesManLogin(tradesmanEmail);

        await test.step('29. Verify viewing a job post', async () => {
            await (page.getByText('Job Board').first()).click();
            await jobPage.inProgressJobs.click();
            await expect(page.getByText('View Details')).toBeVisible();
        })

        await test.step('30. Verify Observing the details of the job', async () => {
            await page.getByText('View Details').click();
            await expect(page.getByText('This job is in progress')).toBeVisible();
            await homePage.logout();
        })
    });


    //     // ============================================HomeOwner Mark Job Done=====================================================
    test('➡️ Validate Owner confirming job completion was done successfully', async ({ page }) => {
        await homePage.E2EOwnerLogin(ownerEmail);

        await test.step('31. Verify viewing a job post', async () => {
            await page.getByText('Posted Jobs').first().click();
            await expect(page.getByText('My Posted Jobs')).toBeVisible();
            await page.getByText('Jobs In Progress').first().click();
            await page.getByText('View Details').first().click();
        })

        await test.step('32. Verify Reviewing and Rating the Tradesman', async () => {
            await jobPage.starRating.click();
            await jobPage.writeReview.fill(process.env.LOREM_TEXT!);
            await page.getByText('Post your review').click();
            await expect(page.getByText('Review created successfully')).toBeVisible();
            await jobPage.markAsDone.click();
            await page.getByRole('button', { name: 'Continue' }).click();
            await expect(page.getByText('Mark As Done completed successfully.')).toBeVisible();
            await homePage.logout();
        })

        // await test.step('Verify viewing a job post', async () => {
        //     await page.getByText('Posted Jobs').first().click();
        //     await expect(page.getByText('My Posted Jobs')).toBeVisible();
        //     await page.getByText('Jobs In Progress').first().click();
        // })

        // await test.step('Verify Mark as Done option', async () => {
        //     if (await page.getByText('View Details').isVisible()) {
        //         await page.getByText('View Details').first().click();
        //         await jobPage.markAsDone.click();
        //         await page.getByRole('button', { name: 'Continue' }).click();
        //         await expect(page.getByText('Mark As Done completed successfully.')).toBeVisible();
        //     }

        //     else {
        //         await expect(page.getByText('No jobs found')).toBeVisible();
        //     }
        //     await homePage.logout();
        // })
    });



    //     // ============================================Tradesman Review=====================================================
    test('➡️ Validate Tradesman reviews the completed job', async ({ page }) => {
        await homePage.E2ETradesManLogin(tradesmanEmail);

        await test.step('33. Verify Tradesman Can View Completed job post', async () => {
            await (page.getByText('Job Board').first()).click();
            await (page.getByText('Completed Jobs').first()).click();
            await expect(page.getByText('Completed on')).toBeVisible();
        })

        await test.step('Validate Logout From the whole process', async () => {
            await homePage.logout();
        })
    });



});


