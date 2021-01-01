import { launch } from "puppeteer";
import { Page } from "puppeteer/lib/cjs/puppeteer/common/Page";

const entryPoint = "https://engelsystem.de/a38";
const headless = false;

const selectors = {
  startButton: "a.button.start",
  tasks: ".tasklist .task",
  signs: '.world [href]>img[src="img/sign_00.png"]',
  door: '.world [href]>img[src="img/door_00.png"]',
  upstairs: '.world [href]>img[src="img/upstairs_00.png"]',
  downstairs: '.world [href]>img[src="img/downstairs_00.png"]',
  employee: '.world [href]>img[src^="img/employee_"]',
  infotext: ".infotext",
  byHref: (href: string) => `.world [href="${href}"]`,
} as const;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const second = 1000;

const click = async (page: Page, selector: string) =>
  Promise.all([page.click(selector), page.waitForNavigation()]);

const getTasks = (page: Page): Promise<Array<string>> =>
  page.$$eval(selectors.tasks, (elements) =>
    elements.map((element) => element.innerHTML)
  );

const tasksDone = (tasks: Array<string>): boolean => {
  return tasks.length === 1 && tasks[0] === "Kehre nach draußen zurück.";
};

type Person = {
  readonly name: string | null;
  readonly tasks: Array<string>;
  readonly href: string;
};

type Room = {
  readonly discovered: boolean;
  readonly isStart: boolean;
  readonly signs: Array<string>;
  readonly persons: Array<Person>;
  readonly linkHrefs: Array<string>;
};

const startRoom: Room = {
  discovered: false,
  isStart: true,
  signs: [],
  persons: [],
  linkHrefs: [],
};

const parentHrefs = (page: Page, selector: string): Promise<Array<string>> =>
  page.$$eval(selector, (elements) =>
    elements.map((element) => element.parentElement.getAttribute("href"))
  );

const readSigns = async (
  page: Page,
  hrefs: Array<string>
): Promise<Array<string>> => {
  let signs: Array<string> = [];

  for (const href of hrefs) {
    await click(page, selectors.byHref(href));
    const text = await page.$eval(
      selectors.infotext,
      // @ts-ignore .innerText exists
      (element: Element): string => element?.innerText ?? ""
    );
    signs.push(text.trim());
  }

  return signs;
};

const discoverRoom = async (page: Page, room: Room): Promise<Room> => {
  if (room.discovered) {
    return room;
  }

  const signHrefPromise = room.isStart
    ? parentHrefs(page, selectors.signs)
    : ([] as Array<string>);
  const linkHrefPromise = parentHrefs(
    page,
    [selectors.door, selectors.upstairs, selectors.downstairs].join(",")
  );
  const employeeHrefPromise = parentHrefs(page, selectors.employee);
  const [signHrefs, linkHrefs, employeeHrefs] = await Promise.all([
    signHrefPromise,
    linkHrefPromise,
    employeeHrefPromise,
  ]);

  const signs = await readSigns(page, signHrefs);
  console.log("stuff found in room:");
  console.log("employees:", employeeHrefs.join(" "));

  return {
    ...room,
    discovered: true,
    signs,
    linkHrefs,
  };
};

const playLevel = async (page: Page) => {
  await click(page, selectors.startButton);
  const discoveredStart = discoverRoom(page, startRoom);
};

const main = async () => {
  const browser = await launch({ headless });
  const page = await browser.newPage();
  await page.goto(entryPoint);

  await click(page, selectors.startButton);

  try {
    await playLevel(page);
    await sleep(5 * second);
  } catch (e) {
    console.log("exception in playLevel", e);
  } finally {
    await browser.close();
  }
};

main();
