const browser = chrome;

let functions = {
    moodleStartAutoForward: {
        regex: /^moodle\.rwth-aachen\.de$/,
        action: onMoodleLoginPage
    },
    rwthOnlineLoginAutoForward: {
        regex: /^online\.rwth-aachen\.de\/RWTHonline\/ee\/ui\/ca2\/app\/desktop\/#\/login$/,
        action: onRWTHOnlineLoginPage
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
    }
}

main();

async function main() {

    let url = location.href.replace(/https?\:\/\//, "");
    if(url.endsWith("/"))
        url = url.substring(0, url.length - 1);

    for(let [name, info] of Object.entries(functions)) {
        if(!url.match(info.regex)) continue;
        console.log(name);
        browser.storage.sync.get(name).then(settings => {
            if((settings[name] === undefined && info.default !== false) || settings[name] === true)
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
        return console.error("Failed to load courses");

    // await browser.runtime.sendMessage({ command: "removeStorage", storage: "local", name: "courseCache" });
    await browser.runtime.sendMessage({ command: "setStorage", storage: "local", data: { courseCache: resp[0].data.courses } })
}

function onMoodleLoginPage() {
    location.href = "https://moodle.rwth-aachen.de/auth/shibboleth/index.php";
}

function onRWTHOnlineLoginPage() {
    when(() => document.getElementsByClassName("ca-button btn btn-primary btn-block").length != 0).then(() => {
        location.href = "https://online.rwth-aachen.de/RWTHonline/Login";
    });
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
    password.addEventListener("keyup", () => typed = true);
    password.onchange = () => { if(!typed) login.click(); }
}

function onURLResource() {
    const div = document.querySelector("[role=main]");
    if(!div) return;
    const a = div.getElementsByTagName("a")[0];
    if(!a) return;
    history.replaceState(null, "", location.href.replace("?", "?stay=true&"));
    a.click();
}

function when(condition) {
    const poll = resolve => {
        if(condition()) resolve();
        else setTimeout(() => poll(resolve), 100);
    }
    return new Promise(poll);
}
