import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.stream.Collectors;

import com.github.rccookie.json.Json;
import com.github.rccookie.json.JsonObject;
import com.github.rccookie.util.ArgsParser;
import com.github.rccookie.util.Arguments;
import com.github.rccookie.util.Utils;

public class ChromePorter {

    private final Path src, dst;

    public ChromePorter(Path src, Path dst) {
        this.src = Arguments.checkNull(src, "src");
        this.dst = Arguments.checkNull(dst, "dst");
        if(!Files.exists(src))
            throw new IllegalArgumentException("src '"+src+"' does not exist");
    }

    public void port() throws IOException {
        Files.createDirectories(dst);

        JsonObject manifest = Json.load(src.resolve("manifest.json")).asObject();
        manifest.put("manifest_version", 3);
        if(manifest.contains("browser_action")) {
            manifest.put("action", manifest.get("browser_action"));
            manifest.remove("browser_action");
            manifest.remove("browser_specific_settings");
        }
        if(manifest.contains("background") && manifest.getObject("background").contains("scripts")) {
            String[] scripts = manifest.getElement("background").get("scripts").as(String[].class);
            manifest.getObject("background").remove("scripts");
            if(scripts.length == 1)
                manifest.getObject("background").put("service_worker", scripts[0]);
            else {
                String workerJS = "importScripts(" + Arrays.stream(scripts).map(s -> "'"+s+"'").collect(Collectors.joining(", ")) + ");\n";
                Files.writeString(dst.resolve("_backgroundWorker.js"), workerJS);
                manifest.getObject("background").put("service_worker", "_backgroundWorker.js");
            }
        }
        Json.store(manifest, dst.resolve("manifest.json"));

        for(Path p : Utils.iterate(Files.walk(src))) {
            if(p.endsWith("manifest.json") || Files.isDirectory(p)) continue;

            Path target = dst.resolve(src.relativize(p));
            Files.createDirectories(target.getParent());
            String name = p.toString();
            if(name.endsWith(".js")) {
                String js = Files.readString(p);
                js = js.replaceAll("(\\s*).* // Chrome: (.*)[\r\n]", "$1$2");
                Files.writeString(target,"const browser = chrome;\n\n"+js);
            }
            else if(name.endsWith(".html")) {
                String html = Files.readString(p);
                html = html.replaceAll("(\\s*).* (?:<!-- Chrome: (.*) -->|/\\* Chrome: (.*) \\*/|// Chrome: (.*))[\r\n]", "$1$2$3$4");
                Files.writeString(target, html);
            }
            else if(name.endsWith(".css")) {
                String css = Files.readString(p);
                css = css.replaceAll("(\\s*).* /\\* Chrome: (.*) \\*/[\r\n]", "$1$2");
                Files.writeString(target, css);
            }
            else Files.copy(p, target, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    public static void main(String[] args) throws IOException {
        ArgsParser parser = new ArgsParser();
        parser.addDefaults();
        parser.setName("Web Extension Chrome Porter");
        parser.setDescription("""
                        Usage: chrome-porter [options] [srcDir dstDir|rootDir|<none>]

                        Converts a web extension created for Firefox to one for Chrome.
                        Inject chrome specific implementation in HTML/CSS/JS via end-of-line comments with syntax
                            <some Firefox specific code> <comment start> Chrome: <Chrome specific code>[ <comment end>]<end of line>
                        Note that the spaces are mandatory. Example in HTML:
                        <div browser="firefox"> <!-- Chrome: <div browser="chrome"> -->
                        """);
        args = parser.parse(args).getArgs();

        String src, dst;
        if(args.length == 0) {
            src = "Firefox";
            dst = "Chrome";
        }
        else if(args.length == 1) {
            src = args[0] + "/Firefox";
            dst = args[0] + "/Chrome";
        }
        else if(args.length == 2) {
            src = args[0];
            dst = args[1];
        }
        else throw new IllegalArgumentException("Expected at most two paths; source and destination directory");

        new ChromePorter(Path.of(src), Path.of(dst)).port();
    }
}
