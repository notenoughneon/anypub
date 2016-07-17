import fs = require('fs');
import path = require('path');

export function promisify<T>(f: (cb: (err: NodeJS.ErrnoException, res: T) => void) => void): () => Promise<T>;
export function promisify<A,T>(f: (arg: A, cb: (err: NodeJS.ErrnoException, res: T) => void) => void): (arg: A) => Promise<T>;
export function promisify<A,A2,T>(f: (arg: A, arg2: A2, cb: (err: NodeJS.ErrnoException, res: T) => void) => void): (arg: A, arg2: A2) => Promise<T>;
export function promisify<A,A2,A3,T>(f: (arg: A, arg2: A2, arg3: A3, cb: (err: NodeJS.ErrnoException, res: T) => void) => void): (arg: A, arg2: A2, arg3: A3) => Promise<T>;
export function promisify<A,A2,A3,A4,T>(f: (arg: A, arg2: A2, arg3: A3, arg4: A4, cb: (err: NodeJS.ErrnoException, res: T) => void) => void): (arg: A, arg2: A2, arg3: A3, arg4: A4) => Promise<T>;

export function promisify(f) {
    return function() {
        return new Promise((resolve, reject) => {
            var args = Array.prototype.slice.call(arguments);
            args.push((err, result) => err !== null ? reject(err) : resolve(result));
            f.apply(null, args);
        });
    }
}

export function map<T,U>(elts: PromiseLike<PromiseLike<T>[]>, f: (T) => U | PromiseLike<U>): Promise<U[]>;
export function map<T,U>(elts: PromiseLike<T[]>, f: (T) => U | PromiseLike<U>): Promise<U[]>;
export function map<T,U>(elts: PromiseLike<T>[], f: (T) => U | PromiseLike<U>): Promise<U[]>;
export function map<T,U>(elts: T[], f: (T) => U | PromiseLike<U>): Promise<U[]>;
export function map(elts, f) {
    var apply = elts => Promise.all(elts.map(elt => typeof elt.then === 'function' ? elt.then(f) : f(elt)));
    return typeof elts.then === 'function' ? elts.then(apply) : apply(elts);
}

export function _try<T>(f: () => T): Promise<T>;
export function _try<T>(f: (arg: any) => T, arg: any): Promise<T>;
export function _try<T>(f: (arg: any, arg2: any) => T, arg: any, arg2: any): Promise<T>;
export function _try<T>(f: (arg: any, arg2: any, arg3: any) => T, arg: any, arg2: any, arg3: any): Promise<T>;
export function _try<T>(f: (arg: any, arg2: any, arg3: any, arg4: any) => T, arg: any, arg2: any, arg3: any, arg4: any): Promise<T>;
export function _try(f) {
    return new Promise((res, rej) => {
        try {
            var args = Array.prototype.slice.call(arguments);
            args.shift();
            res(f.apply(null, args));
        } catch (err) {
            rej(err);
        }
    });
}

var stat = promisify(fs.stat);
var readdir = promisify(fs.readdir);
var _writeFile = promisify(fs.writeFile);

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

export function inferMimetype(filename) {
    switch (path.extname(filename).toLowerCase()) {
        case '.html':
            return 'text/html';
        case '.css':
            return 'text/css';
        case '.txt':
            return 'text/plain';
        case '.js':
            return 'application/javascript';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.gif':
            return 'image/gif';
        case '.png':
            return 'image/png';
        case '.svg':
            return 'image/svg+xml';
        case '.mp3':
            return 'audio/mpeg';
        case '.ogg':
            return 'audio/ogg';
        default:
            return 'application/octet-stream';
    }
}

export function delay(ms: number) {
    return new Promise<void>((res, rej) => setTimeout(res, ms));
}

export class Semaphore {
    private tasks: (() => void)[] = [];
    capacity: number;

    constructor(capacity: number) {
        this.capacity = capacity;
    }

    private sched() {
        if (this.capacity > 0 && this.tasks.length > 0) {
            this.capacity--;
            this.tasks.shift()();
        }
    }

    public lock() {
        return new Promise<() => void>((res, rej) => {
            var task = () => {
                var released = false;
                res(() => {
                    if (!released) {
                        released = true;
                        this.capacity++;
                        this.sched();
                    }
                });
            };
            this.tasks.push(task);
            process.nextTick(this.sched.bind(this));
        });
    }
}

export class Mutex extends Semaphore {
    constructor() {
        super(1);
    }
}