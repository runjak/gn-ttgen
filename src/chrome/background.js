/* global chrome, MediaRecorder */
let recorder = null;
let ws = null;
let ffmpegServer = null;

const startWebsocket = () => {
  ws = new WebSocket(ffmpegServer);
  ws.onmessage = (msg) => {
    if (msg.data === "ffmpegClosed") {
      recorder && recorder.stop();
      ws = null;

      setTimeout(() => {
        startWebsock();
        recorder.start(1000);
      }, 500);
    }
  };
};

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => {
    switch (msg.type) {
      case "FFMPEG_START":
        ffmpegServer = msg.data.ffmpegServer;
        startWebsocket();

        const tab = port.sender.tab;
        tab.url = msg.data.url;

        if (!Boolean(recorder)) {
          chrome.desktopCapture.chooseDesktopMedia(
            ["tab", "audio"],
            (streamId) => {
              navigator.webkitGetUserMedia(
                {
                  audio: {
                    mandatory: {
                      chromeMediaSource: "system",
                    },
                  },
                  video: {
                    mandatory: {
                      chromeMediaSource: "desktop",
                      chromeMediaSourceId: streamId,
                      minWidth: 1280,
                      maxWidth: 1280,
                      minHeight: 720,
                      maxHeight: 720,
                      minFrameRate: 60,
                    },
                  },
                },
                (stream) => {
                  recorder = new MediaRecorder(stream, {
                    videoBitsPerSecond: 2500000,
                    ignoreMutedMedia: true,
                    mimeType: "video/webm;codecs=h264",
                  });

                  recorder.ondataavailable = function (event) {
                    if (event.data.size > 0) {
                      ws && ws.send(event.data);
                    }
                  };

                  recorder.start(1000);
                },
                (error) => console.log("Unable to get user media", error)
              );
            }
          );
        }
        break;

      default:
        console.log("Unrecognized message", msg);
    }
  });
});
