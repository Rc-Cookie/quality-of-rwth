#!/bin/bash

java -jar ./chrome-porter/out/artifacts/web_ext_chrome_porter_jar/chrome-porter.jar . && web-ext build -s Firefox -a ./Firefox/web-ext-artifacts/ "$@" && web-ext build -s Chrome -a ./Chrome/web-ext-artifacts/ "$@"
