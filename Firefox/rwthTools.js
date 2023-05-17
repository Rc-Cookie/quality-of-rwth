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

function searchSessionKey() {
    const node = document.getElementsByName("sesskey")[0];
    if(!node) return console.log("No session key found");
    const sesskey = node.value;
    browser.storage.local.set({ sesskey: sesskey });
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
