browser.runtime.onMessage.addListener(async function(message, sender, sendResponse) {
    if(message.command === "setStorage")
        return sendResponse(await browser.storage[message.storage].set(message.data));
    if(message.command === "getStorage")
        return sendResponse(await browser.storage[message.storage].get(message.name));
    if(message.command === "removeStorage")
        return sendResponse(await browser.storage[message.storage].remove(message.name));
});
