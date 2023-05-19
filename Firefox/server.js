browser.runtime.onMessage.addListener(async function(message, sender, sendResponse) {
    if(message.command === "setStorage")
        sendResponse(await browser.storage[message.storage].set(message.data));
    else if(message.command === "getStorage")
        sendResponse(await browser.storage[message.storage].get(message.name));
    else if(message.command === "removeStorage")
        sendResponse(await browser.storage[message.storage].remove(message.name));
    else if(message.command === "browser.tabs.create")
        sendResponse(await browser.tabs.create(message.data));
    else if(message.command === "browser.tabs.query")
        sendResponse(await browser.tabs.query(message.data));
    else if(message.command === "browser.tabs.remove")
        sendResponse(await browser.tabs.remove(message.data));
    else if(message.command === "browser.tabs.removeBy")
        sendResponse(await browser.tabs.remove((await browser.tabs.query(message.data)).map(tab => tab.id)))
    else if(message.command === "browser.tabs.reload")
        sendResponse(await browser.tabs.reload(message.data));
    else if(message.command === "closeActiveTabAndReload") {
        await browser.tabs.remove(sender.tab.id);
        sendResponse(await browser.tabs.reload());
    }
    // else if(message.command.startsWith("browser.")) {
    //     console.log("Executing:", `${message.command}(${message.data ? message.data : ""})`);
    //     eval(`${message.command}(${message.data ? JSON.stringify(message.data) : ""})`);
    // }
});
