/*
Classy - Simple and Fast Javascript Inheritance.
(No fancy stuff)

Inspiration:
http://ejohn.org/blog/simple-javascript-inheritance/
http://valums.com/javascript-oop/
http://www.broofa.com/blog/2009/02/javascript-inheritance-performance/

Example:
	
	Animal = Classy({
		constructor: function () {
			console.log("An animal is born.");
		},
		bite: function () {
			alert("Bite!");
		}
	});
	
	Cat = Classy(Animal, {
		hiss: function () {
			alert("Hisssss!");
		},
		biteAndHiss: function () {
			Animal.prototype.bite.call(this, arguments);
			this.hiss();
		}
	});
*/

function Classy(parent, properties) {
	var newClass, prototype, prop;

	// Dummy constructor. The reason this is used instead of the
	// actual parent's constructor is that the parent's constructor
	// should not be called when the child class is created.
	
	// The parent argument is optional
	if (!properties) {
		prototype = parent;
		parent = null;
	}
	else {
		// Create the prototype, inheriting from parent.
		function Tmp() {}
		Tmp.prototype = parent.prototype;
		prototype = new Tmp();
		
		// Copy the properties into the new prototype.
		for (prop in properties) {
			prototype[prop] = properties[prop];
		}
		
		// Fix IE that doesn't iterate through non-enumerable properties
		// when using for in loop.
		
		/*@cc_on
		var nonEnum = ["toString", "toLocaleString", "isPrototypeOf",
			"propertyIsEnumerable", "hasOwnProperty", "valueOf", "constructor"];
		
		while (prop = nonEnum.pop()) {
			if (properties.hasOwnProperty(prop)) {
				prototype[prop] = properties[prop];
			}
		}
		@*/
	}
	
	// If the child has defined a constructor, use it.
	if (prototype.hasOwnProperty("constructor")) {
		newClass = prototype.constructor;
	}
	// Otherwise use the parent's constructor, or
	// if there is no parent, use a dummy constructor
	else {
		if (parent) {
			newClass = function () {
				parent.apply(this, arguments);
			};
		}
		else {
			newClass = function () {};
		}
		prototype.constructor = newClass;
	}
	
	// Attach the prototype to the class.
	newClass.prototype = prototype;
	
	return newClass;
}