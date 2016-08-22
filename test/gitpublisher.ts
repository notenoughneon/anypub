import assert = require('assert');
import child_process = require('child_process');
import GitPublisher = require('../gitpublisher');
import util = require('../util');
import {promisify} from 'typed-promisify';

var exec = promisify(child_process.exec);

var root = 'tmp';

describe('gitpublisher', function() {
    var publisher: GitPublisher;
    
    before(function() {
        publisher = new GitPublisher({root: root, push: false});
        return exec('rm -rf ' + root)
        .then(() => exec('mkdir ' + root))
        .then(() => exec('git init ' + root));
    });
    
    it('list (empty)', function() {
        return publisher.list()
        .then(res => {
            assert.deepEqual(res, []);
        });
    });
    
    it('put', function() {
        return publisher.put('hello.txt', 'Hello world', 'text/plain')
        .then(() => {
            return publisher.put('post', '<html><body>hi</body></html>', 'text/html');
        });
    });
    
    it('list', function() {
        return publisher.list()
        .then(res => {
            assert.deepEqual(res, ['hello.txt', 'post.html']);
        });
    });
    
    it('exists', function() {
        return publisher.exists('hello.txt')
        .then(res => {
            assert.equal(res, true);
            return publisher.exists('nope.txt');
        })
        .then(res => {
            assert.equal(res, false);
        });
    });
    
    it('get', function() {
        return publisher.get('hello.txt')
        .then(res => {
            assert.equal(res.ContentType, 'text/plain');
            assert.equal(res.Body, 'Hello world');
            return publisher.get('post.html');
        })
        .then(res => {
            assert.equal(res.ContentType, 'text/html');
            assert.equal(res.Body, '<html><body>hi</body></html>');
        });
    });
    
    it('commit', function() {
        return publisher.commit('initial commit')
        .then(() => publisher.commit('nothing changed (should not commit)'))
        .then(() => publisher.put('hello2.txt', 'hello world 2', 'text/plain'))
        .then(() => publisher.commit('added hello2.txt'));
    });
    
    it('commit msg opt injection', function() {
        return publisher.put('hello3.txt', 'hello world', 'text/plain')
        .then(() => publisher.commit('test --dry-run'));
    });
    
    it('commit msg quote escape', function() {
        return publisher.put('hello4.txt', 'hello world', 'text/plain')
        .then(() => publisher.commit('test" --dry-run "'));
    });    

    it('commit msg shell escape', function() {
        return publisher.put('hello5.txt', 'hello world', 'text/plain')
        .then(() => publisher.commit('test; touch foo.txt'));
    });

    it('commit msg multiline', function() {
        return publisher.put('hello6.txt', 'hello world', 'text/plain')
        .then(() => publisher.commit('test\nmulti line'));
    });
    
    it('delete', async function() {
        await publisher.delete('hello.txt', 'text/plain');
        assert.equal(await publisher.exists('hello.txt'), false);

        await publisher.delete('hello2.txt', 'text/plain');
        assert.equal(await publisher.exists('hello2.txt'), false);

        await publisher.delete('post', 'text/html');
        assert.equal(await publisher.exists('post.html'), false);

        await publisher.commit('delete content');
    });
    
    describe.skip('stress tests', function() {
        var objects: string[];
        it('put', function() {
            this.timeout(0);
            objects = [];
            for (let i = 1; i < 100; i++) {
                objects.push('post' + i + '.txt');
            }
            objects.sort();
            return Promise.all(objects.map(o => publisher.put(o, 'stress test', 'text/plain')));
        });
        
        it('list', function() {
            this.timeout(0);
            return publisher.list()
            .then(res => {
                res.sort();
                assert.deepEqual(res, objects);
            });
        });
        
        it('get', function() {
            this.timeout(0);
            return Promise.all(objects.map(o =>
                publisher.get(o)
                .then(res => {
                    assert.equal(res.ContentType, 'text/plain');
                    assert.equal(res.Body, 'stress test');
                })
            ));
        });
        
        it('delete', function() {
            this.timeout(0);
            return Promise.all(objects.map(o => publisher.delete(o, 'text/plain')))
            .then(() => publisher.list())
            .then(res => {
                assert.deepEqual(res, []);
            });
        });
        
    });

});