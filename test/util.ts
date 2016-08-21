import assert = require('assert');
import util = require('../util');
import fs = require('fs');

describe('util', function() {
    describe('writeFile', function() {
        before(function() {
            util.tryDelete('test/foo/bar/baz.txt');
            util.tryDelete('test/foo/bar');
            util.tryDelete('test/foo');
        });
        it('should work', function(done) {
            util.writeFile('test/foo/bar/baz.txt', 'hello world').
                then(function () {
                    assert.equal(fs.readFileSync('test/foo/bar/baz.txt'), 'hello world');
                }).
                then(done).
                catch(done);
        }) ;
    });

    describe('walkDir', () => {
        it('smoke test', done => {
            util.walkDir('test').
            then(elts => {
                assert.deepEqual(elts.sort(), [
                    'test/gitpublisher.ts',
                    'test/gitpublisher.js',
                    'test/gitpublisher.js.map',
                    'test/mirrorpublisher.ts',
                    'test/mirrorpublisher.js',
                    'test/mirrorpublisher.js.map',
                    'test/s3publisher.ts',
                    'test/s3publisher.js',
                    'test/s3publisher.js.map',
                    'test/util.ts',
                    'test/util.js',
                    'test/util.js.map',
                    'test/foo/bar/baz.txt',
                ].sort());
            }).
            then(done).
            catch(done);
        });
    });


});