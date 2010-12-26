/*
Scroller
A mechanism for getting two-finger scroll events

Usage:
new Scroller({
	container: container element
	contents: inner element
	scrollContents: true, move the contents
	dragToScroll: true, allow click and dragging to scroll to
	start: [0, 0] - an initial scroll position
});
*/

function Scroller(options) {
	var container = options.container;
	var onScroll = options.onScroll;
	var contents = options.contents;
	var scrollContents = contents && options.scrollContents;
	var dragToScroll = options.dragToScroll;
	var start = options.start;
	
	function div(className, child) {
		var element = document.createElement("div");
		element.className = "scroller-" + className;
		if (child) {
			element.appendChild(child);
		}
		return element;
	}
	
	var mover = div("mover", contents);
	var fixer = div("fixer", mover);
	var inner = div("inner", fixer);
	var scroller = div("middle", inner);
	var outer = div("outer", scroller);
	
	this.innerElement = fixer;
	
	container.appendChild(outer);
	
	var x = 0;
	var y = 0;
	var self = this;
	var selfScroll = false;
	function move(dx, dy, e) {
		if (!dx && !dy) {
			return false;
		}
		self.x = (x += +dx);
		self.y = (y += +dy);
		if (onScroll && !selfScroll) {
			onScroll(x, y, e);
		}
		if (scrollContents) {
			mover.style.left = x + "px";
			mover.style.top = y + "px";
		}
		return true;
	}
	this.move = move;
	
	function moveSlow(dx, dy) {
		if (scrollContents) {
			var moved = false;
			Transition(mover, {
				left: x + dx + "px",
				top: y + dy + "px"
			}, 500, function () {
				if (!moved) {
					moved = true;
					move(dx, dy);
				}
			});
		} else {
			// todo
			move(dx, dy);
		}
	}
	
	this.moveTo = function (x1, y1, slow) {
		if (slow) {
			return moveSlow(x1 - x, y1 - y);
		} else {
			return move(x1 - x, y1 - y);
		}
	};
	
	if (start) {
		selfScroll = true;
		move(start[0], start[1]);
		selfScroll = false;
	}
	
	var fixedX = 75;
	var fixedY = 75;
	function reset() {
		scroller.scrollLeft = fixedX;
		scroller.scrollTop = fixedY;
	}
	reset();
	setTimeout(reset, 1);

	scroller.addEventListener("scroll", function (e) {
		if (selfScroll) return;
		var dx = fixedX - this.scrollLeft;
		var dy = fixedY - this.scrollTop;
		if (move(dx, dy, e)) {
			selfScroll = true;
			reset();
			selfScroll = false;
		}
		e.stopPropagation();
		e.preventDefault();
	}, true);
	if (dragToScroll) {
		outer.addEventListener("mousedown", function (e) {
			var prevX = e.pageX;
			var prevY = e.pageY;
			function onMouseMove(e) {
				var dx = e.pageX - prevX;
				prevX = e.pageX;
				var dy = e.pageY - prevY;
				prevY = e.pageY;
				move(dx, dy, e);
			}
			function onMouseUp(e) {
				document.removeEventListener("mouseup", onMouseUp, false);
				document.removeEventListener("mousemove", onMouseMove, false);
				outer.removeEventListener("contextmenu", onMouseUp, false);
			}
			document.addEventListener("mouseup", onMouseUp, false);
			document.addEventListener("mousemove", onMouseMove, false);
			outer.addEventListener("contextmenu", onMouseUp, false);
		}, false);
	}
	outer.addEventListener("mousedown", function (e) {
		e.preventDefault();
	}, true);
}
Scroller.prototype = {
	x: 0,
	y: 0,
	innerElement: null,
	move: null,
	reset: null
};
