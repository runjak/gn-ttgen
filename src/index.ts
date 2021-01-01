import { launch } from "puppeteer";
import { Page } from "puppeteer/lib/cjs/puppeteer/common/Page";

const entryPoint = "https://engelsystem.de/a38";
const headless = false;

const startButtonSelector = "a.button.start";

const clickStartButton = async (page: Page) => {
  await page.waitForSelector(startButtonSelector);
  await page.click(startButtonSelector);
};

const getTasks = (page: Page): Promise<Array<string>> =>
  page.$$eval(".tasklist .task", (elements) =>
    elements.map((element) => element.innerHTML)
  );

const main = async () => {
  const browser = await launch({ headless });
  const page = await browser.newPage();
  await page.goto(entryPoint);

  await clickStartButton(page);
  await clickStartButton(page);
  const tasks = await getTasks(page);
  console.log("current tasks are:", JSON.stringify(tasks));

  await browser.close();
};

main();
