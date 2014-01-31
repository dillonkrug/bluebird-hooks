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

var fn;


describe('Hookifying a function', function() {
	fn = hooks.hookify(doAsync);

	it('should return a wrapped function', function() {
		expect(fn.$$hooks).toBeDefined();
		expect(fn.$$hooks.before).toBeDefined();
		expect(fn.$$hooks.after).toBeDefined();
	});

	it('should execute the core function', function(done) {
		fn('core', 'core result').then(function(out) {
			expect(out).toBe('core result');
			expect(output).toEqual(['core']);
			done()
		})
	})

});
