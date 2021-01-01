const puppeteer = require('puppeteer');

const entryPoint = 'https://engelsystem.de/a38';
const headless = false;

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) });
const second = 1000;
const minute = 60 * second;

const main = async () => {
  const browser = await puppeteer.launch({ headless });
  const page = await browser.newPage();
  await page.goto(entryPoint);

  await sleep(5 * minute);

  await browser.close();
};

main();
