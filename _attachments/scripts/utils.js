if (!window.console) {
	var console = window.console = {
		log: function () {}
	};
}

// http://www.nczonline.net/blog/2009/07/28/the-best-way-to-load-external-javascript/
function loadScript(url, callback) {
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.async = "async";

	if (!callback) {
	} else if (script.readyState) { // IE
		script.onreadystatechange = function () {
			if (script.readyState in {loaded:1, complete:1}) {
				script.onreadystatechange = null;
				callback();
			}
		};
	} else { // others
		script.onload = callback;
	}

	script.src = url;
	var head = document.documentElement.firstChild;
	head.insertBefore(script, head.firstChild);
}

function loadImage(src, success, error) {
	var img = new Image();
	img.onload = success.curry(img);
	img.onerror = error;
	img.src = src;
}

// Conditionally load a script
function shim(feature, url, callback) {
	if (feature) {
		callback();
	} else {
		loadScript(url, callback);
	}
}

var clone = (function () {
	function Dummy() {}
	return function (prototype) {
		Dummy.prototype = prototype;
		return new Dummy();
	};
})();

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
	
	Function.prototype.unbind = function () {
		// this used to cause a crash but i reported it and it was fixed!
		// https://bugs.webkit.org/show_bug.cgi?id=48485
		return this.call.bind(this);
	};
	
})();

// Dummy function.
// evidence that this is ok:
// http://jsperf.com/empty-functions
Function.empty = new Function();

// subtract the elements of one array from another. (set subtraction)
Array.prototype.subtract = function (subtrahend) {
	return this.filter(function (item) {
		return subtrahend.indexOf(item) == -1;
	});
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

// Pathfinding Stuff

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

// Simple pseudoclassical inheritance
function Classy(d,e){var c,a,b;if(!e){a=d;d=null}else{function f(){}f.prototype=d.prototype;a=new f();for(b in e){a[b]=e[b]}}if(a.hasOwnProperty("constructor")){c=a.constructor}else{if(d){c=function(){d.apply(this,arguments)}}else{c=function(){}}a.constructor=c}c.prototype=a;/*@cc_on var g=["toString","toLocaleString","isPrototypeOf","propertyIsEnumerable","hasOwnProperty","valueOf"];while(b=g.pop()){if(e.hasOwnProperty(b)){a[b]=obj[b]}}@*/return c}


// className manipulation
var getClassRegex = function (className) {
	return new RegExp('(\\s|^)' + className + '(\\s|$)', 'g');
}.memoized();

function hasClass(element, className) {
	if (element.className) {
		return element.className.match(getClassRegex(className));
	}
}
function addClass(element, className) {
	if (!className) return;
	if (!hasClass(element, className)) {
		element.className += ' ' + className;
	}
}

function removeClass(element, className) {
	var old = element.className;
	element.className = (old == className) ? '' :
		old.replace(getClassRegex(className), ' ');
}

function toggleClass(element, className, on) {
	if (arguments.length == 2) {
		on = hasClass(element, className);
	}
	if (!on) {
		removeClass(element, className);
	} else {
		addClass(element, className);
	}
}

function DragBehavior(options) {
	var element = options.element;
	if (!element) return null;
	var onDragStart = options.onDragStart;
	var onDrag = options.onDrag;
	var onDragEnd = options.onDragEnd;
	var context = options.context || window;
	
	var offsetX, offsetY;
	function calculateOffsets() {
		var x = 0, y = 0;
		for (var el = element; el; el = el.offsetParent) {
			x += el.offsetLeft - el.scrollLeft;
			y += el.offsetTop - el.scrollTop;
		}
		offsetX = x;
		offsetY = y;
	}
	
	// Add coords relative to element
	function correctEvent(e) {
		e._x = e.pageX - offsetX;
		e._y = e.pageY - offsetY;
	}
	
	function onMouseDown(e) {
		// ignore right click
		document.addEventListener("contextmenu", onMouseUp, false);
		calculateOffsets();
		function onMouseMove(e) {
			correctEvent(e);
			onDrag && onDrag.call(context, e);
		}
		function onMouseUp() {
			document.removeEventListener("mouseup", onMouseUp, false);
			document.removeEventListener("mousemove", onMouseMove, true);
			onDragEnd && onDragEnd.call(context, e);
		}
		document.addEventListener("mouseup", onMouseUp, false);
		document.addEventListener("mousemove", onMouseMove, true);
		
		correctEvent(e);
		onDragStart && onDragStart.call(context, e);
	}
	element.addEventListener("mousedown", onMouseDown, false);
	
	this.setBehavior = function (opt) {
		onDragStart = opt.onDragStart;
		onDrag = opt.onDrag;
		onDragEnd = opt.onDragEnd;
	};
}

if (!Date.now) {
	Date.now = function () {
		return +new Date();
	};
}

function isArray(obj) {
	return Object.prototype.toString.call(obj) == "[object Array]";
}

// originally by William Malone
// http://williammalone.com/articles/html5-canvas-javascript-paint-bucket-tool/
function floodFill(ctx, startX, startY, fillColor, threshold) {
	var canvasWidth = ctx.canvas.width;
	var canvasHeight = ctx.canvas.height;
	var colorLayer = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
	var drawingBoundTop = 0;
	
	var startPixelPos = (startY * canvasWidth + startX) * 4;
	var startR = colorLayer.data[startPixelPos];
	var startG = colorLayer.data[startPixelPos + 1];
	var startB = colorLayer.data[startPixelPos + 2];
	var startA = colorLayer.data[startPixelPos + 3];
	
	if (fillColor[0] == "#") {
		fillColor = [
			parseInt(fillColor.substr(1, 2), 16),
			parseInt(fillColor.substr(3, 2), 16),
			parseInt(fillColor.substr(5, 2), 16)
		];
	}
	var fillColorR = fillColor[0];
	var fillColorG = fillColor[1];
	var fillColorB = fillColor[2];
	
	if (matchStartColor2(fillColorR, fillColorG, fillColorB)) {
		return;
	}
	
	var preserveAlpha = (startA == 255);
	
	function matchStartColor(pixelPos) {
		return matchStartColor2(
			colorLayer.data[pixelPos],
			colorLayer.data[pixelPos + 1],
			colorLayer.data[pixelPos + 2]
		);
	}
	function matchStartColor2(r, g, b) {
		return Math.abs(r - startR) <= threshold &&
			Math.abs(g - startG) <= threshold &&
			Math.abs(b - startB) <= threshold;
	}
	
	function colorPixel(pixelPos) {
		colorLayer.data[pixelPos] = fillColorR;
		colorLayer.data[pixelPos + 1] = fillColorG;
		colorLayer.data[pixelPos + 2] = fillColorB;
		if (!preserveAlpha) colorLayer.data[pixelPos + 3] = 255;
	}

	var pixelStack = [
		[startX, startY]
	];
	while (pixelStack.length) {
		var newPos, x, y, pixelPos, reachLeft, reachRight;
		newPos = pixelStack.pop();
		x = newPos[0];
		y = newPos[1];
		pixelPos = (y * canvasWidth + x) * 4;
		while (y-- >= drawingBoundTop && matchStartColor(pixelPos)) {
			pixelPos -= canvasWidth * 4;
		}
		pixelPos += canvasWidth * 4;
		++y;
		reachLeft = false;
		reachRight = false;
		while (y++ < canvasHeight - 1 && matchStartColor(pixelPos)) {
			colorPixel(pixelPos);
			if (x > 0) {
				if (matchStartColor(pixelPos - 4)) {
					if (!reachLeft) {
						pixelStack.push([x - 1, y]);
						reachLeft = true;
					}
				} else if (reachLeft) {
					reachLeft = false;
				}
			}
			if (x < canvasWidth - 1) {
				if (matchStartColor(pixelPos + 4)) {
					if (!reachRight) {
						pixelStack.push([x + 1, y]);
						reachRight = true;
					}
				} else if (reachRight) {
					reachRight = false;
				}
			}
			pixelPos += canvasWidth * 4;
		}
		ctx.putImageData(colorLayer, 0, 0);
	}
}

// parse a GET-encoded query string into an object
function parseQuery(str) {
	var obj = {};
	str.split('&').forEach(function (pair) {
		var pair2 = pair.split('=');
		var key = pair2[0];
		var value = pair2[1];
		if (key in obj) {
			var prevValue = obj[key];
			if (typeof prevValue == "string") {
				obj[key] = [prevValue, value];
			} else {
				prevValue.push(value);
			}
		} else {
			obj[key] = value;
		}
	});
	return obj;
}

var Cookie = {
	get: function (c_name) {
		if (document.cookie.length > 0) {
			var c_start = document.cookie.indexOf(c_name + "=");
			if (c_start != -1) {
				c_start = c_start + c_name.length + 1;
				var c_end = document.cookie.indexOf(";", c_start);
				if (c_end == -1) c_end = document.cookie.length;
				return unescape(document.cookie.substring(c_start, c_end));
			}
		}
		return "";
	},
	set: function (c_name, value, expiredays) {
		var exdate = new Date();
		exdate.setDate(exdate.getDate() + expiredays);
		document.cookie = c_name + "=" + escape(value) +
			((expiredays == null) ? "" : ";expires=" + exdate.toUTCString());
	}
};

// caps invokation frequency at @threshold ms
Function.prototype.throttle = function (threshold) {
	var func = this,
		throttling, args,
		apply = this.apply;
	function endThrottle() {
		throttling = false;
		if (args) {
			apply.apply(func, args);
			args = null;
		}
	}
	return function throttler() {
		if (throttling) {
			args = [this, arguments];
		} else {
			args = null;
			throttling = true;
			setTimeout(endThrottle, threshold);
			return func.apply(this, arguments);
		}
	};
};

// debounce, by John Hann
// http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
// discard close invokations for the last one.
Function.prototype.debounce = function (threshold, execAsap) {
	var func = this, timeout;
	return function debounced() {
		var obj = this, args = arguments;
		function delayed() {
			if (!execAsap)
				func.apply(obj, args);
			timeout = null; 
		}
 
		if (timeout)
			clearTimeout(timeout);
		else if (execAsap)
			func.apply(obj, args);
 
		timeout = setTimeout(delayed, threshold || 100); 
	};
}


// pythagorean distance formula
function distance(x, y) {
	return Math.sqrt(x*x + y*y);
}

String.prototype.contains = Array.prototype.contains = function (thing) {
	return this.indexOf(thing) != -1;
};

function number(n) {
	return +n || 0;
}

// a loader image thing
function Loader(element) {
	this.element = element;
}
Loader.prototype = {
	start: function () {
		addClass(this.element, "loading");
	},
	stop: function () {
		removeClass(this.element, "loading");
	}
};
