
// hooks defined on a class should be executed on instances
// hooks defined on instances should be pushed to the end of the queues

var Promise = require('bluebird');
var hooks = require('../src/bluebird-hooks');

var blown = false;

var Hooker, hooker;

Hooker = function(name) {
	this.name = name;
};
Hooker.prototype = {
	blow: function() { 
		return doAsync(123, '===================  9) DOING BLOW');
	}
};

hooks.init(Hooker);

function doAsync(t, msg, v) {
	var out = Promise.pending();
	setTimeout(function() {
		if (msg) console.log(msg);
		out.resolve(v);
	}, t);
	return out.promise;

};

Hooker.before('blow', function(data) {
	console.log('===================  1) pre blow #1 starting');
	// console.log('--------- setting data.test to "asdfasdf"');
	data.test = 'asdfasdf';
	return doAsync(123, '===================  2) pre blow #1 done');
});

Hooker.before('blow', [function(data) {
	console.log('===================  3) pre blow #2.1 starting (in parallel)');
	return doAsync(123, '===================  6) pre blow #2.1 done');
}, function(data) {
	console.log('===================  4) pre blow #2.2 starting (in parallel)');
	return doAsync(100, '===================  5) pre blow #2.2 done');
}])

Hooker.before('blow', function(data) {
	console.log('===================  7) pre blow #3 starting');
	// console.log('--------- data.test is', data.test);
	return doAsync(123, '===================  8) pre blow #3 done');
});

Hooker.before('blow', {thread: 'newThread!'}, function(data) {
	console.log('===================  1.5) pre blow Second Thread starting');
	return doAsync(1000, '===================  8.5) pre blow Second Thread done');

})



Hooker.after('blow', function(result, data) {
	console.log('=================== 10) post blow #1 starting');
	// console.log('--------- data.test is still', data.test);
	return doAsync(123, '=================== 11) post blow #1 done');
});


hooker = new Hooker('Parent');

var ChildHooker = function() {
	Hooker.apply(this, arguments);
};

hooks.init(ChildHooker);

ChildHooker.prototype = new Hooker;

ChildHooker.before('blow', function() {
	console.log('this.name is', this.name)
	console.log('THIS SHOULD NOT HAPPEN IF NAME IS PARENT')
});

var ch = new ChildHooker('CHILD');


hooker.blow().then(function() {
	ch.blow();
});








module.exports = {Hooker: Hooker, hooker: hooker};




/*
describe('Creating a hooked class', function() {
	it('should add pre/post methods as statics', function() {
		expect(typeof Hooker.pre).toBe('function')
		expect(typeof Hooker.post).toBe('function')
	});

	it('should add pre/post methods to prototype', function() {
		hooker = new Hooker();
		expect(typeof hooker.pre).toBe('function')
		expect(typeof hooker.post).toBe('function')
	});
});




*/