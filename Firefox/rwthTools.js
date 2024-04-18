let functions = {
    // Registers this tab as the active tab and add listeners for lossing and gaining focus
    // for when it is needed (e.g. for whether to show the video download link - only show when on that tab)
    registerActiveTab: {
        regex: /.*/,
        action: registerActiveTab,
        allowSubsequent: true
    },
    // Click "login" on moodle welcome page
    moodleStartAutoForward: {
        regex: /^moodle\.rwth-aachen\.de$/,
        action: moodleLogin
    },
    // Forward to the login page if attempted to open the dashboard without being logged in, which is possibly
    // but doesn't show any relevant information
    moodleGuestDashboardLogin: {
        regex: /^moodle\.rwth-aachen\.de\/my\/?/,
        action: onGuestDashboard,
        allowSubsequent: true
    },
    // Click "to login" on the RWTHOnline main page when not logged in
    rwthOnlineLoginAutoForward: {
        regex: /^online\.rwth-aachen\.de\/RWTHonline\/ee\/ui\/ca2\/app\/desktop\/#\/login$/,
        action: onRWTHOnlineLoginPage
    },
    // Open the login page if a video page from the video AG requires login
    videoAGAutoLoginForward: {
        regex: /^(video\.fsmpi\.rwth-aachen\.de|rwth\.video)\/[^\/]+\/\d+$/,
        action: onVideoAG,
        allowSubsequent: true
    },
    // Click "login" if opening a moodle course page while not logged in, which requires login. Moodle just shows
    // that you need to be logged in, but does not actually forward to the login page
    autoLoginOnCoursePreview: {
        regex: /^moodle\.rwth-aachen\.de\/enrol\/index.php/,
        action: moodleLogin
    },
    // Click the "Login" button on the psp page
    autoLoginOnPSP: {
        regex: /^psp(-website-dev)?\.embedded\.rwth-aachen\.de/,
        action: onPSPLogin,
        allowSubsequent: true
    },
    // Select "Remember me" and click "login" on the git.rwth-aachen page
    autoGitLoginForward: {
        regex: /^git(-ce)?\.rwth-aachen\.de\/users\/sign_in\/?$/,
        action: onGitLoginPage
    },
    // Automatically select a specific institution if you are asked to
    autoSelectInstitution: {
        regex: /^oauth\.campus\.rwth-aachen\.de\/login\/shibboleth\/?(\?.*)?$/,
        action: onSelectInstitution
    },
    // Automatically select a specific institution if you are asked to, for the git page version
    autoSelectGitInstitution: {
        regex: /^git(-ce)?\.rwth-aachen\.de\/shibboleth-ds\/?(\?.*)?$/,
        action: onSelectGitInstitution,
        setting: "autoSelectInstitution"
    },
    // Automatically click "Authorize" if you have to, if you already authorized the same app before
    autoSSOAuthorize: {
        // ^oauth\.campus\.rwth-aachen\.de\/manage\/?\?q=verify
        regex: /^sso\.rwth-aachen\.de\/idp\/profile\/SAML2\/Redirect\/SSO/,
        action: onAutoSSOAuthorize,
        allowSubsequent: true,
        setting: "" // Always run to store the known apps
    },
    // Same as above, but different page looks (RWTH, why???)
    autoOAuthAuthorize: {
        regex: /^oauth\.campus\.rwth-aachen\.de\/manage\/?\?q=verify/,
        action: onAutoOAuthAuthorize,
        allowSubsequent: true,
        setting: "" // Always run to store the known apps
    },
    // Automatically close an authorization tab after being done
    autoCloseAfterAuthorize: {
        regex: /^oauth\.campus\.rwth-aachen\.de\/manage\/?\?.*q=authorized/,
        action: onAuthorizeDone
    },
    // Automatically press "Login" on SSO if the browser filled in username and password
    ssoAutoSubmit: {
        regex: /^sso\.rwth-aachen\.de\/idp\/profile\/SAML2\/Redirect\/SSO/,
        action: onSSO,
        allowSubsequent: true
    },
    // Automatically press "Login" on the main.rwth-aachen page if the browseer filled in username and password
    autoMailLoginSubmit: {
        regex: /^mail\.rwth-aachen\.de\/owa\/auth\/logon\.aspx/,
        action: onMailLogin,
        allowSubsequent: true
    },
    // Internal event to find the current session key for moodle to use in requests for the dropdown menu
    searchSessionKey: {
        regex: /^moodle\.rwth-aachen\.de/,
        action: searchSessionKey,
        allowSubsequent: true
    },
    // Download and open the PDF directly when opening the PDF annotator
    skipPDFAnnotator: {
        regex: /^moodle\.rwth-aachen\.de\/mod\/pdfannotator\/view\.php/,
        action: onPDFAnnotator
    },
    // Open the link shown on moodle pages which only present that link
    clickURLResources: {
        regex: /^moodle\.rwth-aachen.de\/mod\/url\/view\.php\?(?!stay=true)/,
        action: onURLResource
    },
    // Internal event to find the video id on an opencast video page
    searchOpencastVideo: {
        regex: /^moodle/,
        action: searchOpencastVideo,
        allowSubsequent: true
    },
    // Close the "Chat" popup
    removeChatPopup: {
        regex: /^moodle/,
        action: removeChatPopup,
        allowSubsequent: true
    },
    // Close the "Accept cookies" banner
    acceptCookies: {
        regex: /^moodle/,
        action: acceptCookies,
        allowSubsequent: true
    },
    // Automatically select the login box in the I11 hiwi page and submit if autofilled
    autoEmbeddedHiwiLogin: {
        regex: /^.*\.embedded\.rwth-aachen\.de/,
        action: onEmbeddedHiwiLogin,
        allowSubsequent: true
    },
    // Select dark or light mode on the psp website
    PSPDarkMode: {
        regex: /^psp(-website-dev)?\.embedded\.rwth-aachen\.de/,
        action: onPSPDarkMode,
        allowSubsequent: true,
        setting: "autoDarkMode"
    },
    // Adds a button to the PSP website to clear all boxes on the experiment overview page
    PSPClearAllBoxesButton: {
        regex: /^psp(-website-dev)?\.embedded\.rwth-aachen\.de\/experiments-overview/,
        action: clearPSPBoxes,
        allowSubsequent: true
    },
    // Adds a button to the PSP website to kick the students from the selected VMs immediately
    PSPAddKickFunction: {
        regex: /^psp(-website-dev)?\.embedded\.rwth-aachen\.de\/vmpool/,
        action: addPSPKickFunction,
        allowSubsequent: true
    },
    // Submit the text input when pressing ctrl + enter
    PSPHiwiCtrlEnterSubmit: {
        regex: /^hiwi\.embedded\.rwth-aachen\.de\/?(\?.*)?/,
        action: addPSPCtrlEnterSubmit,
    },
    // Adds information about a checkbox of the checkboard when hovered over it
    PSPAddCheckboardHoverInfo: {
        regex: /^psp(-website-dev)?\.embedded\.rwth-aachen\.de\/checkboard/,
        action: addPSPCheckboardHoverInfo,
        allowSubsequent: true
    }
    // loadVideoData: {
    //     regex: /^moodle\.rwth-aachen\.de\/mod\/lti\/view\.php/,
    //     action: onVideo
    // }
}

main();

async function main() {
    while(true) {
        let url = location.href.replace(/https?\:\/\//, "");
        if(url.endsWith("/"))
            url = url.substring(0, url.length - 1);

        // Check if website is ignored, in that case exit
        ignored = (await browser.storage.sync.get("ignoredSites")).ignoredSites || [];
        for(site of ignored)
            if(url.match("([^/?#]\\.)?" + escapeRegExp(site) + "([/?#].*)?"))
                return console.log("Ignored site:", site);

        for(let [name, info] of Object.entries(functions)) {
            if(!url.match(info.regex)) continue;
            const settingsName = info.setting ?? name;
            browser.storage.sync.get(settingsName).then(settings => {
                if((settings[settingsName] === undefined && info.default !== false) || settings[settingsName] === true) try {
                    console.log(name);
                    info.action();
                } catch(error) {
                    console.error(error);
                }
                else console.log("Disabled:", name);
            });
            if(!info.allowSubsequent) break;
        }

        const href = location.href;
        await when(() => location.href !== href);
        console.log("One-Page side change detected:", href, "->", location.href);
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function searchSessionKey() {
    const node = document.getElementsByName("sesskey")[0];
    if(!node) return console.log("No session key found");
    const sesskey = node.value;
    console.log("Session key:", sesskey);
    // Don't access browser.storage.local directly, when running in containers or similar this won't be visible
    // from the popup storage. Instead, send the data to the background script which should always be running
    // in the same context as the popup window as neither really belongs to any tab
    browser.runtime.sendMessage({ command: "setStorage", storage: "local", data: { sesskey: sesskey } });
    // Also, sometimes (?) cookies are required for the course info request. When running in coutainers, the
    // popup script does not have access to those cookies, and here we don't have access to the cookies API to
    // read them. Thus, we request the courses now and cache them for later use. The popup window will still show
    // 'Not logged in' because it can't re-request the courses, but it can at least display the last cached value.
    cacheCourses(sesskey);
}

async function cacheCourses(sesskey) {
    const byTime = (await browser.storage.sync.get("courseOrder")).courseOrder !== "name"; // Default to true
    const resp = await fetch("https://moodle.rwth-aachen.de/lib/ajax/service.php?sesskey="+sesskey, {
        method: "post",
        body: JSON.stringify([{
            index: 0,
            methodname: "core_course_get_enrolled_courses_by_timeline_classification",
            args: {
                offset: 0,
                limit: (await browser.storage.sync.get("maxCourses")).maxCourses || 10,
                classification: byTime ? "all" : "inprogress",
                sort: byTime ? "ul.timeaccess desc" : "fullname"
            }
        }])
    }).then(r => r.json());
    if(resp[0].error)
        return console.error("Failed to load courses", resp[0].exception);

    await browser.runtime.sendMessage({ command: "setStorage", storage: "local", data: { courseCache: resp[0].data.courses } })
}

function registerActiveTab() {
    function setActive() {
        browser.runtime.sendMessage({ command: "setActiveTab", data: { url: location.href } });
    }
    function unsetActive() {
        browser.runtime.sendMessage({ command: "unsetActiveTab", data: { url: location.href } });
    }
    function onChange() {
        if(document.visibilityState == "visible") setActive();
        else unsetActive();
    }
    onChange();
    document.onvisibilitychange = onChange;
    window.onfocus = setActive;
    window.onblur = unsetActive;
}

function onGuestDashboard() {
    const h = document.getElementsByTagName("h1")[0];
    if(h && h.innerText.match(/\((?:Gast|Guest)\)/)) // When logging in, its first an <h2>. If you access the dashboard when already logged in its an <h1> for whatever reason
        moodleLogin();
}

function onRWTHOnlineLoginPage() {
    when(() => document.getElementsByClassName("ca-button btn btn-primary btn-block").length != 0).then(() => {
        location.href = location.origin+"/RWTHonline/Login";
    });
}

function onVideoAG() {
    const a = document.getElementsByClassName("reloadonclose")[0];
    if(a) browser.runtime.sendMessage({ command: "browser.tabs.create", data: { url: a.href } });
}

function onPSPLogin() {
    let interval = window.setInterval(() => {
        if(location.href.includes("login")) {
            location.href = "https://psp.embedded.rwth-aachen.de/api/auth/login?redirect=%2F";
            window.clearInterval(interval);
        }
    }, 100);
}

async function onGitLoginPage() {
    if((await browser.storage.sync.get("rememberMe")).rememberMe !== false) {
        const box = document.getElementById("remember_me_omniauth") || document.getElementById("js-remember-me-omniauth");
        if(box) box.checked = true;
        else console.error("Remember me button not found");
    }
    const btn = document.getElementById("oauth-login-saml") || document.querySelector("button[data-testid=saml-login-button]");
    if(btn) btn.click();
    else console.error("Login button not found");
}

async function onSelectInstitution() {
    const index = (await browser.storage.sync.get("intitution")).institution == "jülich" ? 1 : 0;
    document.getElementsByClassName("row")[0].children[index].getElementsByTagName("a")[0].click();
}

async function onSelectGitInstitution() {
    const select = document.getElementById("idpSelectSelector");
    if(!select) return;

    let institution = (await browser.storage.sync.get("intitution")).institution;
    if(!institution) institution = "rwth";

    for(let i=0; i<select.options.length; i++) {
        if(select.options[i].text.toLowerCase().includes(institution)) {
            select.value = select.options[i].value;
            break;
        }
    }

    const durations = document.getElementsByClassName("IdPSelectautoDispatchTile");
    if(durations)
        durations[durations.length-1].children[0].click();

    document.getElementById("idpSelectListButton").click();
}

async function onAutoSSOAuthorize() {
    const rememberBtn = document.getElementById("_shib_idp_rememberConsent");
    if(!rememberBtn) return;

    const form = document.getElementsByTagName("form")[0];
    const app = form.getElementsByTagName("strong")[0].innerText;
    const known = (await browser.storage.sync.get("authorizedApps")).authorizedApps || [];
    const button = form.getElementsByClassName("btn-primary")[0];

    const setting = (await browser.storage.sync.get("autoAuthorize")).autoAuthorize;

    if(setting === "always") {
        // Don't save as actively consented
        button.click();
        return;
    }

    if(setting === undefined || setting === "confirmOnce") {
        if(known.includes(app)) {
            button.click();
            return;
        }

        for(const text of [...rememberBtn.parentElement.childNodes].filter(n => n instanceof Text)) {
            const strikethrough = document.createElement("s");
            strikethrough.innerText = text.textContent.trim();
            text.parentElement.replaceChild(strikethrough, text);
        }
        rememberBtn.parentElement.appendChild(document.createElement("br"));
        rememberBtn.parentElement.appendChild(document.createTextNode("You will not be asked to confirm permissions for this App again, even if the permissions change. (Quality of RWTH)"));
    }

    button.addEventListener("click", () => {
        if(!rememberBtn.checked) {
            // Shouldn't remember
            if(known.includes(app)) {
                known.splice(known.indexOf(app), 1);
                browser.storage.sync.set({ authorizedApps: known });
            }
            return;
        }
        if(known.includes(app)) return;
        known.push(app);
        browser.storage.sync.set({ authorizedApps: known });
    });

    // Reject button
    form.getElementsByClassName("btn-danger")[0].addEventListener("click", () => {
        // Shouldn't remember
        if(known.includes(app)) {
            known.splice(known.indexOf(app), 1);
            browser.storage.sync.set({ authorizedApps: known });
        }
    });
}

async function onAutoOAuthAuthorize() {
    const app = document.getElementsByClassName("text-info")[0].innerText;
    const known = (await browser.storage.sync.get("authorizedApps")).authorizedApps || [];
    const button = document.getElementsByTagName("form")[0].getElementsByClassName("btn-primary")[0];

    const setting = (await browser.storage.sync.get("autoAuthorize")).autoAuthorize;

    if(setting === "always") {
        // Don't save as actively consented
        button.click();
        return;
    }

    if(known.includes(app)) {
        if(setting === undefined || setting === "confirmOnce")
            button.click();
        return;
    }

    button.addEventListener("click", () => {
        if(known.includes(app)) return; // If clicked multiple times somehow
        known.push(app);
        browser.storage.sync.set({ authorizedApps: known });
    })
}

function onAuthorizeDone() {
    browser.runtime.sendMessage({ command: "closeThisTabAndReload"});
}

function onPDFAnnotator() {
    let url = document.getElementById("myprinturl");
    if(!url) return;
    url = url.innerText.replace(/\??forcedownload=1/, "");
    history.replaceState(null, "", url);
    location.href = url;
}

function onSSO() {
    addAutofillListener(
        document.getElementById("username"),
        document.getElementById("password"),
        document.getElementById("login")
    );
}

function onMailLogin() {
    addAutofillListener(
        document.getElementById("username"),
        document.getElementById("password"),
        document.getElementsByClassName("signinbutton")[0]
    );
}

function addAutofillListener(username, password, submit) {
    if(!(username && password && submit)) return;

    if(username.value !== "" && password.value !== "") {
        console.log("Password already entered");
        return submit.click();
    }

    let oldVal = "";
    let listener = () => {
        if(password.value.length > oldVal.length + 5 && username.value.length >= 8)
            submit.click();
        oldVal = password.value;
    };
    password.addEventListener("keyup", listener);
    password.addEventListener("input", listener);
    password.addEventListener("change", listener);

    submit.addEventListener("click", () => setTimeout(() => submit.disabled = true));
}

function onURLResource() {
    const div = document.querySelector("[role=main]");
    if(!div) return;
    const a = div.getElementsByTagName("a")[0];
    if(!a) return;
    history.replaceState(null, "", location.href.replace("?", "?stay=true&"));
    a.click();
}

async function searchOpencastVideo() {
    let videoInfos = [];
    for(const iframe of document.getElementsByTagName("iframe")) {
        if(!iframe) continue;
        if(iframe.className === "ocplayer") {
            videoInfos.push(await getVideoInfo(iframe.getAttribute("data-framesrc").match(/play\/(.{36})/)[1]));
        }
        else if(iframe.id === "contentframe" && location.href.includes("mod/lti/view.php")) {
            const id = location.search.match(/id=(\d+)/)[1];
            console.log("Video ID:", id);

            const uuid = (await fetch("https://moodle.rwth-aachen.de/mod/lti/launch.php?id="+id).then(r => r.text())).match(/name\s*=\s*"custom_id"\s*value\s*=\s*"(.{36})"/)[1];

            videoInfos.push(await getVideoInfo(uuid));
        }
    }
    if(videoInfos.length === 0) return;

    let allVideoInfos = (await browser.runtime.sendMessage({ command: "getStorage", storage: "local", name: "videoInfos" })).videoInfos || {};
    allVideoInfos[location.href] = videoInfos;

    // Migrate from old version where only one video per page was possible
    for(const key in allVideoInfos)
        if(!(allVideoInfos[key] instanceof Array))
            allVideoInfos[key] = [allVideoInfos[key]];

    // Remove any empty entries which were written in a previous version where there was no check whether they were empty before written
    for(const key of Object.keys(allVideoInfos))
        if(allVideoInfos[key].length === 0)
            delete allVideoInfos[key];

    if(Object.keys(allVideoInfos).length > 10) {
        allVideoInfos = Object.entries(allVideoInfos).sort(([_1,a],[_2,b]) => b[0].time - a[0].time);
        allVideoInfos.length = 10;
        allVideoInfos = allVideoInfos.reduce((obj, [k,v]) => ({ ...obj, [k]: v }), {});
    }
    await browser.runtime.sendMessage({ command: "setStorage", storage: "local", data: { videoInfos: allVideoInfos } })
}

async function loadVideoData(uuid) {
    const info = await getVideoInfo(uuid);

    let videoInfos = (await browser.runtime.sendMessage({ command: "getStorage", storage: "local", name: "videoInfos" })).videoInfos || {};
    videoInfos[location.href] = info;
    if(Object.keys(videoInfos).length > 10) {
        videoInfos = Object.entries(videoInfos).sort(([_1,a],[_2,b]) => b.time - a.time);
        videoInfos.length = 10;
        videoInfos = videoInfos.reduce((obj, [k,v]) => ({ ...obj, [k]: v }), {});
    }
    await browser.runtime.sendMessage({ command: "setStorage", storage: "local", data: { videoInfos: videoInfos } })
}

async function getVideoInfo(uuid) {
    console.log("Video UUID:", uuid);
    let data = (await fetch("https://engage.streaming.rwth-aachen.de/search/episode.json?id="+uuid, { credentials: "include" }).then(r => r.json()))["search-results"];

    while(data.total === 0) {
        // For whatever reason this happens sometimes, but refreshing fixes it... maybe the _=... query parameter is not irrelevant, but it works fine like this so whatever
        console.log("Video data not received, trying again in 500ms...");
        await new Promise(r => setTimeout(r, 500));
        data = (await fetch("https://engage.streaming.rwth-aachen.de/search/episode.json?id="+uuid, { credentials: "include" }).then(r => r.json()))["search-results"];
    }

    console.log("Video data:", data);
    const tracks = data.result.mediapackage.media.track;
    return {
        tracks: tracks.filter(t => t.mimetype === "video/mp4" && t.video.resolution.length >= 8 /* at least 720p */)
                      .map(t => ({ url: t.url, resolution: t.video.resolution })),
        stream: (tracks.find(t => t.mimetype === "application/x-mpegURL") || {}).url,
        time: Date.now()
    };
}

function removeChatPopup() {
    let page = document.getElementById("page");
    if(!page) return;

    function hide() {
        for(const e of page.getElementsByClassName("chat-support-vert"))
            e.hidden = true;
    }
    hide();
    new MutationObserver(hide).observe(page, { childList: true });
}

function acceptCookies() {
    const ok = document.getElementById("cookie-confirm-btn");
    if(ok) ok.click();
}

async function onEmbeddedHiwiLogin() {

    let password = document.getElementsByName("password")[0];
    let username = document.getElementsByName("username")[0];
    if(!(password && password)) return; // This should never happen

    const parent = username.parentElement;
    const usernameIndex = Array.prototype.indexOf.call(parent.childNodes, username);
    const passwordIndex = Array.prototype.indexOf.call(parent.childNodes, password);

    username.remove();
    password.remove();

    username = document.createElement("input");
    password = document.createElement("input");
    username.classList = password.classList = "pretext";
    username.id = username.name = username.type = username.autocomplete = "username";
    password.id = password.name = password.type = password.autocomplete = "password";

    parent.insertBefore(username, parent.childNodes[usernameIndex]);
    parent.insertBefore(password, parent.childNodes[passwordIndex]);

    // If we are already logged in, the page still loads as login page at first and later removes the login fields.
    // At least on firefox this leads to the saved passwords panel always being visible, and not being hidden even
    // though the respective input field has already been removed. Thus, wait a bit and hope that by now the proper
    // website has been loaded
    await new Promise(r => setTimeout(r, 250));
    if(document.getElementById("logout")) return;

    username.focus();

    addAutofillListener(username, password, document.getElementById("login_submit"));
}

async function onPSPDarkMode() {
    const btn = await when(() => [...document.getElementsByClassName("mb-2 v-btn v-btn--block v-btn--is-elevated v-btn--has-bg v-size--small")].filter(b => b.innerText.toLowerCase().includes("theme"))[0]);
    const mode = (await browser.storage.sync.get("lightMode")).lightMode ? "theme--light" : "theme--dark";
    while(!btn.className.includes(mode)) {
        btn.click();
        await new Promise(r => setTimeout(r));
    }
}

async function clearPSPBoxes() {
    const btn = await when(() => document.getElementsByClassName("ml-auto hover-row-button v-btn")[0]);
    btn.addEventListener("click", () => {
        [...document.getElementsByTagName("input")].filter(i => i.type === "checkbox" && i.checked).forEach(c => c.click());
    });
}

async function addPSPKickFunction() {

    const kickBtn = await when(() => document.getElementsByClassName("v-btn v-btn--text v-size--default")[7]);
    const divider = kickBtn.nextSibling;
    kickBtn.parentElement.insertBefore(divider.cloneNode(true), divider);

    const btn = kickBtn.cloneNode(true);
    btn.title = "Sofort kicken";
    btn.classList = document.getElementsByClassName("v-btn v-btn--text v-size--default")[10].classList;
    btn.style.color = "red";
    kickBtn.parentElement.insertBefore(btn, divider);

    btn.children[0].addEventListener("click", async () => {
        const selectedNames = [...document.getElementsByTagName("tbody")[0].children]
            .filter(r => r.getElementsByClassName("mdi-checkbox-marked").length !== 0)
            .map(r => r.children[2].innerText);
        if(selectedNames.length === 0) return;

        const sessions = (await fetch(location.origin+"/api/vmm/vm").then(r => r.json()))
            .filter(vm => selectedNames.filter(n => vm.name.endsWith(n)).length !== 0)
            .map(vm => vm.session.id);
        const token = document.cookie.split(";")
            .filter(c => c.startsWith("XSRF-TOKEN="))[0]
            .substring("XSRF-TOKEN=".length);
        for(const session of sessions)
            await fetch(location.origin+"/api/vmm/session/"+session, { method: "DELETE", headers: { "X-CSRF-Token": token } });
        alert("You monster");
    });
}

async function addPSPCtrlEnterSubmit() {
    const textarea = await when(() => document.querySelector("textarea"));
    const submit = await when(() => document.querySelector("input[type=submit]"));
    textarea.addEventListener("keyup", e => {
        if(e.key === "Enter" && e.ctrlKey)
            submit.click();
    });
}

async function addPSPCheckboardHoverInfo() {
    await when(() => document.querySelector("input[type=checkbox]"))
    for(const input of document.querySelectorAll("input[type=checkbox]")) {
        let td = input.parentElement;
        while(td && td.tagName !== "TD") td = td.parentElement;
        if(!td) return;

        const team = td.parentElement.children[0].innerText.trim();

        let tbody = td.parentElement;
        while(tbody.tagName !== "TBODY") tbody = tbody.parentElement;
        const thead = tbody.previousElementSibling;
        const task = thead.children[0].children[[...td.parentElement.children].indexOf(td)].innerText.trim();
        const route = task === "Nachbefragung" ? "questioning" : "task/"+task;

        input.onmouseover = async () => {
            const info = await fetch(`${location.origin}/api/checkboard/desk/${team}/${route}`).then(r => r.json());
            const changeTimeDiff = Math.round((Date.now() - info.last_change) / (1000 * 60))
            td.title = `Letzte Änderung durch ${info.changed_by.name} vor ${changeTimeDiff !== 1 ? changeTimeDiff+" Minuten" : "einer Minute"}`;
        }
    }
}



function moodleLogin() {
    location.href = "https://moodle.rwth-aachen.de/auth/shibboleth/index.php";
}

function when(condition, pollingInterval = 100) {
    const poll = resolve => {
        value = condition();
        if(value) resolve(value);
        else setTimeout(() => poll(resolve), pollingInterval);
    }
    return new Promise(poll);
}
