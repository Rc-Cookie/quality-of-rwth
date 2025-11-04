#!/bin/bash

java -jar ./web-ext-porter/out/artifacts/chrome_porter_jar/chrome-porter.jar . \
    && java -jar ./web-ext-porter/out/artifacts/userscript_porter_jar/userscript-porter.jar . \
    && web-ext build -s Firefox -a ./Firefox/web-ext-artifacts/ "$@" \
    && web-ext build -s Chrome -a ./Chrome/web-ext-artifacts/ "$@"
