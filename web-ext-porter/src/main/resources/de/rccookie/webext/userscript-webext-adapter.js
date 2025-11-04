const browser = (() => {
    const storageArea = {
        get: async keys => {
            if(keys === undefined)
                keys = await GM.listValues();
            if(Array.isArray(keys))
                keys = Object.fromEntries(keys.map(k => [k,undefined]));
            else if(typeof keys !== 'object')
                keys = { [keys]: undefined };
            return Object.fromEntries(await Promise.all(
                Object.entries(keys).map(([k,v]) => GM.getValue(k,v).then(val => [k, val]))
            ));
        },
        set: entries => Promise.all(Object.entries(entries).map(([k,v]) => GM.setValue(k,v))),
        getKeys: GM.listValues,
        remove: async keys => {
            if(!Array.isArray(keys))
                keys = [keys]
            return Promise.all(keys.map(GM.deleteValue));
        },
        clear: async () => await Promise.all((await GM.listValues()).map(GM.deleteValue))
    };
    return {
        storage: {
            local: storageArea,
            managed: storageArea,
            session: storageArea,
            sync: storageArea
        },
        runtime: {
            sendMessage: async () => console.log("browser.sendMessage() not supported in UserScript, ignoring")
        }
    }
})();
