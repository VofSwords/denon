/*
To do
1)Better walk perfomance
2)URL support
3)Dynamic config reload
4)Rewrite in typescript
*/

import {
    globToRegExp,
    relative,
    resolve,
    walk,
    isAbsolute,
} from "../deps.ts";

export async function configGlobToString(config) {
    const {scripts} = config;
    for (const key of Object.keys(scripts)) {
        const script = scripts[key];
        if (script.allow) {
            const permissions = script.allow;
            if (permissions.read) permissions.read = await pathGlobToMatchesString(permissions.read);
            if (permissions.write) permissions.write = await pathGlobToMatchesString(permissions.write);
            if (permissions.net) permissions.net = await urlGlobAllow(permissions.net);
        };   
    };
    
    return Object.assign(Object(), config, {scripts});
};

export async function pathGlobToMatchesString(globs) {
    return await Promise.all(globs
                                .split(",")
                                .map(glob => 
                                    findAllMatchedPathes(glob))
    ).then(res => res.join(","));
};

export async function urlGlobAllow(url) { //to do
    return url;
};

export async function findAllMatchedPathes(rawGlob, rawPath = Deno.cwd()) {
    const res = new Array();
    const abs = isAbsolute(rawGlob);

    if (!abs) {
        var {glob, path} = resolveRelativeGlob(rawGlob, rawPath);
        
    } else {
        var glob = globToRegExp(rawGlob);
        var path = rawPath;
    };

    for await (const entry of walk(path)) {
        if (glob.test(entry.path)) {
            res.push(
                abs ? entry.path : relative(Deno.cwd(), entry.path)
            );
        };
    };

    return res.join(",");
};

export function resolveRelativeGlob(glob, path = Deno.cwd()) {
    const isOutside = new RegExp(/^\.\./);
    const isInCWD = new RegExp(/^.[\/\\]/);
    const isInside = new RegExp(/^[\/\\]?[^\*]+[\/\\]/);

    while (isOutside.test(glob)) {
        path = resolve(path, "../");
        glob = glob.slice(3, glob.length);
    };

    if (isInCWD.test(glob)) glob = glob.slice(2, glob.length);

    if (isInside.test(glob)) {
        path = resolve(path, glob.match(isInside)[0]);
        glob = glob.replace(isInside, "");
    };

    glob = "\*\*\/" + glob;
    glob = globToRegExp(glob);
    return {glob, path};
};