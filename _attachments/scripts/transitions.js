// simple single-argument memozier
var memoizer = function (fn) {
    var cache = {};
	return function (arg) {
		return cache[arg] || (cache[arg] = fn(arg));
	};
};

// Tween CSS properties (emulating CSS 3 Transitions)
Transition = (function () {
	
	// Feature detection for CSS Transforms
	var cssTransformType = (function () {
		var s = document.createElement("div").style;
		return (
			typeof s.WebkitTransform == "string" ? "WebkitTransform" :
			typeof s.MozTransform == "string" ? "MozTransform" :
			typeof s.transform == "string" ? "transform" :
			null
		);
	})();
	
	// WebKit has native support for CSS transitions
	if (window.WebKitTransitionEvent) {
	
		// Cache regexes, for speed.
		var compiledRegex1 = memoizer(function (prop) {
			return new RegExp("(\\s|^)" + prop + "(,\\s|$)");
		});
		
		var compiledRegex2 = memoizer(function (prop) {
			return new RegExp(prop + "(,\\s|$)|(,\\s|^)" + prop +
				"|^" + prop + "$", "g");
		});

		var T = function (elm, css, duration, cb) {
			// keep track of the transitions for each element
			if (typeof elm._transitions == "undefined") elm._transitions = {};
		
			for (var property in css) {
				(function () { // to do: fix this thing so it doesn't need this
				
					var startTime = +new Date();
					
					var style = elm.style; //document.defaultView.getComputedStyle(elm);
					
					// the value to transition the property to
					var value = css[property];
					
					// if an interpolator function is given, use it's final value
					if (typeof value == "function") value = value(1);
	
					// ignore if no difference
					if (style[property] === value) return;
					
					// change "PropertyName" to "-property-name"
					var property2 = property.replace(/[A-Z]/g, function (l) {
						return "-" + l.toLowerCase();
					});
					
					// stop any previous transition on the this property of this element.
					var oldT = elm._transitions[property];
					if (oldT) oldT.stopWithoutReset();
					
					// set the transition property.
					var transProp = style.WebkitTransitionProperty;
					if (!transProp || transProp == "all" || transProp == "none") {
						elm.style.WebkitTransitionProperty = property2;
						
					} else if (!transProp.match(compiledRegex1(property2))) {
						
						elm.style.WebkitTransitionProperty = transProp + ", " + property2;
					}
					
					elm.style.WebkitTransitionDuration = duration+"ms";
					//elm.style.WebkitTransitionTimingFunction = timingFunctionName;
					//console.log('prop:'+property+' value: '+value+'. old: '+elm.style[property]);
					elm.style[property] = value;
	
					var endTimeout;
					var t = {};
					var done = false;
					t.stopWithoutReset = function () {
						// replace the transition
						clearTimeout(endTimeout);
						delete elm._transitions[property];
						if (cb && !done) cb.call(elm, (new Date - startTime) / duration);
						done = true;
					};
					t.stop = function () {
						elm.style.WebkitTransitionProperty =
							style.WebkitTransitionProperty.
							replace(compiledRegex2(property2), "") ||
							"none";
						
						delete elm._transitions[property];
						if (cb && !done) cb.call(elm, (new Date - startTime) / duration);
						done = true;
					};
					elm._transitions[property] = t;
					endTimeout = setTimeout(t.stop, duration);
				})();
			}
		};
		T.cssTransformType = cssTransformType;
		T.isNative = true;
	
	} else {
		// Emulate CSS transitions
	
		var transitions = [], // current transitions
		timerOn = false, // whether the timer is running
		timerValue, // id of the timer
		
		ease = function (t) {
			return t < .5 ? 2*t*t : 1 - 2*(t-1)*(t-1); // square
			//return t < .5 ? 4*t*t*t : 1 + 4*(t-1)*(t-1)*(t-1);
		},
		
		// global timer that executes the transitions
		timer = function () {
			var i, l, t, n, currentTime;
			
			timerOn = true;
			currentTime = +new Date;
			for (i=0, l=transitions.length; i<l; i++) {
				t = transitions[i];
				if (!t || t.done) {
					transitions.splice(i, 1);
					continue;
				}
				n = Math.min(1, (currentTime - t.startTime) / t.duration);
				t.elm.style[t.property] = t.interpolate(ease(n));
				if (n == 1) {
					t.stop(1);
				}
			}
			if (!transitions.length) {
				clearTimeout(timerValue);//setTimeout(timer, T.speed);
				timerOn = false;
			}
		},
	
		// helper function for colors
		colorToArray = function (color) {
			if (typeof color == "string") {
				if (color[0] == "#") { // ex: #ff0000, #f00
					var a = parseInt(color.substring(1), 16); // color as integer
					if (color.length == 4) return [(a&0xf00)+(a&0xf00)/0x10, (a&0x0f0)+(a&0x0f0)/0x10, (a&0x00f)+(a&0x00f)/0x10];
					return [a & 0xff0000, a & 0x00ff00, a & 0x0000ff];
				} else if (color.indexOf("rgb(") === 0) { // ex: rgb(255, 0, 0)
					var rgb = /rgb\(([0-9]+), ([0-9]+), ([0-9]+)\)/g.exec(color);
					return [~~rgb[1], ~~rgb[2], ~~rgb[3]];
				}
			}
			return null;
		},
		
		// create a function to set the intermediate values during the transition
		getInterpolator = function (t) {
			// same
			if (t.startValue == t.endValue) {
				return function () {
					return t.startValue;
				};
			}
			
			// number
			if (typeof t.startValue == "number") {
				var delta = t.endValue - t.startValue;
				return function (n) {
					return t.startValue + (delta * n);
				};
			}
			
			// function
			if (typeof t.endValue == "function") {
				t.elm.style[t.property] = t.endValue(0);
				return t.endValue;
			}
			
			// color
			var b = colorToArray(t.endValue)
			if (b) {
				var a = colorToArray(t.startValue) || [0xff, 0xff, 0xff];
				// transition hex from a to b
				return function interpolate(n) {
					return "#" + (0x1000000 +
						0x10000 * ~~(a[0]*(1-n) + b[0]*n) +
						0x100 * ~~(a[1]*(1-n) + b[1]*n) +
						~~(a[2]*(1-n) + b[2]*n)).
						toString(16).substring(1);
					// the +0x1000000 and substring(1) are for padding.
				}
			}
			
			// number with unit
			var unitValues = {"": 1, px: 1, pt: 1, em: 12, ex:6, "%":15};
			if (typeof t.endValue == "number") {
				var endUnit = "";
			} else {
				var endUnit = t.endValue.slice(-2);
//				if (!(endUnit in unitValues)) endUnit = "";
				if (!unitValues[endUnit]) endUnit = "";
			}
			//if (endUnit || !isNaN(parseInt(t.endValue.slice(-1)))) {
				var startUnitValue = unitValues[t.startValue.slice(-2)] || 1,
				startValueCorrected = ~~parseInt(t.startValue, 10) * startUnitValue / unitValues[endUnit];
				var delta = ~~parseInt(t.endValue, 10) - startValueCorrected;
				var interpolate = function interpolate(n) {
					return ~~(startValueCorrected + (delta * n)) + endUnit;
				};
				return interpolate;
			//}
			
			// function
			/*
			var funcRegex = /^(.*?)\((.*?)\)$/,
			endFunc = funcRegex.exec(t.endValue);
			if (endFunc) {
				
			}*/
		},
		
		// Transition function
		T = function (elm, css, duration, endCb) {
			for (var property in css) {
				var t = {
					elm: elm,
					property: property,
					startValue: elm.style[property],
					endValue: css[property],
					startTime: +new Date,
					duration: duration,
					stop: function (n) {
						this.done = true;
						delete elm._transitions[property];
						if (endCb) endCb.call(this.elm, n || Math.min(1, (new Date - this.startTime) / duration));
					},
					i: transitions.length
				};
				
				if (typeof t.startValue == "undefined" || typeof t.endValue == "undefined") continue;
	
				t.interpolate = getInterpolator(t);
				//if (typeof t.endValue == "function") elm.style[property] = t.interpolate(0);
				
				transitions[t.i] = t;
				
				// if the element already has a transition on this property, cancel and replace it.
				if (!elm._transitions) elm._transitions = {};
				var oldT = elm._transitions[property];
				//if (oldT) oldT.stop();
				elm._transitions[property] = t;
			}
			
			if (!timerOn) {
				timerValue = setInterval(timer, T.speed);
			}
		};
		T.speed = 10;
		T.cssTransformType = cssTransformType;
		T.isNative = false;
	}
	T.stopAll = function (elm) {
		if (!elm._transitions) return;
		for (var i=0, l=elm._transitions.length; i<l; i++) {
			elm._transitions[i].stop();
		}
	};
	return T;
})();