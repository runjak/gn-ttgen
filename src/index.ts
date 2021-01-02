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
  dialogTask: ".dialog>a",
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

type Employee = {
  readonly name: string | null;
  readonly href: string;
};

type Room = {
  readonly signs: Array<string>;
  readonly employees: Array<Employee>;
  readonly doorHrefs: Array<string>;
  readonly upstairsHref: string | null;
  readonly downstairsHref: string | null;
};

const parentHrefs = (page: Page, selector: string): Promise<Array<string>> =>
  page.$$eval(selector, (elements) =>
    elements.map((element) => element.parentElement.getAttribute("href"))
  );

const getInfotext = async (page: Page): Promise<string> => {
  const text = await page.$eval(
    selectors.infotext,
    // @ts-ignore .innerText exists
    (element: Element): string => element?.innerText ?? ""
  );
  return text.trim();
};

const readSigns = async (
  page: Page,
  hrefs: Array<string>
): Promise<Array<string>> => {
  let signs: Array<string> = [];

  for (const href of hrefs) {
    await click(page, selectors.byHref(href));
    const text = await getInfotext(page);
    signs.push(text);
  }

  return signs;
};

const getTaskButtonLabel = async (page: Page): Promise<string> => {
  try {
    const label = await page.$eval(
      selectors.dialogTask,
      // @ts-ignore .innerText exists
      (element: Element): string => element?.innerText ?? ""
    );
    return label;
  } catch (e) {
    return "";
  }
};

const checkTasks = async (page: Page) => {
  let previousLabel = "";
  let currentLabel = await getTaskButtonLabel(page);

  while (currentLabel !== "" && previousLabel !== currentLabel) {
    await click(page, selectors.dialogTask);
    const answer = await getInfotext(page);
    console.log(currentLabel, "->", answer);

    previousLabel = currentLabel;
    currentLabel = await getTaskButtonLabel(page);
  }
};

const interrogateAll = async (
  page: Page,
  employeeHrefs: Array<string>
): Promise<Array<Employee>> => {
  let employees: Array<Employee> = [];

  for (const href of employeeHrefs) {
    await click(page, selectors.byHref(href));
    const text = await getInfotext(page);
    const [name] = text.split(":");

    await checkTasks(page);

    employees.push({ href, name });
  }

  return employees;
};

const discoverRoom = async (page: Page): Promise<Room> => {
  const signHrefPromise = parentHrefs(page, selectors.signs);
  const doorHrefsPromise = parentHrefs(page, selectors.door);
  const upstairsHrefPromise = parentHrefs(page, selectors.upstairs);
  const downStairsHrefPromise = parentHrefs(page, selectors.downstairs);
  const employeeHrefPromise = parentHrefs(page, selectors.employee);
  const [
    signHrefs,
    employeeHrefs,
    doorHrefs,
    upstairsHrefs,
    downstairsHrefs,
  ] = await Promise.all([
    signHrefPromise,
    employeeHrefPromise,
    doorHrefsPromise,
    upstairsHrefPromise,
    downStairsHrefPromise,
  ]);

  const signs = await readSigns(page, signHrefs);
  const employees = await interrogateAll(page, employeeHrefs);
  console.log("stuff found in room:");
  console.log("employees:", employees.map((e) => JSON.stringify(e)).join(" "));

  return {
    signs,
    employees,
    doorHrefs,
    upstairsHref: upstairsHrefs[0] ?? null,
    downstairsHref: downstairsHrefs[0] ?? null,
  };
};

const playLevel = async (page: Page) => {
  await click(page, selectors.startButton);
  const discoveredStart = await discoverRoom(page);
  await click(page, selectors.byHref(discoveredStart.doorHrefs[0]));
  const secondRoom = await discoverRoom(page);
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
