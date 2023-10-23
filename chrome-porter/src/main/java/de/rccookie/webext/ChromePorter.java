package de.rccookie.webext;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import de.rccookie.json.Json;
import de.rccookie.json.JsonObject;
import de.rccookie.util.ArgsParser;
import de.rccookie.util.Arguments;
import de.rccookie.util.Console;
import de.rccookie.util.Utils;

public class ChromePorter {

    private static final Pattern JS_PATTERN = Pattern.compile("(?:^| )// Chrome: ?(.*)$");

    private final Path src, dst;

    public ChromePorter(Path src, Path dst) {
        this.src = Arguments.checkNull(src, "src");
        this.dst = Arguments.checkNull(dst, "dst");
        if(!Files.exists(src))
            throw new IllegalArgumentException("src '"+src+"' does not exist");
    }

    public void port() throws IOException {
        Files.createDirectories(dst);

        JsonObject manifest = new JsonObject(Files.readString(src.resolve("manifest.json")).replaceAll("(\\s*).* // Chrome: ?(.*)[\r\n]", "$1$2"));
        if(manifest.getInt("manifest_version") != 3) {
            manifest.put("manifest_version", 3);
            if(manifest.contains("browser_action")) {
                manifest.put("action", manifest.get("browser_action"));
                manifest.remove("browser_action");
                manifest.remove("browser_specific_settings");
            }
            if(manifest.contains("commands")) {
                JsonObject commands = manifest.getObject("commands");
                if(commands.contains("_execute_browser_action")) {
                    commands.put("_execute_action", commands.get("_execute_browser_action"));
                    commands.remove("_execute_browser_action");
                }
            }
            if(manifest.contains("background") && manifest.getObject("background").contains("scripts")) {
                String[] scripts = manifest.getElement("background").get("scripts").as(String[].class);
                manifest.getObject("background").remove("scripts");
                if(scripts.length == 1)
                    manifest.getObject("background").put("service_worker", scripts[0]);
                else {
                    String workerJS = "importScripts(" + Arrays.stream(scripts).map(s -> "'" + s + "'").collect(Collectors.joining(", ")) + ");\n";
                    Files.writeString(dst.resolve("_backgroundWorker.js"), workerJS);
                    manifest.getObject("background").put("service_worker", "_backgroundWorker.js");
                }
            }
        }
        Json.store(manifest, dst.resolve("manifest.json"));

        for(Path p : Utils.iterate(Files.walk(src))) {
            if(p.endsWith("manifest.json") || Files.isDirectory(p)) continue;

            Path target = dst.resolve(src.relativize(p));
            Files.createDirectories(target.getParent());
            String name = p.toString();
            if(name.endsWith(".js")) {
                StringBuilder js = new StringBuilder("const browser = chrome;\n\n");
                int lineNr = 1;
                for(String line : Files.readAllLines(p)) {
                    Matcher m = JS_PATTERN.matcher(line);
                    if(m.find()) {
                        if(line.indexOf("//") < m.start()
                           || isBefore(line.indexOf("/*"), m.start())
                           || (isBefore(line.indexOf('"'), m.start()) && line.lastIndexOf('"') > m.start())
                           || (isBefore(line.indexOf('\''), m.start()) && line.lastIndexOf('\'') > m.start())
                           || (isBefore(line.indexOf('`'), m.start()) && line.lastIndexOf('`') > m.start())) {
                            Console.warn(p + ":" + lineNr + ": found // Chrome: ... that might be within comment or string. Please avoid commenting out replacements (they will still be replaced), and write strings so that the pattern is not literally present.");
                        }
                        js.append(" ".repeat(line.length() - line.stripLeading().length())).append(m.group(1));
                    }
                    else js.append(line);
                    js.append("\n");
                    lineNr++;
                }
                Files.writeString(target, js);
            }
            else if(name.endsWith(".html")) {
                String html = Files.readString(p);
                html = html.replaceAll("(\\s*).* (?:<!-- Chrome: ?(.*) -->|/\\* Chrome: (.*) \\*/|// Chrome: ?(.*))[\r\n]", "$1$2$3$4");
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

    private static boolean isBefore(int testIfBefore, int testIfAfter) {
        return testIfBefore >= 0 && testIfBefore < testIfAfter;
    }

    public static void main(String[] args) throws IOException {
        ArgsParser parser = new ArgsParser();
        parser.addDefaults();
        parser.setName("Web Extension Chrome Porter");
        parser.setDescription("""
                        Usage: chrome-porter [options] [rootDir|srcDir dstDir]

                        Converts a web extension created for Firefox to one for Chrome.
                        Inject chrome specific implementation in HTML/CSS/JS via end-of-line comments with syntax
                            <some Firefox specific code> <comment start> Chrome: <Chrome specific code>[ <comment end>]<end of line>
                        Note that the spaces are mandatory. Example in HTML:
                        <div browser="firefox"> <!-- Chrome: <div browser="chrome"> -->

                        If a single directory is given, the subdirectory 'Firefox' is used as source and the subdirectory 'Chrome' as destination directory.
                        """);
        args = parser.parse(args).getArgs();

        String src, dst;
        if(args.length == 0) {
            System.err.println("No base directory specified.\n");
            parser.showHelp();
            return;
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

    private enum State {
        CODE,
        SINGLE_LINE_COMMENT,
        MULTI_LINE_COMMENT,
        STRING
    }
}
