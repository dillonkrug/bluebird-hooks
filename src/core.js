var Promise = require('bluebird'),
	util = require('./util');

var hooks = {
	before: function(method, options, fn) { 
		hooks.addHook(this, 'before', method, options, fn);
		return this;
	},
	after:  function(method, options, fn) { 
		hooks.addHook(this, 'after', method, options, fn);
		return this;
	}
}

// init just adds before/after functions to an object/constructor
hooks.init = function init(o) {
	o.before = hooks.before;
	o.after = hooks.after;
};

// Add a hook to a target[methodName]
hooks.addHook = function addHook(target, timing, methodName, options, fn) {
	//	If there is no method on the target, try the prototype
	var ctx = (target[methodName] && !options.onProto) ? target : target.prototype || {},

	// the method we are wrapping
		method = ctx[methodName];
	
	//	If there still isn't a method, throw!
	if(typeof method !== 'function') throw new TypeError(target.toString() + 'has no method "' + methodName + '"');
	
	//	If fn is undefined, we assume options is the target function
	if (typeof fn === 'undefined') options = { thread: 'default', fn: options };
	
	//	If no order option was specified, we auto-increment.
	if (typeof options.order === 'undefined') options.order = util.inc();
	
	//	If options _were_ specified, we add fn to the options
	if (typeof options.fn === 'undefined') options.fn = fn;


	//	If this is an un-hooked method, hookify it
	if (!method.$$hooks) {
		method = ctx[methodName] = hooks.hookify(method);
		// add a reference to context so we can tell if we need to extend.
		method.$$hooks.$$context = ctx
	} else if (method.$$hooks.$$context !== ctx) {
		// this is an instance, or an constructor that inherited from a parent with hooks.
		method = ctx[methodName] = hooks.hookify(method.core, method.$$hooks.before, method.$$hooks.after);
		method.$$hooks.$$context = ctx;
	};
	
	//	Attach hook
	method.$$hooks[timing][options.order] = options;

}


//	takes a function and returns a wrapped version that will call all of our hooks!
hooks.hookify = function(fn, before, after) {
	if (typeof fn !== 'function') throw new TypeError(fn.toString() + ' is not hookifiable');

	//	

	//	the wrapper function
	//	
	//	<todo>
	//		[*TODO] Preserve function arity and, ideally, parameter names
	//		http://blakeembrey.com/articles/forcing-function-arity-in-javascript/
	//		I'd rather not use eval...
	//	</todo>
	//	
	var newFn = function hooked () {
		var scope = this, 

		//	args are passed to the core function and all middleware.
		args = util.slice(arguments), 

		//	thread-specific data is passed to all middleware functions.
		data = {};

		//	execute "before" hooks
		return hooks.exec(newFn.$$hooks.before, scope, args, data, newFn.$$hooks.$$argList).then(function() {

		//	execute core function
			return newFn.core.apply(scope, args);
		}).then(function(result) {

			//	execute "after" hooks
			return hooks.exec(newFn.$$hooks.after, scope, [result], data, newFn.$$hooks.$$argList).then(function() { 

				//	return the core function's return value
				return result;
			});
		});
	};


	//	add hook storage.
	//	this is also used to check where a function has already been wrapped.
	//
	//	Because we use an unfiltered for-in loop, we create objects with null prototypes to store them
	//	otherwise, Object.prototype manipulation by outside parties would cause some nasty bugs.
	newFn.$$hooks = { before: Object.create(before || null), after: Object.create(after || null) };

	newFn.$$hooks.$$argList = util.parseArgs(fn);


	//	The core function can be dynamically changed by re-assigning wrappedFunction.core
	newFn.core = fn;

	//	we return our wrapped function
	return newFn;
};

//	execute a list of middleware.
hooks.exec = function exec (hooks, scope, args, data, argNames) {
	// threads run in parallel.  if no thread is specified, we use the 'default' thread.
	var threads = {}, hdata;

	util.each(hooks, function(hook) {

		// if the thread hasn't been initallized yet...
		if (!threads[hook.thread]) threads[hook.thread] = Promise.resolve();
		// middleware data is thread-specific.
		if (!data[hook.thread]) data[hook.thread] = {};

		hdata = data[hook.thread];

						// if the option argArray is set to true, we pass it as an object so it can be mutated.
		var hookArgs =	(hook.argArray) ? [args, hdata] : 
						// if the option argMap is set to true, we map named params to an object.  
						// Unnamed params keep their numerical index.

						(hook.argMap) ? [util.argsToObj(args, argNames), hdata] : 

						//	Otherwise we make sure we're always passing a consistent number of arguments.
						//	
						//	If the function has a variable argument length, and only names the first few, 
						//	
						//	the unnnamed parameters will be unavailable in hooks unless argMap or argArray is set to true.
						(argNames.length) ? args.slice(0, argNames.length-1).concat(hdata) : [hdata];

		// add the next middleware to the thread...
		threads[hook.thread] = threads[hook.thread].then(function() { 
			var out;
			if (typeof hook.fn === 'object') {
				// if the "fn" is actually an array/hash of functions, execute them in parallel.
				var parallel = (Array.isArray(hook.fn)) ? [] : {};
				util.each(hook.fn, function(fn, i) {
					parallel[i] = (typeof fn !== 'function') ? fn : fn.apply(scope, hookArgs);
				});
				// return a combined promise the resolves when all parallel functions are completed.
				out = Promise.props(parallel);
			} else {
				// otherwise, execute this middleware.
				out = hook.fn.apply(scope, hookArgs) 
			};

			if (!hook.argMap) return out;

			// if it _was_ set to map the args, we have to merge any changes back into the arg array.
			return out.then(function(res) {
				util.objToArgs(hookArgs[0], argNames, args);
				return res;
			});
		});
	});

	// return a combined promise that resolves when all threads are finished.
	return Promise.props(threads);
};





module.exports = hooks;