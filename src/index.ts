import { launch } from "puppeteer";
import { Page } from "puppeteer/lib/cjs/puppeteer/common/Page";

const entryPoint = "https://engelsystem.de/a38";
const headless = false;

const selectors = {
  startButton: "a.button.start",
  tasks: ".tasklist .task",
  actions: ".world [href]",
} as const;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const second = 1000;

const clickStartButton = async (page: Page) => {
  await page.waitForSelector(selectors.startButton);
  await page.click(selectors.startButton);
};

const getTasks = (page: Page): Promise<Array<string>> =>
  page.$$eval(selectors.tasks, (elements) =>
    elements.map((element) => element.innerHTML)
  );

const getCurrentActions = async (page: Page) => {
  console.log("getCurrentActions");
  await page.waitForSelector(selectors.actions);
  console.log("selecting…");
  return page.$$(selectors.actions);
};

const playLevel = async (page: Page) => {
  await clickStartButton(page);
};

const main = async () => {
  const browser = await launch({ headless });
  const page = await browser.newPage();
  await page.goto(entryPoint);

  await clickStartButton(page);

  await playLevel(page);

  await sleep(30 * second);
  await browser.close();
};

main();
