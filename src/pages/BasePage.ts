import { Locator, Page } from "@playwright/test";

export class BasePage {
    // < ---------  initialize all the pages --------->
    readonly page: Page;
    // readonly SignUpButton: Locator;


    constructor(page: Page) {
        this.page = page

        // <-------- Elements -------->
        // this.SignUpButton = page.locator("#")

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


