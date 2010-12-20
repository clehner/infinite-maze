if (!window.console) {
	var console = window.console = {
		log: function () {}
	};
}

// http://www.nczonline.net/blog/2009/07/28/the-best-way-to-load-external-javascript/
function loadScript(url, callback){
    var script = document.createElement("script")
    script.type = "text/javascript";

    if (script.readyState){ // IE
        script.onreadystatechange = function(){
            if (script.readyState == "loaded" ||
                    script.readyState == "complete") {
                script.onreadystatechange = null;
                callback();
            }
        };
    } else { // others
        script.onload = function () {
            callback();
        };
    }

    script.src = url;
    var head = document.documentElement.firstChild;
    head.insertBefore(script, head.firstChild);
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
	}
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
	
	Function.prototype.unbind = function () {
		// this used to cause a crash but i reported it and it was fixed!
		// https://bugs.webkit.org/show_bug.cgi?id=48485
		return this.call.bind(this);
	};
	
})();

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

// by Marijn Haverbeke, http://eloquentjavascript.net/appendix2.html
function BinaryHeap(scoreFunction){
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function(element) {
    // Add the new element to the end of the array.
    this.content.push(element);
    // Allow it to sink down.
    this.sinkDown(this.content.length - 1);
  },

  pop: function() {
    // Store the first element so we can return it later.
    var result = this.content[0];
    // Get the element at the end of the array.
    var end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  },

  remove: function(node) {
    var len = this.content.length;
    // To remove a value, we must search through the array to find
    // it.
    for (var i = 0; i < len; i++) {
      if (this.content[i] == node) {
        // When it is found, the process seen in 'pop' is repeated
        // to fill up the hole.
        var end = this.content.pop();
        if (i != len - 1) {
          this.content[i] = end;
          if (this.scoreFunction(end) < this.scoreFunction(node))
            this.sinkDown(i);
          else
            this.bubbleUp(i);
        }
        return;
      }
    }
    throw new Error("Node not found.");
  },

  size: function() {
    return this.content.length;
  },

  sinkDown: function(n) {
    // Fetch the element that has to be sunk.
    var element = this.content[n];
    // When at 0, an element can not sink any further.
    while (n > 0) {
      // Compute the parent element's index, and fetch it.
      var parentN = Math.floor((n + 1) / 2) - 1,
          parent = this.content[parentN];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }
  },

  bubbleUp: function(n) {
    // Look up the target element and its score.
    var length = this.content.length,
        element = this.content[n],
        elemScore = this.scoreFunction(element);

    while(true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) * 2, child1N = child2N - 1;
      // This is used to store the new position of the element,
      // if any.
      var swap = null;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N],
            child1Score = this.scoreFunction(child1);
        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore)
          swap = child1N;
      }
      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N],
            child2Score = this.scoreFunction(child2);
        if (child2Score < (swap == null ? elemScore : child1Score))
          swap = child2N;
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap != null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
      // Otherwise, we are done.
      else {
        break;
      }
    }
  }
};

function point(x, y) {
	return {x: x, y: y};
}

function samePoint(a, b) {
	return a.x == b.x && a.y == b.y;
}

function PointMap() {}
PointMap.prototype = {
	set: function (point, value) {
		(this[point.x] || (this[point.x] = {}))[point.y] = value;
	},
	get: function (point) {
		return (this[point.x] || 0)[point.y];
	}
};

// heuristic (optimistic)
function estimatedDistance(pointA, pointB) {
	var dx = Math.abs(pointA.x - pointB.x),
		dy = Math.abs(pointA.y - pointB.y);
	return (dx > dy) ?
		(dx - dy) * 1 + dy * Math.SQRT2:
		(dy - dx) * 1 + dx * Math.SQRT2;
}
/*
function estimatedDistance(pointA, pointB) {
	var dx = Math.abs(pointA.x - pointB.x);
	var dy = Math.abs(pointA.y - pointB.y);
	return dx + dy;
}
function estimatedDistance(pointA, pointB) {
	var dx = pointA.x - pointB.x;
	var dy = pointA.y - pointB.y;
	return Math.sqrt(dx*dx + dy*dy);
}
*/

// based on http://eloquentjavascript.net/chapter7.html
function findRoute(from, to, possibleDirections, maxLength) {
  var open = new BinaryHeap(routeScore);
  var reached = new PointMap();
  var firstRoute = {point: from, length: 0};
  var closestRoute = firstRoute;
  var firstScore = routeScore(closestRoute);
  var minDistanceLeft = firstScore;
  var maxScore = maxLength + firstScore;

  function routeScore(route) {
    if (route.score == undefined)
      route.score = estimatedDistance(route.point, to) +
                    route.length;
    return route.score;
  }
  function addOpenRoute(route) {
    open.push(route);
    reached.set(route.point, route);
  }
  addOpenRoute(firstRoute);

  while (open.size() > 0) {
    var route = open.pop();
    
    if (samePoint(route.point, to))
      return route;
    var estDistanceLeft = route.score - route.length;
    if (estDistanceLeft < minDistanceLeft) {
      closestRoute = route;
      minDistanceLeft = estDistanceLeft;
    }
    
    possibleDirections(route.point).forEach(function(direction) {
      var known = reached.get(direction);
      var newLength = route.length + 1;
      if (!known || known.length > newLength) {
        var newRoute = {point: direction,
                        from: route,
                        length: newLength};
        if (routeScore(newRoute) <= maxScore) {
          if (known) {
            open.remove(known);
          }
          addOpenRoute(newRoute);
        }
      }
    });
  }
  return closestRoute;
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
		old.replace(getClassRegex(className), '');
}

function toggleClass(element, className, on) {
	if (arguments.length == 2) {
		on = hasClass(element, className);
	}
	if (!on) {
		removeClass(element, className)
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
			x += el.offsetLeft;
			y += el.offsetTop;
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
