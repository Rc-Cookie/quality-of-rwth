if(!window.browser)
    window.browser = chrome;
console.log('Browser:', browser);

const tokenPrefab = document.querySelector(".managed-token");
const tokenList = tokenPrefab.parentElement;
const noTokens = document.getElementById("no-tokens")
tokenPrefab.remove();

main();

function main() {
    for(const input of document.getElementsByClassName("settings-checkbox"))
    loadAndAddListener(input, "checked");
    for(const input of document.getElementsByClassName("settings-value"))
        loadAndAddListener(input, "value");
    for(const input of document.getElementsByClassName("settings-dropdown"))
        loadAndAddListener(input, "value");

    loadManagedTokens();
    loadHiddenCourses();
    loadIgnoredSites();
    browser.storage.sync.onChanged.addListener(change => {
        if(change.hiddenCourses) loadHiddenCourses();
        if(change.managedTOTPTokens) loadManagedTokens();
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

async function loadManagedTokens() {
    const tokens = (await browser.storage.sync.get("managedTOTPTokens")).managedTOTPTokens || { };
    console.log("Tokens:", tokens);
    const elements = [];

    for(const id in tokens) {
        const html = tokenPrefab.cloneNode(true);
        html.querySelector(".token-id").innerText = id;
        html.querySelector(".token-name").innerText = tokens[id].name;
        html.querySelector("button").onclick = async () => {
            const ts = (await browser.storage.sync.get("managedTOTPTokens")).managedTOTPTokens || { };
            delete ts[id];
            await browser.storage.sync.set({ managedTOTPTokens: ts });
            if(html.parentElement.childElementCount === 1)
                noTokens.hidden = false;
            html.remove();
        };
        elements.push(html);
    }
    tokenList.replaceChildren(...elements);
    noTokens.hidden = elements.length !== 0;
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

async function loadIgnoredSites() {
    const ignored = (await browser.storage.sync.get("ignoredSites")).ignoredSites || [];
    const list = document.getElementById("ignored-sites");
    let emptyEntry = list.children[list.children.length - 1];

    async function updateStorage() {
        const newIgnored = [...list.children].map(el => el.querySelector("input").value).filter(v => v);
        console.log("New ignored sites:", newIgnored);
        await browser.storage.sync.set({ ignoredSites: newIgnored });
        await loadIgnoredSites();
    }

    elements = [];
    for(const site of ignored) {
        const el = emptyEntry.cloneNode(true);
        const input = el.querySelector("input")
        input.value = site;
        input.onchange = updateStorage;
        elements.push(el);
    }

    function createNewEmpty(e) {
        e.target.oninput = null;
        e.target.onchange = updateStorage;
        emptyEntry = emptyEntry.cloneNode(true);
        const input = emptyEntry.querySelector("input")
        input.value = "";
        input.oninput = createNewEmpty;
        list.appendChild(emptyEntry)
    }
    emptyEntry.querySelector("input").oninput = createNewEmpty;
    list.replaceChildren(...elements, emptyEntry);
}
