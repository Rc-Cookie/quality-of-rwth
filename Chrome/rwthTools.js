const browser = chrome;

let functions = {
    registerActiveTab: {
        regex: /.*/,
        action: registerActiveTab,
        allowSubsequent: true
    },
    moodleStartAutoForward: {
        regex: /^moodle\.rwth-aachen\.de$/,
        action: onMoodleLoginPage
    },
    rwthOnlineLoginAutoForward: {
        regex: /^online\.rwth-aachen\.de\/RWTHonline\/ee\/ui\/ca2\/app\/desktop\/#\/login$/,
        action: onRWTHOnlineLoginPage
    },
    videoAGAutoLoginForward: {
        regex: /^(video\.fsmpi\.rwth-aachen\.de|rwth\.video)\/[^\/]+\/\d+$/,
        action: onVideoAG,
        allowSubsequent: true
    },
    autoSelectInstitution: {
        regex: /^oauth\.campus\.rwth-aachen\.de\/login\/shibboleth\/?(\?.*)?$/,
        action: onSelectInstitution
    },
    autoAuthorize: {
        regex: /^oauth\.campus\.rwth-aachen\.de\/manage\/?\?q=verify/,
        action: onAutoAuthorize,
        allowSubsequent: true,
        setting: "" // Always run to store the known apps
    },
    autoCloseAfterAuthorize: {
        regex: /^oauth\.campus\.rwth-aachen\.de\/manage\/?\?.*q=authorized/,
        action: onAuthorizeDone
    },
    ssoAutoSubmit: {
        regex: /^sso\.rwth-aachen\.de\/idp\/profile\/SAML2\/Redirect\/SSO/,
        action: onSSO,
        allowSubsequent: true
    },
    searchSessionKey: {
        regex: /^moodle\.rwth-aachen\.de/,
        action: searchSessionKey,
        allowSubsequent: true
    },
    skipPDFAnnotator: {
        regex: /^moodle\.rwth-aachen\.de\/mod\/pdfannotator\/view\.php/,
        action: onPDFAnnotator
    },
    clickURLResources: {
        regex: /^moodle\.rwth-aachen.de\/mod\/url\/view\.php\?(?!stay=true)/,
        action: onURLResource
    },
    searchOpencastVideo: {
        regex: /^moodle/,
        action: searchOpencastVideo,
        allowSubsequent: true
    },
    removeChatPopup: {
        regex: /^moodle/,
        action: removeChatPopup,
        allowSubsequent: true
    }
    // loadVideoData: {
    //     regex: /^moodle\.rwth-aachen\.de\/mod\/lti\/view\.php/,
    //     action: onVideo
    // }
}

main();

async function main() {

    let url = location.href.replace(/https?\:\/\//, "");
    if(url.endsWith("/"))
        url = url.substring(0, url.length - 1);

    for(let [name, info] of Object.entries(functions)) {
        if(!url.match(info.regex)) continue;
        console.log(name);
        const settingsName = info.setting || name;
        browser.storage.sync.get(settingsName).then(settings => {
            if((settings[settingsName] === undefined && info.default !== false) || settings[settingsName] === true)
                info.action();
        });
        if(!info.allowSubsequent) return;
    }
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

function onMoodleLoginPage() {
    location.href = "https://moodle.rwth-aachen.de/auth/shibboleth/index.php";
}

function onRWTHOnlineLoginPage() {
    when(() => document.getElementsByClassName("ca-button btn btn-primary btn-block").length != 0).then(() => {
        location.href = "https://online.rwth-aachen.de/RWTHonline/Login";
    });
}

function onVideoAG() {
    const a = document.getElementsByClassName("reloadonclose")[0];
    if(a) browser.runtime.sendMessage({ command: "browser.tabs.create", data: { url: a.href } });
}

async function onSelectInstitution() {
    const index = (await browser.storage.sync.get("intitution")).institution == "jülich" ? 1 : 0;
    document.getElementsByClassName("row")[0].children[index].getElementsByTagName("a")[0].click();
}

async function onAutoAuthorize() {
    const app = document.getElementsByClassName("text-info")[0].innerText;
    const known = (await browser.storage.sync.get("authorizedApps")).authorizedApps || [];
    const button = document.getElementsByTagName("form")[0].getElementsByClassName("btn")[0];

    if(known.includes(app)) {
        if((await browser.storage.sync.get("autoAuthorize")).autoAuthorize !== false)
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
    let username = document.getElementById("username");
    let password = document.getElementById("password");
    let login = document.getElementById("login");

    if(!(username && password && login)) return;

    if(username.value !== "" && password.value !== "") {
        console.log("Password already entered");
        return login.click();
    }

    let typed = false;
    password.onkeyup = () => typed = true;
    password.onchange = () => { if(!typed) login.click(); }
    login.onclick = () => setTimeout(() => login.disabled = true);
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
    const iframe = document.getElementsByTagName("iframe")[0];
    if(!iframe) return;
    if(iframe.className === "ocplayer") {
        return await loadVideoData(iframe.getAttribute("data-framesrc").match(/play\/(.{36})/)[1]);
    }
    if(iframe.id === "contentframe" && location.href.includes("mod/lti/view.php")) {
        const id = location.search.match(/id=(\d+)/)[1];
        console.log("Video ID:", id);

        const uuid = (await fetch("https://moodle.rwth-aachen.de/mod/lti/launch.php?id="+id).then(r => r.text())).match(/name\s*=\s*"custom_id"\s*value\s*=\s*"(.{36})"/)[1];

        return await loadVideoData(uuid);
    }
}

async function loadVideoData(uuid) {
    console.log("Video UUID:", uuid);
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


function when(condition) {
    const poll = resolve => {
        if(condition()) resolve();
        else setTimeout(() => poll(resolve), 100);
    }
    return new Promise(poll);
}
