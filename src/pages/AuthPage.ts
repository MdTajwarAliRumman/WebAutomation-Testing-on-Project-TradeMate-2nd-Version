import { Locator, Page } from "@playwright/test";

export class AuthPage {
    // < ---------  initialize all the pages --------->
    readonly page: Page;
    readonly CreateAccountButton: Locator;
    readonly OTPInput1: Locator;
    readonly OTPInput2: Locator;
    readonly OTPInput3: Locator;
    readonly OTPInput4: Locator;
    readonly EmailInput: Locator;
    readonly PasswordInput: Locator;
    readonly ForgotPassword: Locator;
    readonly LoginButton: Locator;
    readonly termsCheckbox: Locator;

    constructor(page: Page) {
        this.page = page

        // <-------- Elements -------->
        this.CreateAccountButton = page.locator("//button[normalize-space()='Create Account']")
        this.OTPInput1 = page.locator("(//input[@type='text'])[1]")
        this.OTPInput2 = page.locator("(//input[@type='text'])[2]")
        this.OTPInput3 = page.locator("(//input[@type='text'])[3]")
        this.OTPInput4 = page.locator("(//input[@type='text'])[4]")

        this.EmailInput = page.locator("//input[@name='email']")
        this.PasswordInput = page.locator("//input[@name='password']")

        this.LoginButton = page.locator("//a[normalize-space()='Log In']")
        this.ForgotPassword = page.locator("//a[normalize-space()='Forgot Password?']")
        this.termsCheckbox = page.locator("//input[@type='checkbox']")

    }

    // <-------- Methods -------->

    async AccountInformation(name: string, email: string, phone: string, password: string, confirmPassword: string) {
        await this.page.getByPlaceholder('name').fill(name);
        await this.page.getByPlaceholder('Email').fill(email);
        await this.page.getByPlaceholder('Phone number').fill(phone);
        await this.page.locator('input[name="password"]').fill(password);
        await this.page.locator('input[name="password_confirmation"]').fill(confirmPassword);
        await this.termsCheckbox.click();

    }

    async OTPVerification(otp1: string, otp2: string, otp3: string, otp4: string) {
        await this.OTPInput1.fill(otp1);
        await this.OTPInput2.fill(otp2);
        await this.OTPInput3.fill(otp3);
        await this.OTPInput4.fill(otp4);
    }

}



