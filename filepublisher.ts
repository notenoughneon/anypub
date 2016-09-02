import fs = require('fs');
import pathlib = require('path');
import {promisify, _try} from 'typed-promisify';
import * as mime from 'mime';
import Publisher from './publisher';

var readFile = promisify(fs.readFile);
var stat = promisify(fs.stat);
var unlink = promisify(fs.unlink);
var readdir = promisify(fs.readdir);
var _writeFile = promisify(fs.writeFile);

function mkdirRecursive(dir) {
    try {
        var stats = fs.statSync(dir);
    } catch (err) {
        if (err.code == 'ENOENT') {
            mkdirRecursive(pathlib.dirname(dir));
            fs.mkdirSync(dir);
            return;
        } else
            throw err;
    }
    if (!stats.isDirectory())
        throw(new Error(dir + ' is not a directory'));
}

/* writeFile with recursive parent dir creation */
function writeFile(filename: string, data: string | NodeJS.ReadableStream) {
    return _try(mkdirRecursive, pathlib.dirname(filename)).
        then(() => {
            if (typeof data !== "string" && data.readable)
                data.pipe(fs.createWriteStream(filename));
            else
                return _writeFile(filename, data);
        });
}

/* walk directory recursively and return list of files */
async function walkDir(d) {
    var stats = await stat(d);
    if (stats.isDirectory()) {
        var files = [];
        for (let file of await readdir(d)) {
            files = files.concat(await walkDir(pathlib.join(d, file)));
        }
        return files;
    } else {
        return [d];
    }
}

class FilePublisher implements Publisher {
    root: string;

    constructor(config: {root: string}) {
        this.root = config.root;
    }

    private async readWithFallback(filepath, extensions): Promise<{Body: Buffer, ContentType: string}> {
        for (let ext of extensions) {
            try {
                var res = await readFile(filepath + ext);
                return {Body: res, ContentType: mime.lookup(filepath + ext)};
            } catch (err) {}
        }
        throw new Error(filepath + ' not found');
    }

    private async existsWithFallback(filepath, extensions): Promise<boolean> {
        for (let ext of extensions) {
            try {
                await stat(filepath + ext);
                return true;
            } catch (err) {}
        }
        return false;
    }

    put(path, obj, contentType): Promise<void> {
        if (contentType === 'text/html' && !path.endsWith('.html'))
            path = path + '.html';
        return writeFile(pathlib.join(this.root, path), obj);
    }
    
    async delete(path, contentType) {
        if (contentType === 'text/html' && !path.endsWith('.html'))
            path = path + '.html';
        await unlink(pathlib.join(this.root, path));
    }

    get(path): Promise<{Body: Buffer, ContentType: string}> {
        return this.readWithFallback(pathlib.join(this.root, path), ['', '.html']);
    }

    exists(path): Promise<boolean> {
        return this.existsWithFallback(pathlib.join(this.root, path), ['', '.html'])
    }

    list() {
        return walkDir(this.root)
        .then(paths => paths.map(p => pathlib.relative(this.root, p)))
        .then(paths => paths.filter(p => p !== 'log.txt'));
    }

    rollback(): Promise<void> {
        // NOOP
        return Promise.resolve(null);
    }

    commit(msg): Promise<void> {
        return this.exists('log.txt').
            then(exists => exists ? this.get('log.txt').then(obj => obj.Body.toString()) : '').
            then(text => {
                var log = text + new Date().toLocaleString() + ' ' + msg + '\n';
                return this.put('log.txt', log, 'text/plain');
            }).
            then(() => undefined);
    }


}

export = FilePublisher;