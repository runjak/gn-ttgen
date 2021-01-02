import { main as chromeMain } from "./chrome";
import { startFfmpegServer } from "./ffmpeg";

const url = process.env["START_URL"];

(async () => {
  console.log("starting ffmpegServer");
  const stopFfmpegServer = startFfmpegServer();
  console.log("testing chromeMain.");
  await chromeMain(url, 60 * 1000);
  console.log("stopping ffmpegServer");
  await stopFfmpegServer();
  console.log("done.");
  process.exit(0);
})();

/*
  process.on('SIGINT', async () => {
    await stopFfmpegServer();
    process.exit(0);
  });
*/
