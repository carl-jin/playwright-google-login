/**
 * Google登录处理模块
 * 包含Google自动登录的核心逻辑
 */

import { ElementHandle, Page } from "@playwright/test";
import totp from "totp-generator";
import { debugLog, sleep } from "./utils";
import { SelectorType, selectors } from "./selectors";

// 账户信息接口
export interface AccountInfo {
  email: string;
  password: string;
  twoStepCode: string;
  isTotp?: boolean;
}

/**
 * 执行Google登录流程
 * @param page Playwright页面对象
 * @param accountInfo 账户信息（必须）
 */
export async function performGoogleLogin(page: Page, accountInfo: AccountInfo): Promise<void> {
  if (!accountInfo) {
    throw new Error("账户信息是必需的！请提供 email、password 和 twoStepCode");
  }

  const { email: loginEmail, password: loginPassword, twoStepCode: loginTwoStepCode } = accountInfo;
  
  debugLog("开始Google登录流程");

  function clickBySelector(selector: SelectorType): Promise<void> {
    return page.click(selectors[selector].join(","));
  }

  async function isElementExist(selector: SelectorType): Promise<boolean> {
    return (await page.$$(selectors[selector].join(","))).length > 0;
  }

  async function getElement(
    selector: SelectorType
  ): Promise<ElementHandle<HTMLDivElement>> {
    return (
      await page.$$(selectors[selector].join(","))
    )[0] as ElementHandle<HTMLDivElement>;
  }

  async function deleteCookieConfirm() {
    if (await isElementExist("_cky-consent-container")) {
      const el = await getElement("_cky-consent-container");
      await el.evaluate((el) => el.remove());
    }
  }

  // 处理手动验证等待的通用函数
  async function waitForManualVerification(urlPattern: string) {
    // 激活浏览器窗口并添加红色边框提醒用户手动输入
    await page.bringToFront();
    await addHighlightBorder(page);

    let isPassed = false;
    while (!isPassed) {
      try {
        await sleep(1);
        const url = await page.url();
        if (!url.includes(urlPattern)) {
          isPassed = true;
          break;
        }
      } catch (error) {
        await sleep(1);
      }
    }
    await removeHighlightBorder(page);
  }

  // 导航到Gmail
  await page.goto("https://www.hedra.com/login");

  await deleteCookieConfirm();

  // 点击 Sign in with Google
  await clickBySelector("_sign-in-with-google");

  // 开始处理 google 登入的逻辑
  await page.waitForURL("https://accounts.google.com/**");
  let isGoogleLogined = false;
  let lastUrl = "";
  let retryCount = 0;
  // 下面这些链接是需要用户手动输入数据的，所以不需要计算 retryCount
  // 不然留给用户输入的时间不多
  const noNeedCountUrlMatch = [
    "challenge/kpe",
    "challenge/ipe/verify",
    "challenge/iap",
    "challenge/recaptcha",
    "challenge/ipp/consent",
    "accounts/SetSID",
    "challenge/ipp/verify",
  ];

  while (!isGoogleLogined) {
    const url = (await page.url()).split("?")[0];
    console.log("while url", url);
    if (url === lastUrl && retryCount != -1) {
      // 15s 应该能加载完了
      if (retryCount > 15) {
        if (url.includes("challenge/pwd")) {
          throw new Error("账号或者密码错误！");
        } else if (url.includes("challenge/totp")) {
          throw new Error("二步验证码错误！");
        }
        throw new Error("重试次数过多，无法继续！");
      }

      // 有时候 email 输入页面会卡住，导致输入不进去
      // 需要刷新下
      if (retryCount > 5 && url.includes("signin/identifier")) {
        retryCount = -1;
        await page.reload();
        continue;
      }

      if (!noNeedCountUrlMatch.some((_url) => url.includes(_url))) {
        retryCount++;
      }

      // 如果链接还是一样，等待一会儿链接改变，再执行，这样能跟准确点
      // 避免点击下一步后太快，导致链接还是一样
      await sleep(1);
      continue;
    }
    retryCount = 0;

    lastUrl = url;

    if (
      // 授权后会短暂的重定向到 https://accounts.youtube.com/accounts/SetSID
      !url.startsWith("https://accounts.google.com/") &&
      // 手机验证后会短暂的跳转到 https://accounts.google.com/v3/signin/challenge/ipp/verify
      !url.includes("challenge/ipp/verify") &&
      !url.includes("accounts/SetSID")
    ) {
      console.log("Google 登入成功！", url);
      isGoogleLogined = true;
      break;
    }

    //
    //
    // 输入邮箱操作
    if (url.includes(`signin/identifier`)) {
      await page.click('input[type="email"]');
      await sleep(0.5);
      await page.keyboard.type(loginEmail);
      await page.click("#identifierNext");
      continue;
    }

    //
    //
    // 输入密码操作
    if (url.includes(`challenge/pwd`)) {
      await page.focus('input[type="password"]');
      await sleep(0.5);
      await page.keyboard.type(loginPassword);
      await page.click("#passwordNext");
      continue;
    }

    //
    //
    // 输入 二步验证
    if (url.includes(`challenge/totp`)) {
      if (!loginTwoStepCode) {
        throw new Error("二步验证码未配置！但却要输入二步验证码！");
      }

      // 等待输入框出现
      const telInput = page.locator('input[type="tel"]');
      await telInput.waitFor({ state: "visible" });

      // 生成TOTP验证码
      const code = totp(loginTwoStepCode.replaceAll(" ", ""));

      // 输入验证码
      await telInput.fill(code);
      await sleep(0.5);

      await clickBySelector("next-button");
      continue;
    }

    //
    //
    // 同意授权
    if (url.includes("signin/oauth/id")) {
      await clickBySelector("continue-button");
      continue;
    }

    //
    //
    // 使用 passkey 登入的页面
    if (url.includes("signin/challenge/pk/presend")) {
      await clickBySelector("try-other-login-methods");
      continue;
    }

    //
    //
    // 选择其他验证方式（这里可以选择使用 二步验证）
    if (url.includes("challenge/selection")) {
      const isTwoStepOptionExist = await isElementExist(
        "get-a-verification-code-from-google-authenticator"
      );
      if (isTwoStepOptionExist) {
        await clickBySelector(
          "get-a-verification-code-from-google-authenticator"
        );
      } else {
        // 让用户自己选择验证方式
        await waitForManualVerification("challenge/selection");
      }
      continue;
    }

    //
    //
    // Confirm the recovery email address you added to your account:
    if (url.includes("challenge/kpe")) {
      // 让用户自己选择验证方式
      await waitForManualVerification("challenge/kpe");
      continue;
    }

    //
    //
    // An email with a verification code was just sent to your email address
    if (url.includes("challenge/ipe/verify")) {
      // 让用户自己选择验证方式
      await waitForManualVerification("challenge/ipe/verify");
      continue;
    }

    //
    //
    // 需要用户绑定手机号了
    if (url.includes("challenge/iap")) {
      await waitForManualVerification("challenge/iap");
      continue;
    }

    //
    //
    // 需要用户输入验证码
    if (url.includes("challenge/recaptcha")) {
      await waitForManualVerification("challenge/recaptcha");
      continue;
    }

    //
    //
    // 需要用户发送手机验证码
    if (url.includes("challenge/ipp/consent")) {
      await waitForManualVerification("challenge/ipp/consent");
      continue;
    }

    //
    //
    // 授权后重定向的链接, 授权后会短暂的重定向到 https://accounts.youtube.com/accounts/SetSID
    // 手机验证后会短暂的跳转到 https://accounts.google.com/v3/signin/challenge/ipp/verify
    if (
      url.includes("accounts/SetSID") ||
      url.includes("challenge/ipp/verify")
    ) {
      continue;
    }

    console.log(url);
    throw new Error("未配置的链接");
  }

  await page.waitForURL("https://www.hedra.com/app/home");

  await sleep(2);

  // 同意所有条款
  // prettier-ignore
  const checkboxes = await page.$$(".lucide-circle");
  await deleteCookieConfirm();

  // 然后依次点击
  for (const checkbox of checkboxes) {
    await checkbox.click();
  }

  // 点击创建账号
  await addHighlightBorder(page);
  // await clickBySelector("create-an-account-button");
}

async function addHighlightBorder(page: Page) {
  // 注入CSS样式创建闪烁的红色边框提醒
  const styleTag = await page.addStyleTag({
    content: `
          @keyframes redBorderBlink {
            0% { border-color: #ff0000; box-shadow: 0 0 20px #ff0000, inset 0 0 20px #ff0000; }
            50% { border-color: #ffaaaa; box-shadow: 0 0 30px #ffaaaa, inset 0 0 30px #ffaaaa; }
            100% { border-color: #ff0000; box-shadow: 0 0 20px #ff0000, inset 0 0 20px #ff0000; }
          }
          
          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border: 8px solid #ff0000;
            box-shadow: inset 0 0 20px #ff0000, 0 0 20px #ff0000;
            pointer-events: none;
            z-index: 999999;
            animation: redBorderBlink 2s infinite;
          }
        `,
  });
}

async function removeHighlightBorder(page: Page) {
  try {
    await page.evaluate(() => {
      const styleEl = document.querySelectorAll("style");
      for (const style of styleEl) {
        if (style.textContent?.includes("redBorderBlink")) {
          style.remove();
        }
      }
    });
  } catch (error) {
    // 如果页面跳转的话，这个可能会报错
  }
}
