export const selectors: Record<string, Array<string>> = {
  "_cky-consent-container": [".cky-consent-container"],
  "_sign-in-with-google": ["//*[contains(text(),'Sign in with Google')]"],
  "try-other-login-methods": [
    "//span[contains(text(),'Try another way') or contains(text(),'其他登录方式')]",
  ],
  "get-a-verification-code-from-google-authenticator": [
    "//strong[contains(text(),'Google Authenticator') or contains(text(),'Google 验证器')]",
  ],
  "next-button": ["//span[text()='Next' or text()='下一步']"],
  "continue-button": [
    "//span[text()='Continue' or text()='继续' or text()='繼續']",
  ],
  "create-an-account-button": [
    "//div[contains(@class,'md:flex')]//span[text()='Create an account' or text()='创建账户']",
  ],
};

export type SelectorType = keyof typeof selectors;
