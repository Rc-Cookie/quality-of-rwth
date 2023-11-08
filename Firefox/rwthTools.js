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
        regex: /^psp\.embedded\.rwth-aachen\.de/,
        action: onPSPLogin
    },
    // Select "Remember me" and click "login" on the git.rwth-aachen page
    autoGitLoginForward: {
        regex: /^git\.rwth-aachen\.de\/users\/sign_in\/?$/,
        action: onGitLoginPage
    },
    // Automatically select a specific institution if you are asked to
    autoSelectInstitution: {
        regex: /^oauth\.campus\.rwth-aachen\.de\/login\/shibboleth\/?(\?.*)?$/,
        action: onSelectInstitution
    },
    // Automatically select a specific institution if you are asked to, for the git page version
    autoSelectGitInstitution: {
        regex: /^git\.rwth-aachen\.de\/shibboleth-ds\/?(\?.*)?$/,
        action: onSelectGitInstitution,
        setting: "autoSelectInstitution"
    },
    // Automatically click "Authorize" if you have to, if you already authorized the same app before
    autoAuthorize: {
        regex: /^oauth\.campus\.rwth-aachen\.de\/manage\/?\?q=verify/,
        action: onAutoAuthorize,
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
    autoEmbeddedHiwiLogin: {
        regex: /^.*\.embedded\.rwth-aachen\.de/,
        action: onEmbeddedHiwiLogin,
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
            if((settings[settingsName] === undefined && info.default !== false) || settings[settingsName] === true) try {
                info.action();
            } catch(error) {
                console.error(error);
            }
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

function onGuestDashboard() {
    const h = document.getElementsByTagName("h1")[0];
    if(h && h.innerText.match(/\((?:Gast|Guest)\)/)) // When logging in, its first an <h2>. If you access the dashboard when already logged in its an <h1> for whatever reason
        moodleLogin();
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
        const box = document.getElementById("remember_me_omniauth");
        if(box) box.checked = true;
    }
    document.getElementById("oauth-login-saml").click();
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
