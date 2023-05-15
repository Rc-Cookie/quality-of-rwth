const topMessage = document.getElementById("top-message");
const topRule = document.getElementById("top-rule");
const list = document.getElementById("list");
const bottomRule = document.getElementById("bottom-rule");
const bottomMessage = document.getElementById("bottom-message");

main();

function main() {
    tryLoadCachedCourses();
    browser.storage.local.onChanged.addListener(onStorageChanged);
    loadCourses();
}

function onStorageChanged(change) {
    if(change.sesskey) loadCourses(true);
}

async function tryLoadCachedCourses() {
    const cache = (await browser.storage.local.get("courseCache")).courseCache;
    if(cache) return buildHTML(cache);
}

async function cacheCourses(courses) {
    await browser.storage.local.remove("courseCache");
    await browser.storage.local.set({ courseCache: courses })
}

async function loadCourses(isRetry) {
    const sesskey = (await browser.storage.local.get("sesskey")).sesskey;
    if(!sesskey) {
        bottomMessage.innerText = "You are not logged in.";
        bottomMessage.hidden = false;
        bottomRule.hidden = list.hidden;
    }

    bottomMessage.innerText = "Refreshing courses...";
    bottomMessage.hidden = !isRetry;
    bottomRule.hidden = !isRetry || list.hidden;

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

    if(!resp[0].error) {
        bottomMessage.hidden = bottomRule.hidden = true;
        buildHTML(resp[0].data.courses);
        cacheCourses(resp[0].data.courses, byTime);
    }
    else if(!isRetry && resp[0].exception.errorcode === "invalidsesskey")
        tryFetchSesskey();
    else {
        if(resp[0].exception.errorcode === "servicerequireslogin")
            bottomMessage.innerText = "You are not logged in.";
        else if(resp[0].exception.errorcode === "invalidsesskey")
            bottomMessage.innerText = "Your moodle session has timed out, courses could not be refreshed.";
        else {
            bottomMessage.innerText = "Failed to refresh courses. Maybe you are not logged in?";
            console.error("Unexpected error:", resp[0].exception);
        }
        bottomMessage.hidden = false;
        bottomRule.hidden = list.hidden;
    }
}

function buildHTML(courses) {
    list.replaceChildren();

    list.hidden = false;
    topRule.hidden = topMessage.hidden;
    bottomRule.hidden = bottomMessage.hidden;

    for(const i in courses) {
        const course = courses[i];

        async function updateCache() {
            if((await browser.storage.sync.get("courseOrder")).courseOrder === "name") return;
            // Cache that this course is now most likely on top
            let newCache = [];
            newCache[0] = courses[i];
            for(let j=1; j<courses.length; j++)
                newCache[j] = courses[j<=i ? j-1 : j];
            cacheCourses(newCache);
        }

        const name = course.shortname;
        const main = getMainName(name);

        const b = document.createElement("b");
        b.innerText = main;
        const before = document.createTextNode(name.substring(0, name.indexOf(main)));
        const after = document.createTextNode(name.substring(name.indexOf(main) + main.length));

        const div = document.createElement("div");
        div.className = "item clickable-item";
        div.onclick = e => {
            updateCache();
            if(e.ctrlKey)
                document.location.href = course.viewurl;
            else {
                browser.tabs.update({ url: course.viewurl });
                window.close();
            }
        };
        div.onauxclick = e => {
            if(e.button !== 1) return;
            e.preventDefault();

            updateCache();
            browser.tabs.create({ url: course.viewurl });
            window.close();
        }
        div.appendChild(before);
        div.appendChild(b);
        div.appendChild(after);
        list.appendChild(div);

        // const imgSrc = course.courseimage;
        // if(imgSrc.startsWith("data:image/svg+xml;base64,")) {
        //     console.log("Adding svg")
        //     const span = document.createElement("span");
        //     span.innerHTML = atob(imgSrc.substring(26));
        //     span.children[0].style.width = "100%";
        //     list.appendChild(span);
        // }
        // else if(imgSrc.startsWith("http")) {
        //     console.log("Adding image");
        //     const img = document.createElement("img");
        //     img.src = imgSrc;
        //     img.style.width = "100%";
        //     list.appendChild(img);
        // }
    }
}

function getMainName(name) {
    const segments = name.split(/\([^)]*\)/);
    let max = 0;
    for(let i=1; i<segments.length; i++)
        if(segments[i].length > segments[max]) max = i;
    return segments[max];
}

function createItem(onclick) {
    const div = document.createElement("div");
    div.className = onclick ? "item clickable-item" : "item";
    if(onclick)
        div.onclick = onclick;
    return div;
}

async function tryFetchSesskey() {
    console.log("Trying to fetch session key...");

    bottomMessage.innerText = "Refreshing courses...";
    bottomMessage.hidden = false;
    bottomRule.hidden = list.hidden;

    const html = await fetch("https://moodle.rwth-aachen.de/course/view.php").then(r => r.text()); // This page does not exist without courseid, but thus loads quickly
    console.log("(This 404 is on purpose, not an error)");

    const sesskey = html.match(/(sesskey=[a-zA-Z0-9]{10})/)
    if(sesskey === null) return buildNotLoggedInHTML();

    browser.storage.local.set({ sesskey: sesskey[0].substring(8) }); // Invokes onChanged
}
