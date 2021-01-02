window.onload = () => {
  // Setup message passing
  const port = chrome.runtime.connect(chrome.runtime.id);
  port.onMessage.addListener((msg) => window.postMessage(msg, "*"));
  window.addEventListener("message", (event) => {
    // Relay client messages
    if (event.source === window && event.data.type) {
      port.postMessage(event.data);
    }
  });

  document.title = "llywodraeth-adar";
};
