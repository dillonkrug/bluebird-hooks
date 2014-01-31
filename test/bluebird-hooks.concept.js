
// hooks defined on a class should be executed on instances
// hooks defined on instances should be pushed to the end of the queues

var Promise = require('bluebird');
var hooks = require('../src/bluebird-hooks');


var Model, doc;

Model = function(name) {
	this.name = name;
};
Model.prototype = {
	save: function() { 
		return doAsync(123, '===================  9) DOING Save');
	}
};

hooks.init(Model);

function doAsync(t, msg, v) {
	var out = Promise.pending();
	setTimeout(function() {
		if (msg) console.log(msg);
		out.resolve(v);
	}, t);
	return out.promise;

};

Model.before('save', function(data) {
	console.log('===================  1) pre save #1 starting');
	// console.log('--------- setting data.test to "asdfasdf"');
	data.test = 'asdfasdf';
	return doAsync(123, '===================  2) pre save #1 done');
});

Model.before('save', [function(data) {
	console.log('===================  3) pre save #2.1 starting (in parallel)');
	return doAsync(123, '===================  6) pre save #2.1 done');
}, function(data) {
	console.log('===================  4) pre save #2.2 starting (in parallel)');
	return doAsync(100, '===================  5) pre save #2.2 done');
}])

Model.before('save', function(data) {
	console.log('===================  7) pre save #3 starting');
	// console.log('--------- data.test is', data.test);
	return doAsync(123, '===================  8) pre save #3 done');
});

Model.before('save', {thread: 'newThread!'}, function(data) {
	console.log('===================  1.5) pre save Second Thread starting');
	return doAsync(1000, '===================  8.5) pre save Second Thread done');

})



Model.after('save', function(result, data) {
	console.log('=================== 10) post save #1 starting');
	// console.log('--------- data.test is still', data.test);
	return doAsync(123, '=================== 11) post save #1 done');
});


doc = new Model('Parent');

var ChildModel = function() {
	Model.apply(this, arguments);
};

hooks.init(ChildModel);

ChildModel.prototype = new Model;

ChildModel.before('save', function() {
	console.log('this.name is', this.name)
	console.log('THIS SHOULD NOT HAPPEN IF NAME IS PARENT')
});

var ch = new ChildModel('CHILD');


doc.save().then(function() {
	ch.save();
});








module.exports = {Model: Model, doc: doc};




/*
describe('Creating a hooked class', function() {
	it('should add pre/post methods as statics', function() {
		expect(typeof Model.pre).toBe('function')
		expect(typeof Model.post).toBe('function')
	});

	it('should add pre/post methods to prototype', function() {
		doc = new Model();
		expect(typeof doc.pre).toBe('function')
		expect(typeof doc.post).toBe('function')
	});
});




*/