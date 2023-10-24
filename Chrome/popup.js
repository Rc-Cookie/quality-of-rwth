const browser = chrome;

const listArea = document.getElementById("course-list");
const listContainer = document.getElementById("course-list-container");
const coursePrefab = document.getElementById("course-prefab");
coursePrefab.remove();

const downloadArea = document.getElementById("video-download");
const video1080p = document.getElementById("video-1080p");
const video720p = document.getElementById("video-720p");
const videoStreamingLink = document.getElementById("video-streaming-link")

const footer = document.getElementById("footer");
const bottomMessage = document.getElementById("bottom-message");
const searchInput = document.getElementById("search");

let courses = [];
let allCoursesLoaded = false;

let search = "";

main();

function main() {
    tryLoadCachedCourses();
    // No need to check for hidden courses change - if you would click on a course to remove it,
    // the popup window would loose focus and close anyways
    browser.storage.local.onChanged.addListener(onStorageChanged);
    loadCourses();
    tryLoadVideoDownloads();

    // init search
    searchInput.addEventListener("input", e => {
        const query = e.target.value;
        search = query;
        buildHTML();
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

function onStorageChanged(change) {
    if(change.sesskey) loadCourses(true);
    // else if(change.courseCache && change.courseCache.newValue) {
    //     buildHTML();
    // }
    else if(change.videoInfos)
        tryLoadVideoDownloads();
}

async function tryLoadCachedCourses() {
    const cache = (await browser.storage.local.get("courseCache")).courseCache;
    if(!cache) return;

    allCoursesLoaded = (await browser.storage.local.get("courseCacheIsComplete")).courseCacheIsComplete === true;
    courses = cache;

    await buildHTML();
}

async function cacheCourses() {
    await browser.storage.local.set({
        courseCache: courses,
        courseCacheIsComplete: allCoursesLoaded
    });
}

async function getHiddenCourses() {
    const storageData = (await browser.storage.sync.get("hiddenCourses")).hiddenCourses;
    if(!storageData) return { ids: [], data: {} };

    const hidden = [];
    for(let idStr of Object.keys(storageData))
        hidden.push(parseInt(idStr));
    return { ids: hidden, data: storageData };
}

async function loadCourses(isRetry) {
    // Get session key. Should have been assigned whenever a moodle page was loaded. May be outdated though.
    const sesskey = (await browser.storage.local.get("sesskey")).sesskey;
    if(!sesskey) {
        if(!isRetry)
            tryFetchSesskey(); // Will re-trigger loadCourses() if successful
        else {
            bottomMessage.innerText = "You are not logged in.";
            footer.hidden = false;
        }
        return;
    }

    bottomMessage.innerText = "Refreshing courses...";
    footer.hidden = !isRetry;

    // Load preferences
    const byTime = (await browser.storage.sync.get("courseOrder")).courseOrder !== "name"; // Default to true
    const hidden = (await getHiddenCourses()).ids;
    const maxCourses = (await browser.storage.sync.get("maxCourses")).maxCourses || 10;

    // In the first request we request just enough courses so we can fill the popup panel, but we will have
    // to do another request to get the remaining courses so that we can search for them, too. Ideally one would
    // just request all courses at once, but Moodle gets incredibly slow for bigger numbers of requested courses
    // (limit = 10 -> <0.5s, limit = 40 -> ~3s)
    const resp = await fetch("https://moodle.rwth-aachen.de/lib/ajax/service.php?sesskey="+sesskey, {
        method: "post",
        body: JSON.stringify([{
            index: 0,
            methodname: "core_course_get_enrolled_courses_by_timeline_classification",
            args: {
                offset: 0,
                limit: maxCourses + hidden.length, // Worst case: all hidden courses are before the first maxCourses non-hidden courses
                classification: byTime ? "all" : "inprogress", // When sorting by name, don't show inactive courses. When sorting by access, old courses should be further down automatically
                sort: byTime ? "ul.timeaccess desc" : "fullname"
            }
        }])
    }).then(r => r.json());

    if(!resp[0].error) {

        // This does not properly work if the cache was created in an old version (?) but we can use it without
        // reducing the number of requests to have the older courses already available for search (if it works).

        // We only loaded the latest courses, but maybe the latest courses were already the latest courses last time.
        // In that case, we can just replace the first part of the courses (order may have changed) but don't need to
        // fetch the older courses.
        let combined = false;
        if(allCoursesLoaded && courses.length >= resp[0].data.courses.length) {
            let firstOldCourseIds = courses.map(c => c.id);
            if(resp[0].data.courses.every(c => firstOldCourseIds.includes(c.id))) {
                courses.splice(0, resp[0].data.courses.length, ...resp[0].data.courses);
                combined = true;
                cacheCourses();

                // Fetch the remaining courses anyways, there seem to be problems when
                // migrating from an earlier version, where 'allCoursesLoaded' seems to
                // be true even though it shouldn't be
                fetch("https://moodle.rwth-aachen.de/lib/ajax/service.php?sesskey="+sesskey, {
                    method: "post",
                    body: JSON.stringify([{
                        index: 0,
                        methodname: "core_course_get_enrolled_courses_by_timeline_classification",
                        args: {
                            offset: maxCourses + hidden.length, // We don't need the courses we already got in the first request, but this time no count limit
                            classification: byTime ? "all" : "inprogress",
                            sort: byTime ? "ul.timeaccess desc" : "fullname"
                        }
                    }])
                }).then(r => r.json()).then(async function (resp2) {
                    if(resp2[0].error) {
                        // This shouldn't happen, because a similar request already succeded seconds ago
                        console.error("Unexpected error in second request:", resp2);
                        return;
                    }
                    // Append the received courses to the course list, which is now complete
                    courses.splice(resp[0].data.courses.length); // Remove old cache (which should theoretically be identical)
                    courses.push(...resp2[0].data.courses);

                    // If a search is present, rebuild the html to possibly include the newly loaded courses
                    if(search) await buildHTML();
                    // Cache the complete course list and mark them as complete
                    cacheCourses();
                });
            }
        }

        if(!combined && resp[0].data.courses.length < maxCourses + hidden.length) {
            // The user has so few courses that they were already all loaded within the first request, so no second
            // request is required and the course data is complete.
            courses = resp[0].data.courses;
            allCoursesLoaded = true;
        }
        else if(!combined) {
            // No cache was present, or the order of the older courses has changed, or new courses were added. We need
            // to fetch all of the remaining courses to support searching for older courses.
            
            // Store the first fetched courses and mark them as incomplete
            courses = resp[0].data.courses;
            allCoursesLoaded = false;

            // Fetch the remaining courses asynchronously
            fetch("https://moodle.rwth-aachen.de/lib/ajax/service.php?sesskey="+sesskey, {
                method: "post",
                body: JSON.stringify([{
                    index: 0,
                    methodname: "core_course_get_enrolled_courses_by_timeline_classification",
                    args: {
                        offset: maxCourses + hidden.length, // We don't need the courses we already got in the first request, but this time no count limit
                        classification: byTime ? "all" : "inprogress",
                        sort: byTime ? "ul.timeaccess desc" : "fullname"
                    }
                }])
            }).then(r => r.json()).then(async function (resp2) {
                if(resp2[0].error) {
                    // This shouldn't happen, because a similar request already succeded seconds ago
                    console.error("Unexpected error in second request:", resp2);
                    return;
                }
                // Append the received courses to the course list, which is now complete
                courses.push(...resp2[0].data.courses);
                allCoursesLoaded = true;

                // If a search is present, rebuild the html to possibly include the newly loaded courses
                if(search) await buildHTML();
                // Cache the complete course list and mark them as complete
                cacheCourses();
            });
        }

        // Show and cache the courses, possibly incomplete
        footer.hidden = true;
        await buildHTML();
        cacheCourses();
    }
    else if(!isRetry && (resp[0].exception.errorcode === "servicerequireslogin" || resp[0].exception.errorcode === "invalidsesskey"))
        tryFetchSesskey(); // Will re-trigger loadCourses() if successful
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

async function buildHTML(message) {

    const hiddenCourses = await getHiddenCourses();
    const maxCourses = (await browser.storage.sync.get("maxCourses")).maxCourses || 10;

    // Select, which courses should be shown. If all courses [that match the search term] are hidden,
    // they will be shown, otherwise only non-hidden courses.
    let shownCourses = getShownCourses(hiddenCourses.ids, maxCourses);
    if(shownCourses.length === 0)
        shownCourses = getShownCourses([], maxCourses);

    // Non-search results will always be complete by design, but when a search term is present,
    // it is likely that there should also be older courses in the results, which might not yet
    // be loaded.
    if(search && !allCoursesLoaded && shownCourses.length < maxCourses) {
        if(message)
            bottomMessage.innerText = "Loading older courses | "+message;
        else bottomMessage.innerText = "Loading older courses...";
        footer.hidden = false;
    }
    else if(message) {
        bottomMessage.innerText = message;
        footer.hidden = false;
    }
    else footer.hidden = true;

    searchInput.hidden = false;

    listContainer.replaceChildren();

    for(const i in shownCourses) {
        const course = shownCourses[i];

        async function updateCache() {
            if((await browser.storage.sync.get("courseOrder")).courseOrder === "name") return;
            // Cache that this course is now most likely on top
            courses.splice(courses.indexOf(course), 1); // Remove current occurrence
            courses.splice(0, 0, course); // Insert at beginning
            cacheCourses();
        }

        const name = course.shortname;
        const main = getMainName(name);

        const b = document.createElement("b");
        b.innerText = main;
        const before = document.createTextNode(name.substring(0, name.indexOf(main)));
        const after = document.createTextNode(name.substring(name.indexOf(main) + main.length));

        const a = coursePrefab.cloneNode(true);
        a.removeAttribute("id");
        a.removeAttribute("hidden");
        a.href = course.viewurl;

        const labelDiv = a.getElementsByClassName("course-label")[0];
        labelDiv.replaceChildren(before, b, after);

        if(hiddenCourses.ids.includes(course.id)) {
            const showButton = a.getElementsByClassName("show-button")[0];
            showButton.hidden = false;
            labelDiv.style.color = "#8c8b94";
            showButton.onclick = async function(e) {
                e.stopPropagation();
                e.preventDefault();
                delete hiddenCourses.data[course.id+""];
                await browser.storage.sync.set({ hiddenCourses: hiddenCourses.data });
                await buildHTML();
            }
        }
        else {
            const hideButton = a.getElementsByClassName("hide-button")[0];
            hideButton.hidden = false;
            hideButton.onclick = async function(e) {
                e.stopPropagation();
                e.preventDefault();
                hiddenCourses.data[course.id+""] = name;
                await browser.storage.sync.set({ hiddenCourses: hiddenCourses.data });
                await buildHTML("Manage hidden courses in the extension settings");
            }
        }

        const outerDiv = a.getElementsByTagName("div")[0];
        outerDiv.onclick = e => {
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
        outerDiv.onauxclick = e => {
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
        outerDiv.onkeydown = e => {
            if(e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.stopPropagation();
                listContainer.children[([...listContainer.children].indexOf(a) + (e.key === "ArrowDown" ? 1 : -1) + listContainer.childElementCount) % listContainer.childElementCount].focus();
            }
            else if(e.key == "Enter" || e.key == " ") {
                e.stopPropagation();
                div.dispatchEvent(new MouseEvent("click", { ctrlKey: e.ctrlKey }));
            }
        };

        a.onclick = outerDiv.onclick;
        a.onauxclick = outerDiv.onauxclick;
        a.onkeydown = outerDiv.onkeydown;
        a.onfocus = () => outerDiv.focus();

        listContainer.appendChild(a);
    }
}

function getShownCourses(hidden, maxCount) {
    let shownCourses;
    if(search) {
        shownCourses = courses.filter(searchMatch);
        shownCourses.sort((a,b) => searchMatch(a) - searchMatch(b));
    }
    else shownCourses = [...courses]; // Create a copy, we might want to truncate it

    shownCourses = shownCourses.filter(c => !hidden.includes(c.id)); // Exclude hidden courses
    shownCourses.length = Math.min(shownCourses.length, maxCount); // Never show more courses than set in preferences, also not in search
    return shownCourses;
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

        if(index < start) {
            // Char not found, but allow small numbers as alias for roman numerals.
            // This version only allows for aliases if the string doesn't have the number
            // regularly afterwards, but pretty much no courses have digets in their name
            // so it's ok.
            if(char === "1") char = "I";
            else if(char === "2") char = "II";
            else if(char === "3") char = "III";
            else if(char === "4") char = "IV";
            else if(char === "5") char = "V";
            else if(char === "6") char = "VI";
            else if(char === "7") char = "VII";
            else if(char === "8") char = "VIII";
            else return false; // Not found and not realistic to be an alias for a roman numeral

            // Numeral should match exactly, e.g. 2 shouldn't report on III because it includes II
            index = start + item.slice(start).search("(^|[^IV])"+char+"([^a-zA-Z]|$)");
            if(index < start)
                return false; // Alias also not found
            else if(index > start || !item.startsWith(char, start)) index++; // Regex matches previous non IV character, which we also have to skip

            // Alias found, continue as usual, but literal digits should match better
            quality++;
        }
        else if(item.charAt(index) != char) // char is lower case but matched upper case
            quality++;

        quality += index - start; // Add number of characters skipped
        start = index + char.length; // If replaced by an alias skip all of it
    }
    if(start != item.length) quality += 5; // If you type the full word it should be a better match

    return quality;
}
