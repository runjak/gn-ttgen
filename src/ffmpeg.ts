import { spawn } from "child_process";
import { Server as WebSocketServer } from "ws";
import { createServer as createHttpServer, IncomingMessage } from "http";

const command = "ffmpeg";
const args = [
  // FFmpeg will read input video from STDIN
  "-i",
  "-",

  // If we're encoding H.264 in-browser, we can set the video codec to 'copy'
  // so that we don't waste any CPU and quality with unnecessary transcoding.
  "-vcodec",
  "copy",

  // use if you need for smooth youtube publishing. Note: will use more CPU
  //'-vcodec', 'libx264',
  //'-x264-params', 'keyint=120:scenecut=0',

  //No browser currently supports encoding AAC, so we must transcode the audio to AAC here on the server.
  "-acodec",
  "aac",

  // remove background noise. You can adjust this values according to your need
  "-af",
  "highpass=f=200, lowpass=f=3000",

  // This option sets the size of this buffer, in packets, for the matching output stream
  "-max_muxing_queue_size",
  "99999",

  // better to use veryfast or fast
  "-preset",
  "veryfast",

  //'-vf', 'mpdecimate', '-vsync', 'vfr',
  //'-vf', 'mpdecimate,setpts=N/FRAME_RATE/TB',

  // FLV is the container format used in conjunction with RTMP
  "-f",
  "flv",

  // The output RTMP URL.
  // For debugging, you could set this to a filename like 'test.flv', and play
  // the resulting file with VLC.
  process.env["RTMP_URL"],
];

const isAuthenticated = (req: IncomingMessage): boolean => {
  const authMatch = req.url.match(/^\/auth\/(.*)$/);
  const authToken = authMatch[1] ?? "";

  return process.env["WS_AUTH_TOKEN"] === authToken;
};

export const startFfmpegServer = () => {
  const httpPort = process.env["FFMPEG_SERVER_PORT"];
  const httpServer = createHttpServer().listen(httpPort, () => {
    console.log(`Listening on ${httpPort}`);
  });

  const websocketServer = new WebSocketServer({ server: httpServer });
  websocketServer.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    console.log("new websocket connection");

    if (isAuthenticated(req)) {
      console.log("authentication passed");
    } else {
      console.log("authentication failed");
      ws.close(1008, "authentication failed");
    }

    const ffmpeg = spawn(command, args);

    ffmpeg.on("close", (code, signal) => {
      console.log("ffmpeg child process closed.", { code, signal });
      ws.send("ffmpegClosed");
      ws.close();
    });

    ffmpeg.stdin.on("error", (e: Error) => {
      console.log("ffmpeg STDIN Error", e);
    });

    ffmpeg.stderr.on("data", (data) => {
      console.log("ffmpeg STDERR:", String(data));
    });

    ws.onmessage = (msg) => {
      ffmpeg.stdin.write(msg.data);
    };

    ws.onclose = (event) => {
      console.log("ws closed");
      ffmpeg.kill("SIGINT");
    };
  });

  return async () => {
    await Promise.all([
      new Promise((resolve) => httpServer.close(resolve)),
      new Promise((resolve) => websocketServer.close(resolve)),
    ]);
  };
};
