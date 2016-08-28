import fs = require('fs');
import path = require('path');
import {promisify, _try} from 'typed-promisify';

var stat = promisify(fs.stat);
var readdir = promisify(fs.readdir);
var _writeFile = promisify(fs.writeFile);

export function tryDelete(p) {
    try {
        fs.unlinkSync(p);
    } catch (e) {}
}

function mkdirRecursive(dir) {
    try {
        var stats = fs.statSync(dir);
    } catch (err) {
        if (err.code == 'ENOENT') {
            mkdirRecursive(path.dirname(dir));
            fs.mkdirSync(dir);
            return;
        } else
            throw err;
    }
    if (!stats.isDirectory())
        throw(new Error(dir + ' is not a directory'));
}

/* writeFile with recursive parent dir creation */
export function writeFile(filename: string, data: string | NodeJS.ReadableStream) {
    return _try(mkdirRecursive, path.dirname(filename)).
        then(() => {
            if (typeof data !== "string" && data.readable)
                data.pipe(fs.createWriteStream(filename));
            else
                return _writeFile(filename, data);
        });
}

/* walk directory recursively and return list of files */
export async function walkDir(d) {
    var stats = await stat(d);
    if (stats.isDirectory()) {
        var files = [];
        for (let file of await readdir(d)) {
            files = files.concat(await walkDir(path.join(d, file)));
        }
        return files;
    } else {
        return [d];
    }
}

