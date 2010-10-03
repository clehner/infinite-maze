Couch.urlPrefix = "/couchdb";
var mazesDb = Couch.db("maze");//db");
var container;

function init() {
	if (!window.JSON) {
		loadScript("/scripts/json2.js", init2);
	} else {
		init2();
	}
}

function init2() {
	container = document.getElementById("main");
}