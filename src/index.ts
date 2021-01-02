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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const second = 1000;

const click = async (page: Page, selector: string) =>
  Promise.all([
    page.evaluate((selector) => {
      // @ts-ignore .click is available
      document.querySelector(String(selector)).click();
    }, selector),
    page.waitForNavigation(),
  ]);

const getTasks = (page: Page): Promise<Array<string>> =>
  page.$$eval(selectors.tasks, (elements) =>
    // @ts-ignore .innerText exists
    elements.map((element) => element?.innerText ?? "")
  );

const tasksDone = (tasks: Array<string>): boolean => {
  return tasks.length === 1 && tasks[0] === "Kehre nach draußen zurück.";
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
  const startRoom = await discoverRoom(page);
  // @ts-ignore fromEntries exists
  let buildings: Record<string, Array<Room>> = Object.fromEntries(
    startRoom.doorHrefs.map((href) => [href, []])
  );

  let tasks = await getTasks(page);
  let buildingDoors = startRoom.doorHrefs.slice();
  while (!tasksDone(tasks)) {
    // Cycle to next entry
    const currentEntry = buildingDoors.shift();
    buildingDoors.push(currentEntry);

    // Enter current building and get buildingRooms
    await click(page, selectors.byHref(currentEntry));
    const buildingRooms = buildings[currentEntry];

    if (buildingRooms.length === 0) {
      // Move up discovering rooms the first time
      let discovering = true;
      while (discovering) {
        const currentRoom = await discoverRoom(page);
        buildingRooms.push(currentRoom);

        discovering = currentRoom.upstairsHref !== null;
        if (discovering) {
          await click(page, selectors.byHref(currentRoom.upstairsHref));
        }
      }
    } else {
      // Move up knowing the rooms
      for (const currentRoom of buildingRooms) {
        const { employees, upstairsHref } = currentRoom;
        await interrogateAll(
          page,
          employees.map((e) => e.href)
        );
        if (upstairsHref !== null) {
          await click(page, selectors.byHref(upstairsHref));
        }
      }
    }

    // Move to ground floor
    for (let i = buildingRooms.length - 1; i > 0; i--) {
      await click(page, selectors.byHref(buildingRooms[i].downstairsHref));
    }

    // Update tasks and leave building
    tasks = await getTasks(page);
    await click(page, selectors.byHref(buildingRooms[0].doorHrefs[0]));
  }
};

const main = async () => {
  const browser = await launch({ headless });
  const page = await browser.newPage();
  await page.goto(entryPoint);

  await click(page, selectors.startButton);

  try {
    for (let i = 0; i < 5; i++) {
      await playLevel(page);
    }
  } catch (e) {
    console.log("exception in playLevel", e);
  } finally {
    await sleep(5 * second);
    await browser.close();
  }
};

main();
