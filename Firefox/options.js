main();

function main() {
    for(const input of document.getElementsByClassName("settings-checkbox")) {
        const name = input.name;
        browser.storage.sync.get(name, settings => {
            if(settings[name] !== undefined) input.checked = settings[name];
        });
        input.onchange = () => {
            const settings = { [name]: input.checked };
            console.log("Updating settings:", settings);
            browser.storage.sync.set(settings)
        };
    }
    for(const input of document.getElementsByClassName("settings-value")) {
        const name = input.name;
        browser.storage.sync.get(name, settings => {
            if(settings[name] !== undefined) input.value = settings[name];
        });
        input.onchange = () => {
            const settings = { [name]: input.value };
            console.log("Updating settings:", settings);
            browser.storage.sync.set(settings)
        };
    }
}
