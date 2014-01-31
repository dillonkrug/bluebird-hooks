module.exports = {
	each: function(o, fn) { 
		var keys = [];
		for (var i in o) keys.push(i);
		keys.sort(function(a,b) { return a-b });
		for (var i = 0; i < keys.length; i++) fn(o[keys[i]], keys[i]);
	},
	inc: (function(n) { return function() { return n++; } }(0)),
	slice: Function.prototype.call.bind(Array.prototype.slice),
	parseArgs: function(fn) {
		return fn.toString()
			 // match the function [name ... ] (arg, list)
			 .match(/function(?:\s+\w+)?\s*\(([^\)]*)\)/)[1]
			 // remove single line comments
			 .replace(/\/\/.*/g, "")
			 // remove whitespace
			 .replace(/\s/g, "")
			 // remove multi-line comments
			 .replace(/\/\*.*?\*\//g, "")
			 // split list of arguments
			 .split(',');
	},
	argsToObj: function(args, argNames) {
		var out = {}, l = Math.max(args.length, argNames.length);
		for (var i = 0; i < l; i++) out[argNames[i] || i] = args[i];
		return out;
	},
	objToArgs: function(obj, argNames, args) {
		var out = args || [], l = Math.max(Object.keys(obj).length, argNames.length);
		for (var i = 0; i < l; i++) out[i] = obj[argNames[i] || i];
		return out;
	}
}

