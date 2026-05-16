import { Locator, Page } from "@playwright/test";

export class BasePage {
    // < ---------  initialize all the pages --------->
    readonly page: Page;
    readonly adminTradePerson: Locator;
    readonly updateVerification: Locator;
    readonly statusDropdown: Locator;
    readonly saveChangesButton: Locator;
    readonly headerAvatar: Locator;


    constructor(page: Page) {
        this.page = page

        // <-------- Elements -------->
        this.adminTradePerson = page.locator("//span[@data-key='t-tradesmen']")
        this.updateVerification = page.locator("//button[normalize-space()='Update Verification']")
        this.statusDropdown = page.locator("//select[@name='status']");
        this.headerAvatar = page.locator("//span[@class='d-none d-xl-block ms-1 fs-sm user-name-sub-text']");
        this.saveChangesButton = page.locator("//button[@id='saveVerificationBtn']");

    }

    // <-------- Methods -------->
    async goToURL() {
        await this.page.goto(`${process.env.WEBSITE_URL}`);
    }

    generateEmail() {
        return `user_${Date.now().toString(36)}@testmail.com`;
    }

    // async dynamicEmail() {
    //     await this.EmailInput.fill(email);

    // }



}


