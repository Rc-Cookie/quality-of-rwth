let activeTab = undefined;

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if(message.command === "setStorage")
        return !!browser.storage[message.storage].set(message.data).then(sendResponse);
    if(message.command === "getStorage")
        return !!browser.storage[message.storage].get(message.name).then(sendResponse);
    if(message.command === "removeStorage")
        return !!browser.storage[message.storage].remove(message.name).then(sendResponse);
    if(message.command === "browser.tabs.create")
        return !!browser.tabs.create(message.data).then(sendResponse);
    if(message.command === "browser.tabs.query")
        return !!browser.tabs.query(message.data).then(sendResponse);
    if(message.command === "browser.tabs.remove")
        return !!browser.tabs.remove(message.data).then(sendResponse);
    if(message.command === "closeThisTabAndReload")
        return !!browser.tabs.remove(sender.tab.id).then(() => browser.tabs.reload()).then(sendResponse);
    if(message.command === "getActiveTab")
        return !!sendResponse(activeTab);
    if(message.command === "setActiveTab")
        return !!sendResponse(activeTab = message.data);
    if(message.command === "unsetActiveTab") {
        if(activeTab && activeTab.url === message.data.url)
            activeTab = undefined;
        return !!sendResponse();
    }
    // else if(message.command.startsWith("browser.")) {
    //     console.log("Executing:", `${message.command}(${message.data ? message.data : ""})`);
    //     eval(`${message.command}(${message.data ? JSON.stringify(message.data) : ""})`);
    // }
    return false;
});


// Re-enable caching                                                                                                                                // Chrome: // Does not work in manifest v3, at least not from JS
let cacheMoodlePages = false;                                                                                                                       // Chrome:
browser.storage.sync.get("cacheMoodlePages").then(s => cacheMoodlePages = s.cacheMoodlePages !== false);                                            // Chrome:
browser.storage.sync.onChanged.addListener(change => {                                                                                              // Chrome:
    if(change.cacheMoodlePages)                                                                                                                     // Chrome:
        cacheMoodlePages = change.cacheMoodlePages.newValue !== false;                                                                              // Chrome:
})                                                                                                                                                  // Chrome:
browser.webRequest.onHeadersReceived.addListener(details => {                                                                                       // Chrome:
    if(cacheMoodlePages)                                                                                                                            // Chrome:
        return { responseHeaders: details.responseHeaders.filter(h => h.name !== "Cache-Control" && h.name !== "Pragma" && h.name !== "Expires") }; // Chrome:
}, { urls: [                                                                                                                                        // Chrome:
    "*://moodle.rwth-aachen.de/course/view.php*",                                                                                                   // Chrome:
    "*://moodle.rwth-aachen.de/my/*",                                                                                                               // Chrome:
    "*://moodle.rwth-aachen.de/pluginfile.php/*/mod_resource/content"                                                                               // Chrome:
] }, [ "blocking", "responseHeaders" ]);                                                                                                            // Chrome:
