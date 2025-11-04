package de.rccookie.webext;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;

import de.rccookie.json.Json;
import de.rccookie.json.JsonElement;

public class UserScriptPorter {

    private UserScriptPorter() { }

    public static void main(String[] args) throws IOException {
        Path dir = Path.of(String.join(" ", args));

        Path src = dir.resolve("Firefox");
        JsonElement manifest = Json.load(src.resolve("manifest.json"));
        JsonElement contentScript = manifest.get("content_scripts").get(0);

        StringBuilder header = new StringBuilder();
        header.append("// ==UserScript==\n");
        header.append("// @name ").append(manifest.getString("name").replace('\n', ' ')).append('\n');
        header.append("// @description ").append(manifest.getString("description").replace('\n', ' ')).append('\n');
        header.append("// @author RcCookie and Contributors\n");
        header.append("// @version ").append(manifest.getString("version")).append('\n');
        header.append("// @inject-info content\n");

        for(String m : contentScript.get("matches").asList(String.class))
            header.append("// @match ").append(m).append('\n');
        for(String m : contentScript.get("exclude_matches").asList(String.class))
            header.append("// @exclude ").append(m).append('\n');

        for(String p : manifest.get("permissions").asList(String.class)) {
            String[] grants = switch(p) {
                case "storage" -> new String[] { "GM.getValue", "GM.setValue", "GM.deleteValue", "GM.listValues" };
                default -> new String[0];
            };
            for(String grant : grants)
                header.append("// @grant ").append(grant).append('\n');
        }
        header.append("// ==/UserScript==\n");

        Files.createDirectories(dir.resolve("UserScript"));
        Files.writeString(dir.resolve("UserScript/qualityOfRWTH.meta.js"), header);

        OutputStream outStream = Files.newOutputStream(dir.resolve("UserScript/qualityOfRWTH.user.js"));
        PrintWriter out = new PrintWriter(outStream);

        out.println(header);

        out.println("//#region userscript-webext-adapter.js");
        out.flush();
        try(InputStream in = UserScriptPorter.class.getResourceAsStream("/de/rccookie/webext/userscript-webext-adapter.js")) {
            in.transferTo(outStream);
        }
        out.println("//#endregion userscript-webext-adapter.js");

        for(String script : contentScript.get("js").asList(String.class)) {
            out.println("\n//#region " + script);
            out.println("(() => {");
            out.flush();
            try(InputStream in = Files.newInputStream(src.resolve(script))) {
                in.transferTo(outStream);
            }
            out.println("})();");
            out.println("//#endregion " + script);
        }
        out.flush();
    }
}
