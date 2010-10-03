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

function line(x0, y0, x1, y1, point) {
	var x = Math.floor(x0);
	var y = Math.floor(y0);
	
	if (point(x, y) === false) {
		return;
	}
	
	var xFloor1 = Math.floor(x1);
	var yFloor1 = Math.floor(y1);
	
	if (x == xFloor1 && y == yFloor1) {
		// single pixel
		return;
	}
	
	var yStep = y0 < y1 ? 1 : -1;
	var xStep = x0 < x1 ? 1 : -1;
	var xBorderStep = x0 < x1 ? 1 : 0;
	var slope = (y1 - y0) / (x1 - x0);
	var yInt = y0 - slope * x0;
	
	var j = 0;
	
	do {
		// check y of left or right border
		var x2 = x + xBorderStep;
		var y2 = Math.floor(slope * x2 + yInt);
		if (y2 == y) {
			// move to the right
			x += xStep;
			y = y2;
		} else {
			// move vertically
			y += yStep;
		}
		if (point(x, y) === false) { return; }
	
		if (j++ > 1000) throw new Error("Too much iteration.");
	} while (x != xFloor1 || y != yFloor1);
		
	/*while (x != xFloor1 || y != yFloor1) {
		// right border
		var x2 = x + 1;
		var y2 = Math.floor(slope * x2 + yInt);
		while (y2 != y && y != yFloor1) {
			point(x, y);
			y += yStep;
		}
		x = x2;
		point(x, y);
	}*/
}
