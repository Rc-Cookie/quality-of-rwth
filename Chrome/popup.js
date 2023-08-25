const browser = chrome;

const listArea = document.getElementById("course-list");
const listContainer = document.getElementById("course-list-container");

const downloadArea = document.getElementById("video-download");
const video1080p = document.getElementById("video-1080p");
const video720p = document.getElementById("video-720p");
const videoStreamingLink = document.getElementById("video-streaming-link")

const footer = document.getElementById("footer");
const bottomMessage = document.getElementById("bottom-message");
const searchInput = document.getElementById("search");

let search = "";

main();

function main() {
    tryLoadCachedCourses();
    browser.storage.local.onChanged.addListener(onStorageChanged);
    loadCourses();
    tryLoadVideoDownloads();
    
    // init search
    searchInput.addEventListener("input", e => {
        const query = e.target.value;
        search = query;
        rebuilt();
    })

    searchInput.addEventListener("keydown", e => {
        if(e.key === "ArrowDown") {
            if(listContainer.childElementCount !== 0)
                listContainer.children[0].focus();   
        }
        else if(e.key === "ArrowUp") {
            if(listContainer.childElementCount !== 0)
                listContainer.children[listContainer.childElementCount-1].focus();
        }
    });
    searchInput.addEventListener("keyup", e => {
        if(e.key === "Enter") {
            if(search && listContainer.childElementCount === 1)
                listContainer.children[0].click();
            else if(listContainer.childElementCount !== 0)
                listContainer.children[0].focus();   
        }
    });

    document.onkeydown = e => {
        searchInput.focus();
        searchInput.dispatchEvent(new KeyboardEvent("keydown", { "key": e.key }))
    }
}

async function rebuilt() {
    const cache = (await browser.storage.local.get("courseCache")).courseCache;
    if (!cache) loadCourses(true);
    else buildHTML(cache);
}

function onStorageChanged(change) {
    if(change.sesskey) loadCourses(true);
    else if(change.courseCache && change.courseCache.newValue)
        buildHTML(change.courseCache.newValue);
    else if(change.videoInfos)
        tryLoadVideoDownloads();
}

async function tryLoadCachedCourses() {
    const cache = (await browser.storage.local.get("courseCache")).courseCache;
    if(cache) return buildHTML(cache);
}

async function cacheCourses(courses) {
    await browser.storage.local.set({ courseCache: courses })
}

async function loadCourses(isRetry) {
    const sesskey = (await browser.storage.local.get("sesskey")).sesskey;
    if(!sesskey) {
        bottomMessage.innerText = "You are not logged in.";
        footer.hidden = false;
        return;
    }

    bottomMessage.innerText = "Refreshing courses...";
    footer.hidden = !isRetry;

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
        footer.hidden = true;
        buildHTML(resp[0].data.courses);
        cacheCourses(resp[0].data.courses);
    }
    else if(!isRetry && (resp[0].exception.errorcode === "servicerequireslogin" || resp[0].exception.errorcode === "invalidsesskey"))
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
        footer.hidden = false;
        // if(listContainer.childElementCount === 0)
        //     searchInput.hidden = true;
    }
}

function buildHTML(courses) {

    let shownCourses;
    if(search) {
        shownCourses = courses.filter(searchMatch);
        shownCourses.sort((a,b) => searchMatch(a) - searchMatch(b));
    }
    else shownCourses = courses;
    
    searchInput.hidden = false;

    listContainer.replaceChildren();
    listArea.hidden = false;

    for(const i in shownCourses) {
        const course = shownCourses[i];

        async function updateCache() {
            if((await browser.storage.sync.get("courseOrder")).courseOrder === "name") return;
            // Cache that this course is now most likely on top
            let newCache = [];
            newCache[0] = course;

            // Cache actual courses, not shown courses
            let offset = -1;
            for(let j=1; j<courses.length; j++) {
                if(courses[j] === shownCourses[i]) offset = 0;
                newCache[j] = courses[j + offset];
            }
            cacheCourses(newCache);
        }

        const name = course.shortname;
        const main = getMainName(name);

        const b = document.createElement("b");
        b.innerText = main;
        const before = document.createTextNode(name.substring(0, name.indexOf(main)));
        const after = document.createTextNode(name.substring(name.indexOf(main) + main.length));

        const a = document.createElement("a");
        a.href = course.viewurl;

        const div = document.createElement("div");
        div.className = "base-item item clickable-item";
        div.tabIndex = -1; // Required to be able to be focused
        div.onclick = e => {
            e.preventDefault();
            updateCache();
            if(false) // Chrome popups don't support loading a website into the popup - at least not out of the box
                document.location.href = course.viewurl;
            else browser.storage.sync.get("openInNewTab").then(s => {
                if(s.openInNewTab)
                    browser.tabs.create({ url: course.viewurl });
                else browser.tabs.update({ url: course.viewurl });
                window.close();
            });
        };
        div.onauxclick = e => {
            if(e.button !== 1) return;
            e.preventDefault();

            updateCache();
            browser.storage.sync.get("openInNewTab").then(s => {
                if(s.openInNewTab) // Inverse of regular action
                    browser.tabs.update({ url: course.viewurl });
                else browser.tabs.create({ url: course.viewurl });
                window.close();
            });
        }
        div.onkeydown = e => {
            if(e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.stopPropagation();
                listContainer.children[([...listContainer.children].indexOf(a) + (e.key === "ArrowDown" ? 1 : -1) + listContainer.childElementCount) % listContainer.childElementCount].focus();
            }
            else if(e.key == "Enter" || e.key == " ") {
                e.stopPropagation();
                div.dispatchEvent(new MouseEvent("click", { ctrlKey: e.ctrlKey }));
            }
        };
        div.appendChild(before);
        div.appendChild(b);
        div.appendChild(after);

        a.appendChild(div);
        a.onclick = div.onclick;
        a.onauxclick = div.onauxclick;
        a.onkeydown = div.onkeydown;
        a.onfocus = () => div.focus();

        listContainer.appendChild(a);
    }
}

function getMainName(name) {
    const segments = name.split(/\([^)]*\)/);
    let max = 0;
    for(let i=1; i<segments.length; i++)
        if(segments[i].length > segments[max]) max = i;
    return segments[max];
}

async function tryFetchSesskey() {
    console.log("Trying to fetch session key...");

    bottomMessage.innerText = "Refreshing courses...";
    footer.hidden = false;

    const html = await fetch("https://moodle.rwth-aachen.de/course/view.php").then(r => r.text()); // This page does not exist without courseid, but thus loads quickly
    console.log("(This 404 is on purpose, not an error)");

    const sesskey = html.match(/(sesskey=[a-zA-Z0-9]{10})/)
    if(sesskey === null) {
        bottomMessage.innerText = "You are not logged in.";
        return;
    }

    browser.storage.local.set({ sesskey: sesskey[0].substring(8) }); // Invokes onChanged
}



async function tryLoadVideoDownloads() {
    const tab = await browser.runtime.sendMessage({ command: "getActiveTab" });
    if(!tab || !tab.url) return;
    const info = ((await browser.storage.local.get("videoInfos")).videoInfos || {})[tab.url];
    if(!info) return;

    const track1080p = info.tracks.find(t => t.resolution === "1920x1080");
    const track720p = info.tracks.find(t => t.resolution === "1280x720");
    video1080p.hidden = !track1080p;
    video720p.hidden = !track720p;
    video1080p.onclick = () => browser.downloads.download({ url: track1080p.url });
    video720p.onclick = () => browser.downloads.download({ url: track720p.url });

    videoStreamingLink.hidden = !info.stream;
    videoStreamingLink.onclick = () => navigator.clipboard.writeText(info.stream);

    downloadArea.hidden = false;
}



function searchMatch(item) {
    item = item.shortname ? item.shortname : item;

    const lowerItem = item.toLowerCase();

    let start = 0;
    let quality = 1; // Higher is worse
    for(let i=0; i<search.length; i++) {
        let char = search.charAt(i);
        let index;

        // Upper case characters only match upper case, lower case matches both upper and lower case chars
        if(char === char.toLowerCase())
            index = lowerItem.indexOf(char, start);
        else index = item.indexOf(char, start);

        if(index < start) return false; // Not found

        quality += index - start; // Add number of characters skipped
        if(item.charAt(index) != char) // char is lower case but matched upper case
            quality++;

        start = index + 1;
    }
    if(start != item.length) quality += 5; // If you type the full word it should be a better match

    return quality;
}
