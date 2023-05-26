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
