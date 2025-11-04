
<p align="center"><a href="https://github.com/Rc-Cookie/quality-of-rwth" target="_blank" rel="noreferrer noopener"><img width="250" alt="HTWR Icon" src="https://github.com/Rc-Cookie/quality-of-rwth/blob/main/Chrome/icons/htwr.png?raw=true"></a></p>
<p align="center"><strong>Quality of RWTH</strong> improves the usability of RWTH websites.</p>
<br/>
<p align="center"><a rel="noreferrer noopener" href="https://chromewebstore.google.com/detail/quality-of-rwth/hhjhbkpidgloeeflpnoajpicjhocbdjk"><img alt="Chrome Web Store" src="https://img.shields.io/badge/Chrome-141e24.svg?&style=for-the-badge&logo=google-chrome&logoColor=white"></a>  <a rel="noreferrer noopener" href="https://addons.mozilla.org/en-US/firefox/addon/quality-of-rwth"><img alt="Firefox Add-ons" src="https://img.shields.io/badge/Firefox-141e24.svg?&style=for-the-badge&logo=firefox-browser&logoColor=white"></a>  <a rel="noreferrer noopener" href="#safari-support"><img alt="Safari Extension" src="https://img.shields.io/badge/Safari-141e24?logo=safari&style=for-the-badge&logoColor=white"></a>
<br/>

##

This is a browser extension to improve some of the web pages of the RWTH University, particularly those who students have to use on a daily basis.
This includes:

 - Automatically forwarding unnecessary "To log in, click here" pages
 - Skipping the incredibly slow, and asides, useless PDF annotator and just displays the PDF directly
 - Automatically continues when the browser fills in username and password on SSO
 - Automatically fills in subsequent login and authentification forms once the user has given permission to an app once
 - Adds a dropdown to the toolbar to quickly access all Moodle courses, to avoid having to wait ages for the dashboard to load just to immediately leave it again
 - Adds an option to download OpenCast videos, or for those very fancy, supplies the stream link so that a different streaming service can be used

All features can be turned off individually.

I'm not usually coding in JS or HTML, so don't expect any masterpiece, particularly not in terms of design. Form follows function.

## Safari Support

While Safari _does_ support browser extensions (even on iOS, unlike Firefox and Chrome), I'm currently not willing to spend like 100€ a year on an Apple developer account just in order to publish it on the AppStore.

As an _experimental_ alternative I've created a simple automation to convert the extension to a single JS file, to use with user script manager extensions, such as Tampermonkey and [Userscripts](https://apps.apple.com/us/app/userscripts/id1463298887).
I am designing the script to be used with Userscripts, for the simple reason that it is free, whereas Tampermonkey is not (at least on iOS).
It's also open-source, so it looks alright, but might not be as robust as other script managers.
I don't otherwise use these, so I can't tell much about that, but it works for me.
Feel free to try other script managers.

Note that _experimental_ means just that - the script file is basically just some of the JS files concatenated to a single file.
Since the script managers don't support all the features that browser extensions do, some features will not be available (the popup window, automated TOTP creation, and, at least for now, the settings window).
I haven't tested all the features on there, and it's also really annoying to debug - I've mainly checked that the auto-login-forward works.

### Installation

- Download and enable the [Userscripts Extension](https://apps.apple.com/us/app/userscripts/id1463298887) (or some other script manager, if you want to try).
  Note that on iOS at least the process of enabling the extension is pretty unintuitive, just downloading isn't enough.
- Open the [Quality-of-RWTH script file](https://raw.githubusercontent.com/Rc-Cookie/quality-of-rwth/refs/heads/main/UserScript/qualityOfRWTH.user.js) in Safari.
- Open the Userscripts extension from within Safari (on iOS, that is using the puzzle icon on the left of the URL bar, and then selecting it from the menu. If it's not there, you first need to enable it).
  The extension should show a banner prompting you if you want to install the found script.
- Automatic updates _should_ work, but I haven't actually tested it yet.
  If in doubt, you can always repeat the latest step to install the latest version.
