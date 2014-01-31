var Promise = require('bluebird');
var hooks = require('../src/bluebird-hooks');

var output = [];

function doAsync(n, v, t) {
	var out = Promise.pending();
	setTimeout(function() {
		output.push(n);
		out.resolve(v);
	}, t||40);
	return out.promise;

};

var obj = {
	fn: hooks.hookify(doAsync)
};

hooks.init(obj);


describe('Adding hooks', function() {

	it('should execute first', function(done) {
		obj.before('fn', function() { return doAsync('first') });

		obj.fn('core').then(function() {
			expect(output).toEqual(['first', 'core'])
			done()
		})
	})

	it('should execute the first and second', function(done) {
		obj.before('fn', function() { return doAsync('second') });
		output = [];

		obj.fn('core').then(function() {
			expect(output).toEqual(['first', 'second', 'core'])
			done()
		})
	})

	it('should execute the first and second before, third after', function(done) {
		obj.after('fn', function() { return doAsync('third') });
		output = [];

		obj.fn('core').then(function() {
			expect(output).toEqual(['first', 'second', 'core', 'third'])
			done()
		})
	})

	it('should execute the first and second , 2.5 and 2.6 before, third after', function(done) {
		obj.before('fn', [
			function() { return doAsync('2.5') },
			function() { return doAsync('2.6', false, 20) }
		]);
		output = [];

		obj.fn('core').then(function() {
			expect(output).toEqual(['first', 'second', '2.6', '2.5', 'core', 'third'])
			done()
		})
	})

	it('should execute the second thread as well', function(done) {
		obj.before('fn', {thread: 'second'}, function() {
			return doAsync('2.99', false, 1000);
		});
		output = [];

		obj.fn('core').then(function() {
			expect(output).toEqual(['first', 'second', '2.6', '2.5', '2.99', 'core', 'third'])
			done()
		})
	})

})

