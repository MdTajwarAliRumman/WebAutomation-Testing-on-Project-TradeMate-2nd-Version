import { Locator, Page } from "@playwright/test";

export class SubscriptionPage {
    // < ---------  initialize all the pages --------->
    readonly page: Page;
    readonly cardNumber: Locator;
    readonly cardName: Locator;
    readonly cardExpiry: Locator;
    readonly cardCVC: Locator;
    readonly payButton: Locator;


    constructor(page: Page) {
        this.page = page

        // <-------- Elements -------->
        this.cardNumber = page.locator("//input[@id='cardNumber']");
        this.cardExpiry = page.locator("//input[@id='cardExpiry']");
        this.cardCVC = page.locator("//input[@id='cardCvc']");
        this.cardName = page.locator("//input[@id='billingName']");
        this.payButton = page.locator("//div[@class='SubmitButton-IconContainer']");

    }

    // <-------- Methods -------->
    // async goToURL() {
    //     await this.page.goto(`${process.env.WEBSITE_URL}`);
    // }

    async buySubscription(cardNumber: string, cardExpiry: string, cardCVC: string, cardName: string) {
        await this.cardNumber.fill(cardNumber);
        await this.cardExpiry.fill(cardExpiry);
        await this.cardCVC.fill(cardCVC);
        await this.cardName.fill(cardName);
        await this.payButton.click();
    }

}


