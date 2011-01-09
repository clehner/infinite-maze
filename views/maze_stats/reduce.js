function(keys, values, rereduce) {
	// Array.prototype.reduce
	if(!values.reduce)values.reduce=function(e){if(this==null)throw new TypeError;var b=Object(this),d=b.length>>>0;if(typeof e!=="function")throw new TypeError;if(d==0&&arguments.length==1)throw new TypeError;var a=0,c;if(arguments.length>=2)c=arguments[1];else{do{if(a in b){c=b[a++];break}if(++a>=d)throw new TypeError;}while(1)}for(;a<d;){if(a in b)c=e.call(undefined,c,b[a],a,b);a++}return c};
	
	var result = values.reduce(function (a, b) {
		return {
			area: a.area + b.area,
			bounds: [[
				Math.min(a.bounds[0][0], b.bounds[0][0]),
				Math.min(a.bounds[0][1], b.bounds[0][1])
			], [
				Math.max(a.bounds[1][0], b.bounds[1][0]),
				Math.max(a.bounds[1][1], b.bounds[1][1])
			]]
		};
	}, {
		area: 0,
		bounds: [[Infinity, Infinity], [-Infinity, -Infinity]]
	});
	result.height = result.bounds[1][1] - result.bounds[0][1] + 1;
	result.width  = result.bounds[1][0] - result.bounds[0][0] + 1;
	return result;
}