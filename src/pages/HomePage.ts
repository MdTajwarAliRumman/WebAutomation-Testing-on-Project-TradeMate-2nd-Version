import { Locator, Page } from "@playwright/test";
import dotenv from 'dotenv';
dotenv.config();

export class HomePage {
    // < ---------  initialize all the pages --------->
    readonly page: Page;
    readonly joinAsTradesMate: Locator;
    readonly EmailInput: Locator;
    readonly PasswordInput: Locator;
    readonly specificService: Locator;
    readonly plumberService: Locator;
    readonly gardenService: Locator;
    readonly ElectricianService: Locator;
    readonly continueButton: Locator;
    readonly mapLocation: Locator;
    readonly confirmMapLocation: Locator;
    readonly jobTimeFrame: Locator;
    readonly requiredWork2: Locator;
    readonly requiredWork1: Locator;
    readonly jobSubmitButton: Locator;

    readonly companyName: Locator;
    readonly subscriptionPlan3: Locator;
    readonly subscriptionPlan4: Locator;
    readonly firstName: Locator;
    readonly lastName: Locator;
    readonly yearOfExp: Locator;
    readonly perDayRate: Locator;
    readonly tradeManEmail: Locator;
    readonly checkTradeLink: Locator;
    readonly trustTraderLink: Locator;
    readonly tradeLicense: Locator;
    readonly businessInsurances: Locator;
    readonly passportDrivingLicence: Locator;
    readonly certification: Locator;
    readonly description: Locator;
    readonly phoneNumber: Locator;
    readonly pagination: Locator;

    readonly logoutButton: Locator;
    readonly profileIcon: Locator;
    readonly profileUser: Locator;

    constructor(page: Page) {
        this.page = page

        // <-------- Elements Form the Home Owner Side -------->
        this.joinAsTradesMate = page.locator("//div[@class='hidden lg:flex items-center gap-2 xl:gap-3']")
        this.EmailInput = page.locator("//input[@name='email']")
        this.PasswordInput = page.locator("//input[@name='password']")

        this.specificService = page.locator("//h2[normalize-space()='Select the job or trade you require']")
        this.plumberService = page.locator("//img[@alt='Plumber']")
        this.gardenService = page.locator("//img[@alt='Landscape gardener']")
        this.ElectricianService = page.locator("//img[@alt='Electrician']")
        this.continueButton = page.locator("//button[normalize-space()='Continue']")

        this.mapLocation = page.locator("//button[normalize-space()='Choose your location Manually']")
        this.confirmMapLocation = page.locator("//button[normalize-space()='Confirm Location']")

        this.jobTimeFrame = page.locator("//body//main//form//button[2]")
        this.requiredWork2 = page.locator("//div[@id='job-service']//button[3]//div[1]")
        this.requiredWork1 = page.locator("//div[@id='job-service']//button[1]")

        this.jobSubmitButton = page.locator("//button[normalize-space()='Submit']")

        // <-------- Elements Form the Trade Mate Side -------->
        this.companyName = page.locator("//input[@id='_r_k_-form-item']")
        this.description = page.locator("//div[@id='text-editor']")
        this.firstName = page.getByPlaceholder('First Name')
        this.lastName = page.getByPlaceholder('Last Name')
        this.yearOfExp = page.getByPlaceholder('Type your per day rate')
        this.perDayRate = page.getByPlaceholder('Type your years of experience')
        this.phoneNumber = page.getByPlaceholder('Phone Number')
        this.tradeManEmail = page.getByPlaceholder('Email')

        this.checkTradeLink = page.getByPlaceholder('Type your checkatrade profile link')
        this.trustTraderLink = page.getByPlaceholder('Type your trustatrader profile link')
        this.subscriptionPlan3 = page.locator("(//button[normalize-space()='Upgrade now'])[3]")
        this.subscriptionPlan4 = page.locator("(//button[normalize-space()='Upgrade now'])[4]")

        this.tradeLicense = page.locator("input[type='file'][name='trade_license']")
        this.businessInsurances = page.locator("input[type='file'][name='business_insurances']")
        this.passportDrivingLicence = page.locator("input[type='file'][name='passport_driving_licence']")
        this.certification = page.locator("input[type='file'][name='certification']")
        this.pagination = page.locator("//button[normalize-space()='01']")

        this.logoutButton = page.locator("//button[normalize-space()='Log Out']")

        this.profileIcon = page.locator('#user-avatar-trigger')
        this.profileUser = page.locator("//span[normalize-space()='Profile']")
    }

    // <-------- Methods -------->
    async goToLoginURL() {
        await this.page.goto(`https://trademate-next-js.vercel.app/sign-in`);
    }

    async goToProfileURL() {
        await this.page.goto(`https://trademate-next-js.vercel.app/homeowner/profile`);
    }

    async goToAdminLoginURL() {
        await this.page.goto(`https://jbtrade.thesyndicates.team/`);
    }

    async homeOwnerLogin() {
        await this.EmailInput.fill(process.env.HOME_OWNER_EMAIL!);
        await this.PasswordInput.fill('12345678');
        await this.page.getByRole('button', { name: 'Log in' }).click();
    }

    async tradesManLogin() {
        await this.EmailInput.fill(process.env.TRADES_MAN_EMAIL!);
        await this.PasswordInput.fill('12345678');
        await this.page.getByRole('button', { name: 'Log in' }).click();
    }

    async tradesManProfileDetails(companyName: string, description: string, firstName: string, lastName: string, perDayRate: string, yearOfExp: string, phoneNumber: string, tradeManEmail: string, checkTradeLink: string, trustTraderLink: string) {
        await this.page.getByPlaceholder('Company name').fill(companyName);
        await this.description.fill(description);
        await this.firstName.fill(firstName);
        await this.lastName.fill(lastName);
        await this.perDayRate.fill(perDayRate);
        await this.yearOfExp.fill(yearOfExp);
        await this.phoneNumber.fill(phoneNumber);
        await this.tradeManEmail.fill(tradeManEmail);
        await this.checkTradeLink.fill(checkTradeLink);
        await this.trustTraderLink.fill(trustTraderLink);
    }

    async profileDetailedFiles(tradeLicense: string, businessInsurances: string, passportDrivingLicence: string, certification: string) {
        await this.tradeLicense.setInputFiles(tradeLicense);
        await this.businessInsurances.setInputFiles(businessInsurances);
        await this.passportDrivingLicence.setInputFiles(passportDrivingLicence);
        await this.certification.setInputFiles(certification);
    }

    // <-------- E2E Login Methods -------->


    OwnerEmail() {
        return `HomeOwner_${Date.now().toString(36)}@testemail.com`;
    }

    TradesmanEmail() {
        return `TradeMan_${Date.now().toString(34)}@testemail.com`;
    }

    async E2EOwnerLogin(email: string) {
        await this.EmailInput.fill(email);
        await this.PasswordInput.fill('12345678');
        await this.page.getByRole('button', { name: 'Log in' }).click();
    }

    async E2ETradesManLogin(email: string) {
        await this.EmailInput.fill(email);
        await this.PasswordInput.fill('12345678');
        await this.page.getByRole('button', { name: 'Log in' }).click();
    }

    async tradesManLogin2nd() {
        await this.EmailInput.fill(process.env.TRADES_MAN_EMAIL2!);
        await this.PasswordInput.fill('12345678');
        await this.page.getByRole('button', { name: 'Log in' }).click();
    }

    async logout() {
        await this.page.getByRole('button', { name: 'Log out' }).click();
        await this.logoutButton.click();
    }

}



