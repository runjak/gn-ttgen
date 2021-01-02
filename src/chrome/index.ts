import { launch as launchPuppeteer } from "puppeteer";
import { platform } from "os";
import { Browser } from "puppeteer/lib/cjs/puppeteer/common/Browser";
import { Page } from "puppeteer/lib/cjs/puppeteer/common/Page";

const getFfmpegHost = () => {
  const ffmpegServer = process.env["FFMPEG_SERVER"];
  const ffmpegServerPort = process.env["FFMPEG_SERVER_PORT"];
  const wsAuthToken = process.env["WS_AUTH_TOKEN"];
  return `${ffmpegServer}:${ffmpegServerPort}/auth/${wsAuthToken}`;
};

const getChromePath = () => {
  switch (platform()) {
    case "linux":
      return "/usr/bin/google-chrome";
    case "darwin":
      return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    default:
      throw new Error(
        `Don't know where chrome is located on platform ${platform()}`
      );
  }
};

const sleep = (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));
const second = 1000;

const dimensions = { width: 1280, height: 720 } as const;

const options = {
  executablePath: getChromePath(),
  headless: false,
  args: [
    "--enable-usermedia-screen-capturing",
    "--allow-http-screen-capture",
    "--auto-select-desktop-capture-source=llywodraeth-adar",
    "--load-extension=" + __dirname,
    "--disable-extensions-except=" + __dirname,
    "--disable-infobars",
    "--no-sandbox",
    "--shm-size=1gb",
    "--disable-dev-shm-usage",
    "--start-fullscreen",
    "--app=https://www.google.com/",
    `--window-size=${dimensions.width},${dimensions.height}`,
  ],
};

export const main = async (url: string, duration: number) => {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await launchPuppeteer(options);
    const pages = await browser.pages();
    page = pages[0];

    page.on("console", (msg) => {
      console.log("page log:", msg.text());
    });

    // @ts-ignore - seems to relate to window-size, according to https://stackoverflow.com/questions/52553311/how-to-set-max-viewport-in-puppeteer
    await page._client.send("Emulation.clearDeviceMetricsOverride");
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.setBypassCSP(true);

    await sleep(second);

    await page.evaluate((serverAddress) => {
      const msg = {
        type: "FFMPEG_START",
        data: { ffmpegServer: serverAddress, url: window.location.origin },
      };
      console.log("chrome/index.ts", JSON.stringify(msg));
      window.postMessage(msg, "*");
    }, getFfmpegHost());

    await sleep(duration);
  } catch (error) {
    console.error(error);
  } finally {
    page?.close && (await page.close());
    browser?.close && (await browser.close());
  }
};
