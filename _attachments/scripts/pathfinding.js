// Pathfinding algorithm!
// Modified A*. Much thanks to eloquentjavascript.net.

// evidence that this is good:
// http://jsperf.com/array-indexing
function PointMap() {}
PointMap.prototype = {
	set: function(point, value) {
		(this[point[0]] || (this[point[0]] = {}))[point[1]] = value;
	},
	get: function(point) {
		return (this[point[0]] || {})[point[1]];
	}
};

// BinaryHeap
// by Marijn Haverbeke
// http://eloquentjavascript.net/appendix2.html
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
    // I can't figure out how to avoid this happening, so I'm just going to
    // have to not throw an error here.
    //throw new Error("Node not found.");
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


function Pathfinder(options) {
	if (options) for (var method in options) {
		this[method] = options[method];
	}
}
Pathfinder.prototype = {
	// Amount of points by which the pathfinding algorithm may deviate
	// from a straight line.
	// Override to 0 for straight lines only.
	maxExtraLength: Infinity,

	samePoint: function samePoint(a, b) {
		return a[0] == b[0] && a[1] == b[1];
	},

	// return passable neighborhood points (override)
	possibleDirections: function (point) {
		return [];
	},

	// heuristic (optimistic/admissible = never overestimates)
	estimatedDistance: function (pointA, pointB) {
		var dx = pointA[0] - pointB[0];
		var dy = pointA[1] - pointB[1];
		return Math.sqrt(dx*dx + dy*dy);
	},

	routeExists: function (from, to) {
		var route = this.findRoute(from, to, true);
		return this.samePoint(route.point, to);
	},

	// based on http://eloquentjavascript.net/chapter7.html by Marijn Haverbeke
	findRoute: function (from, to, forget) {
		var samePoint = this.samePoint;
		var possibleDirections = this.possibleDirections;
		var estimatedDistance = this.estimatedDistance;

		var open = new BinaryHeap(routeScore);
		var reached = new PointMap();
		var firstRoute = {point: from, length: 0};
		var closestRoute = firstRoute;
		var firstScore = routeScore(closestRoute);
		var minDistanceLeft = firstScore;
		var maxScore = this.maxExtraLength + firstScore;
		var storeEntireRoutes = !forget;

		function routeScore(route) {
			if (route.score == null)
				route.score = estimatedDistance(route.point, to) + route.length;
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
					var newRoute = {
						point: direction,
						from: storeEntireRoutes && route,
						length: newLength
					};
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
};
