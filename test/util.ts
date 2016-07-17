import assert = require('assert');
import util = require('../util');
import fs = require('fs');
import callbacks = require('when/callbacks');

describe('util', function() {
    describe('map', function() {
        var elts = [1, 2, 3];
        var f: (n) => Promise<number> = n => new Promise((res,rej) => res(n * n));
        var expected = [1, 4, 9];

        it('array of values', function(done) {
            util.map(elts, f)
            .then(res => assert.deepEqual(res, expected))
            .then(done);
        });

        it('array of promises', function(done) {
            var eltps = elts.map(elt => new Promise((res, rej) => res(elt)));
            util.map(eltps, f)
            .then(res => assert.deepEqual(res, expected))
            .then(done);
        });

        it('promise of array of values', function(done) {
            var pelts = new Promise((res,rej) => res(elts));
            util.map(pelts, f)
            .then(res => assert.deepEqual(res, expected))
            .then(done);
        });

        it('promise of array of promises', function(done) {
            var peltps = new Promise((res,rej) => res(elts.map(elt => new Promise((res, rej) => res(elt)))));
            util.map(peltps, f)
            .then(res => assert.deepEqual(res, expected))
            .then(done);
        });
    });

    describe('writeFile', function() {
        before(function() {
            util.tryDelete('build/test/foo/bar/baz.txt');
            util.tryDelete('build/test/foo/bar');
            util.tryDelete('build/test/foo');
        });
        it('should work', function(done) {
            util.writeFile('build/test/foo/bar/baz.txt', 'hello world').
                then(function () {
                    assert.equal(fs.readFileSync('build/test/foo/bar/baz.txt'), 'hello world');
                }).
                then(done).
                catch(done);
        }) ;
    });

    describe('walkDir', () => {
        it('should work', done => {
            util.walkDir('skel').
            then(elts => {
                assert.deepEqual(elts, [
                    'skel/author.png',
                    'skel/css/blog.css',
                    'skel/js/blog.js'
                ]);
            }).
            then(done).
            catch(done);
        });
    });

    describe('mutex', function() {
        it('tasks do not overlap', function(done) {
            var m = new util.Mutex();
            var task1running = false;
            var task2running = false;
            var task1ran = false;
            var task2ran = false;
            Promise.all([
                m.lock()
                .then(release => {
                    task1running = true;
                    task1ran = true;
                    return util.delay(10)
                    .then(() => {
                        assert(!task2running);
                        task1running = false;
                        release();
                    });
                }),
                m.lock().
                then(release => {
                    assert(!task1running);
                    task2running = true;
                    task2ran = true;
                    return util.delay(10)
                    .then(() => {
                        task2running = false;
                        release();
                    });
                })
            ])
            .then(() => {
                assert(!task1running);
                assert(!task2running);
                assert(task1ran);
                assert(task2ran);
                done();
            })
            .catch(done);
        });
        it('double lock deadlocks', function(done) {
            var m = new util.Mutex();
            m.lock()
            .then(r => m.lock())
            .then(r => assert(false))
            .catch(done);
            util.delay(10)
            .then(done);
        });
        it('double release ok', function(done) {
            var release;
            var m = new util.Mutex();
            m.lock().
                then(r => release = r).
                then(() => release()).
                then(() => release());
            m.lock().
                then(r => done());
        });
    });
});