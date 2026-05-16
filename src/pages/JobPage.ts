import { Locator, Page } from "@playwright/test";

export class JobPage {
    // < ---------  initialize all the pages --------->
    readonly page: Page;
    readonly quoteAmount: Locator;
    readonly applicantActions: Locator;
    readonly profileView_btn: Locator;
    readonly deleteApplication_btn: Locator;
    readonly hireNow_option: Locator;
    readonly reviewsAndRatings_header: Locator;
    readonly hireNow_btn: Locator;
    readonly markAsDone: Locator;
    readonly writeReview: Locator;
    readonly inProgressJobs: Locator;
    readonly starRating: Locator;
    readonly delete_btn: Locator;


    constructor(page: Page) {
        this.page = page

        // <-------- Elements -------->
        this.quoteAmount = page.locator("//input[@placeholder='Enter your price']");
        this.applicantActions = page.locator("//button[@aria-label='Applicant actions']");
        this.profileView_btn = page.locator("//span[normalize-space()='View Profile']");
        // this.deleteApplication_btn = page.locator("//span[normalize-space()='Delete Application']");
        this.hireNow_option = page.locator("//span[normalize-space()='Hire Now']");
        this.reviewsAndRatings_header = page.locator("//h3[normalize-space()='Reviews and Ratings']");
        this.hireNow_btn = page.locator("//button[normalize-space()='Hire Now']");
        this.markAsDone = page.locator("//button[normalize-space()='Mark as done']");
        this.writeReview = page.locator("//textarea[@placeholder='Enter text here']");
        this.inProgressJobs = page.locator("//button[normalize-space()='Jobs In Progress']");
        this.starRating = page.locator("#star-4");
        this.deleteApplication_btn = page.locator("//span[normalize-space()='Delete Application']");
        this.delete_btn = page.locator("//button[normalize-space()='Delete']");



    }

    // <-------- Methods -------->
    // async goToURL() {
    //     await this.page.goto(`${process.env.WEBSITE_URL}`);
    // }



}


