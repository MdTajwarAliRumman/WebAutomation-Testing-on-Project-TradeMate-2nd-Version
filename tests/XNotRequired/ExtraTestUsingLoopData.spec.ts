// // ============================================Looping through test data=====================================================


// import { test, expect } from '@playwright/test';
// import { AuthPage } from '../src/pages/AuthPage';
// import { BasePage } from '../src/pages/BasePage';
// import { HomePage } from '../src/pages/HomePage';
// import testData from '../test_data/testdata.json';
// import dotenv from 'dotenv';
// dotenv.config();

// // ✅ Flexible type
// type TestData = {
//     [key: string]: {
//         name: string;
//         email: string;
//         phone: string;
//         password: string;
//         confirmPassword: string;
//         expectedErrors: string[];
//     };
// };

// test.describe('Signup Flow', () => {
//     let authPage: AuthPage;
//     let basePage: BasePage;
//     let homePage: HomePage;

//     test.beforeEach(async ({ page }) => {
//         authPage = new AuthPage(page);
//         basePage = new BasePage(page);
//         homePage = new HomePage(page);

//         await basePage.goToURL();

//         await page.getByRole('button', { name: 'Find a surrey tradesman' }).click();
//         await expect(page.getByText('Create your freepersonal account')).toBeVisible();
//     });

//     const typedData = testData as unknown as TestData;

//     // ✅ Loop through all scenarios
//     for (const scenario in typedData) {
//         const data = typedData[scenario];

//         test(`🏷️ ${scenario}`, async ({ page }) => {

//             // ✅ Handle dynamic email if needed
//             const email =
//                 data.email === 'dynamic'
//                     ? basePage.generateEmail()
//                     : data.email;

//             await authPage.AccountInformation(
//                 data.name,
//                 email,
//                 data.phone,
//                 data.password,
//                 data.confirmPassword
//             );

//             await authPage.CreateAccountButton.click();

//             // ✅ Validate all expected errors
//             for (const error of data.expectedErrors) {
//                 await expect(page.getByText(error).first()).toBeVisible();
//             }
//         });
//     }
// });