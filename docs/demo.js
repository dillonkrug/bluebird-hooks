//	# Intro
//	
//	bluebird-hooks is, as you may have guessed, a middleware utility built around bluebird promises.
//	

var hooks = require('../src/bluebird-hooks'),
	db = require('bluebird-mongo');	// Note: I haven't gotten around to writing bluebird-mongo quite yet.


//	
//	Let's dive in by creating a class we might want to add some hooks to.

var Model = function(data) {
	this.data = data;
};

Model.prototype = {
	collection: 'models',
	save: function(validate, version) { 
		/* Model.save() — a delightful little function that returns a bluebird promise. */
		console.log('Document Saving!');
		return db.collection(this.collection).save(this.data);
	}
}

//	And now to activate hooks:

Model.before = hooks.before;
Model.after  = hooks.after;

//	All you need to do to get started is add hooks.before and hooks.after to the Constructor.
//	
//	I added it to the prototype, so we can add hooks to instances as well as the constructor level.
//	
//	More on that later.
//	
//	----------------
//	# Middleware
//	
//	Hooks middleware works very much like other implementations of middleware, with some interesting new features.
//	
//	----------------
//	## Threads
//	
//	By default, new hooks are added to a 'default' thread.  
//	This means that if I add hooks without specifying a thread, 
//	they will all execute sequentially

/***  EXAMPLE 1  ***/

Model.before('save', function() { 
	console.log('Hook #1 Starting');  
	return delay(100);
})
Model.before('save', function() { 
	console.log('Hook #2 Starting'); 
	return delay(300);
})
Model.before('save', function() { 
	console.log('Hook #3 Starting'); 
	return delay(100);
})

var doc = new Model({});

doc.save();
//	Calling `doc.save()`  will log the following:
//	```
//	> "Hook #1 Starting" 		 0ms
//	> "Hook #2 Starting"		100ms
//	> "Hook #3 Starting"		400ms
//	> "Document Saving!"		500ms
//	```
//	
//	That second hook is taking a long time, and it doesn't depend on any other hooks.
//	
//	Let's give it it's own thread!

/***  EXAMPLE 2  ***/

Model.before('save', function() { /* SAME AS BEFORE */ })
Model.before('save', {thread: 'sideline'}, function() { 
	console.log('Hook #2 Starting'); 
	return delay(300);
})
Model.before('save', function() { /* SAME AS BEFORE */ })

var doc = new Model({});

doc.save();

//	Now we have a better result:
//	```
//	> "Hook #1 Starting" 		 0ms
//	> "Hook #2 Starting"		  0ms
//	> "Hook #3 Starting"		100ms
//	> "Document Saving"		 300ms
//	```
//	
//	Now that hook #2 is in it's own thread, it starts immediately, and allows other hooks to execute while it's working.
//	
//	----------------
//	## Parallel Hooks
//	
//	Let's say you have a couple functions that don't rely on each other, but they do rely on a previous hook.
//	
//	This is a situation where you should use **parallel hooks**.

/***  EXAMPLE 3  ***/

Model.before('save', function() { 
	console.log('Important Hook Starting');
	return delay(100);
})
Model.before('save', [
	function() { 
		console.log('Hook #2 Starting'); 
		return delay(100);
	},
	function() {
		console.log ('Hook #3 Starting')
		return delay(100);
	}
]);

var doc = new Model({});

doc.save();

//	```
//	> "Important Hook Starting"   0ms
//	> "Hook #2 Starting"		100ms
//	> "Hook #3 Starting"		100ms
//	> "Document Saving"		 200ms
//	```
//	
//	Instead of passing a single callback to `before()` or `after()`, 
//	we can pass an array or hash of functions which will all be executed in parallel.
//	
//	**There is no limit to the number of threads or parallel hooks you can use.**
//	
//	----------------
//	#### Diagram!
//	
//	<a href="diagram.png" target="_blank"><img src="diagram.png" style="height:250px"></a>
//	
//	----------------
//	## Arguments
//	
//	As you can see, our save function has two parameters: `validate` and `version`.  What can we do with these?
//	

/***  EXAMPLE 4  ***/

Model.before(save, function(validate, version) {
	console.log('Validate is', validate);
	console.log('Version is', version);
});

new Model().save(true, 42);

//	```
//	> "Validate is" true          0ms
//	> "Version is" 42		     0ms
//	> "Document Saving"		   0ms
//	```
//	
//	As you can see, arguments passed to the hooked function map to the middleware functions as you would expect.
//	
//	This is ideal if you just need to access the arguments, or if the arguments are references that you can modify in place.
//	
//	If, for whatever reason, you wanted to flip the validate argument before it gets to the core save function, 
//	just adding `validate = !validate` wouldn't work.
//	
//	If you want to change a primative argument like that, you have two options:

/***  EXAMPLE 4  ***/

Model.before(save, {argArray: true}, function(args) {
	args[0] = !args[0];
});

//	OR

/***  EXAMPLE 5  ***/

Model.before(save, {argMap: true}, function(args) {
	args.validate = !args.validate;
});

//	NOTE: Example 4 is faster and more efficient, but Example 5 is much more readable.
//	
//	It is also a good idea to use one of these options if the core function 
//	has unnamed parameters that it accesses via the `arguments` variable.
//	
//	When using argMap, unnamed params retain their numerical index.
//	
//	----------------
//	## Hook Data
//	
//	If an earlier hook needs to pass information to a subsequent hook, there is a additional parameter passed in to all hook functions:

/***  EXAMPLE 6  ***/

Model.before(save, function(validate, version, data) {
	data.msg = 'Hey Number 2!';
});

Model.before(save, function(validate, version, data) {
	console.log('Message is', data.msg)
});

new Model().save();

//	```
//	> "Message is" "Hey Number 2!"
//	> "Document Saving"
//	```
//	
//	NOTE! hook data is thread specific.
//	
//	
//	----------------
//	## Instance Hooks
//	
//	Most of the time, there shouldn't be a need to add hooks to instances.
//	When we add them on a constructor like in the previous examples, they will be inherited automatically.
//	
//	That said, if the need does arise, all you need to do is add hooks.before/after to the constructor's prototype:

Model.prototype.before	= hooks.before;
Model.prototype.after	= hooks.after;

//	This allows us to do the following:

/***  EXAMPLE 7  ***/

Model.before('save', function() {
	console.log('All Instances!')
});

var doc1 = new Model();

doc1.before('save', function() {
	console.log('This only happens on doc1');
});

var doc2 = new Model();

console.log('Saving Doc 1')
doc1.save().then(function() {
	console.log('-------------');
	console.log('Saving Doc 2');
	doc2.save();
});

//	```
//	> "Saving Doc 1"
//	> "All Instances!"
//	> "This only happens on doc1"
//	> "Document Saving"
//	> "-------------"
//	> "Saving Doc 2"
//	> "All Instances!"
//	> "Document Saving"
//	```
//	
//	Hooks added to one instance will not affect other instances.
//	
//	
//	----------------
//	## Extending Constructors
//	
//	Say we've added a bunch of nice hooks to Model, but it's time to get a little more specific.
//	
//	Just as with instances, when the hooks module detects a change in the context, it automatically extends itself.

/***  EXAMPLE 8  ***/

Model.before('save', function() { console.log('All Instances') });

var User = function() {
	Model.apply(this, arguments);
};

User.prototype = new Model();

User.before = hooks.before;
User.after  = hooks.after;

//	Note that we have to attach the before and after functions again. 
//	Existing hooks will still work if they are not present, but you won't be able to add more.

/***  EXAMPLE 8 — cont'd ***/

User.before('save', function() { console.log('Only Users') });

console.log('Saving Model Instance')
new Model().save().then(function() {
	console.log('-------------');
	console.log('Saving User Instance')
	new User().save()
})
//	```
//	> "Saving Model Instance"
//	> "All Instances"
//	> "Document Saving"
//	> "-------------"
//	> "Saving User Instance"
//	> "All Instances"
//	> "Only Users"
//	> "Document Saving"
//	```
//	
//	Pretty cool.
//	
//	----------------
//	# Options
//	
//	** options.thread ** — default: 'default'
//	
//	Assign a thread for the hook to execute in.
//	
//	** options.argArray ** — default: false
//	
//	Pass original function arguments as an Array.
//	
//	** options.argMap ** — default: false
//	
//	Pass original function arguments as a named hash.
//	
//	** options.onProto ** — default: false
//	
//	If the scope of the before/after call has a method with the given name, the default is to add the hook to that method.
//	If there is no such method, it looks for a prototype method.
//	If `onProto` is set to `true`, only the prototype is checked.
//	
//	** options.order ** — default: Auto-Incrementing Number
//	
//	Use with caution!
//	
//	If you want a hook to execute first or last 
//	but can't add at the proper time for some reason, you can set 
//	`options.order` to a very low (negative) number or a very high number.
//	
//	Be careful — this can overwrite existing hooks if you use the wrong key.
//	
//	To find out the order of existing hooks you can inspect `obj.method.$$hooks`.
//	
//	Use decimals to avoid conflicts.
//	
//	** options.fn ** — (Function or Array/Hash of Functions)
//	
//	An alternate way to pass in the callback function.  This way overrides the regular parameter.
//	
//	
//	----------------
//	# Other Info
//	
//	- You can access/change the wrapped function at wrappedFunction.core
//	




