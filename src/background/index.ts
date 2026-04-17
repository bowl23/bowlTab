chrome.runtime.onInstalled.addListener((details) => {
  console.log('Bowl Tab Manager installed/updated:', details.reason);
});
