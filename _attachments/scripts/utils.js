// http://www.nczonline.net/blog/2009/07/28/the-best-way-to-load-external-javascript/
function loadScript(url, callback){

    var script = document.createElement("script")
    script.type = "text/javascript";

    if (script.readyState){ //IE
        script.onreadystatechange = function(){
            if (script.readyState == "loaded" ||
                    script.readyState == "complete"){
                script.onreadystatechange = null;
                callback();
            }
        };
    } else { //Others
        script.onload = function(){
            callback();
        };
    }

    script.src = url;
    var head = document.documentElement.firstChild;
    head.insertBefore(script, head.firstChild);
}


Function.prototype.memoized = function () {
	var fn = this, cache = {};
	return function (arg) {
		return cache[arg] || (cache[arg] = fn(arg));
	};
};

(function () {
	var slice = Array.prototype.slice;

	Function.prototype.bind = function (context) {
		var fn = this,
			args = slice.call(arguments, 1);

		if (args.length) {
			return function () {
				return arguments.length ?
					fn.apply(context, args.concat(slice.call(arguments))) :
					fn.apply(context, args);
			};
		} 
		return function () {
			return fn.apply(context, arguments);
			/*return arguments.length ?
				fn.apply(context, arguments) :
				fn.call(context);*/
		};
	};
	
	Function.prototype.curry = function () {
		if (!arguments.length) {
			return this;
		}
		var fn = this,
			args = slice.call(arguments);
		return function () {
			return arguments.length ?
				fn.apply(this, args.concat.apply(args, arguments)) :
				fn.apply(this, args);
		};
	};
	
})();

Function.prototype.unbind = function () {
	return this.call.bind(this);
};

// http://gist.github.com/345486
// Simulate onhashchange support in all browsers
"onhashchange" in window || (function () {
	var lastHash = '';
	function pollHash() {
		if (lastHash !== location.hash) {
			lastHash = location.hash;
			var event = document.createEvent("HTMLEvents");
			event.initEvent("hashchange", true, false);
			document.body.dispatchEvent(event);
			if (typeof onhashchange == "function") {
				onhashchange(event);
			}
		}
	}
	setInterval(pollHash, 100);
})();
