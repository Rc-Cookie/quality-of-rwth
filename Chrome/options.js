const browser = chrome;

main();

function main() {
    for(const input of document.getElementsByClassName("settings-checkbox"))
    loadAndAddListener(input, "checked");
    for(const input of document.getElementsByClassName("settings-value"))
        loadAndAddListener(input, "value");
    for(const input of document.getElementsByClassName("settings-dropdown"))
        loadAndAddListener(input, "value");
}

function loadAndAddListener(element, valueField) {
    const name = element.name;
    browser.storage.sync.get(name).then(settings => {
        if(settings[name] !== undefined) element[valueField] = settings[name];
    });
    element.onchange = () => {
        const settings = { [name]: element[valueField] };
        console.log("Updating settings:", settings);
        browser.storage.sync.set(settings)
    };
}
