main();

function main() {
    for(const input of document.getElementsByClassName("settings-checkbox"))
    loadAndAddListener(input, "checked");
    for(const input of document.getElementsByClassName("settings-value"))
        loadAndAddListener(input, "value");
    for(const input of document.getElementsByClassName("settings-dropdown"))
        loadAndAddListener(input, "value");

    loadHiddenCourses();
    browser.storage.sync.onChanged.addListener(change => {
        if(change.hiddenCourses) loadHiddenCourses();
    });
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

async function loadHiddenCourses() {
    const hidden = (await browser.storage.sync.get("hiddenCourses")).hiddenCourses || {};
    const list = document.getElementById("hidden-courses");

    list.replaceChildren();
    for(const id in hidden) {
        const el = document.createElement("li");
        el.className = "hidden-course";
        el.id = id;
        el.innerText = hidden[id];
        el.onclick = async function() {
            console.log("Unhiding", hidden[id]);
            delete hidden[id];
            await browser.storage.sync.set({ hiddenCourses: hidden });
            await loadHiddenCourses();
        };
        list.appendChild(el);
    }

    document.getElementById("no-hidden-courses").hidden = list.childElementCount !== 0;
}
