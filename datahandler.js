var app = angular.module("LogApp", []);
app.controller("dbController", dbHandler);

var today = Date.now();
console.log(today);

app.filter('round', function() {
	return function(input, places) {
		if (places==undefined) places = 0;
		var multiplier = Math.pow(10, places);
		var numberString = (Math.round(parseFloat(input)* multiplier) / multiplier).toString();
		if (places>0) {
			if (numberString.indexOf('.')==-1) numberString+=".";
			var trailingZeros = places - numberString.split('.')[1].length;
			for (var i=0; i<trailingZeros; i++) numberString = numberString + "0";
		}
		return numberString;
	}
});

app.filter('formatTime', function() {
	return function(input) {
		if (input==null) return "";
		var formattedString = "";
		parts = input.split(':');
		hours = parseInt(parts[0]);
		minutes = parseInt(parts[1]);
		seconds = parseFloat(parts[3]);
		if (hours<10)	formattedString+="0";
		formattedString+= hours;
		formattedString+= ":";
		if (minutes<10)	formattedString+="0";
		formattedString+= minutes;
		return formattedString;
	}
});

instrumentColumns = {
	"all":  [ "RUN", "OBJECT", "RA", "DEC", "UTOBS", "AIRMASS", "EXPTIME", "ROTSKYPA"],
	"IDS":  [ "SLITWID", "GRATNAME", "BSCFILT", "CENWAVE" ],
	"ISIS": [ "ISISSLITW", "ISISFILTA", "ISISFILTB", "ISISGRAT", "CENWAVE"]
}


function dbHandler($scope, $http) {
	$scope.telescopes = [{'name': "WHT", 'path' : 'whta', 'imageURL' : 'whtlogo.gif', 'colour':"red" },
											 {'name': "INT", 'path' : 'inta', 'imageURL' : 'intlogo.gif', 'colour':"blue"}];
	$scope.telescope = $scope.telescopes[0];
	$scope.sortColumn = 'unixtime'
	$scope.sortReverse = true;
	$scope.statusString = "data loading....";
	$scope.headerList = ['none'];
	$scope.instrument = "Unknown";
	$scope.columnNames = [];
	dbfilename = "db.json";

	$scope.init = function() {
		loadFromJSON($http, $scope);
	}

	if (localStorage.date==null) {
		$scope.date = new Date();
		if ($scope.date.getHours()<17) $scope.date.setDate($scope.date.getDate() - 1);
		logDateString = $scope.date.getFullYear() + ("0"+($scope.date.getMonth()+1)).slice(-2) + ("0" + $scope.date.getDate()).slice(-2);
		localStorage.date = logDateString;
	} else {
		var year = localStorage.date.substring(0,4);
		var month = localStorage.date.substring(4,6);
		var day = localStorage.date.substring(6,8);
		console.log("Restoring date:  " + year + ":" + month + ":" + day);
		$scope.date = new Date(year, parseInt(month)-1, day);
	}

	if (localStorage.telescope!=null) {
		console.log("Restoring telescope: " + localStorage.telescope);
		$scope.telescope = JSON.parse(localStorage.telescope);
	}


	$scope.dateString = localStorage.date;

	function loadFromJSON($http) {
		var datePath = $scope.date.getFullYear() + ("0"+($scope.date.getMonth()+1)).slice(-2) + ("0" + $scope.date.getDate()).slice(-2);
		JSONfilename = $scope.telescope.path  + "/" + datePath + "/" + dbfilename;
		console.log("Getting data at : " + JSONfilename);
		$http.get(JSONfilename).
			success(function(data, status, headers, config) {
				$scope.db = data;
				// console.log($scope.db);
				$scope.statusString = "data ready";
				generateHeaderlist(data);
			}).
			error(function(data, status, headers, config) {
				console.log("There was an error when fetching the data.")
				$scope.statusString = "no data!";
			});
	}

	function generateHeaderlist(db) {
		$scope.headerList = [];
		$scope.instrument = db[0].INSTRUME;
		$scope.columnNames = instrumentColumns.all;
		if ((db[0].INSTRUME).indexOf("ISIS")!=-1) $scope.instrument = "ISIS";
		$scope.columnNames = $scope.columnNames.concat(instrumentColumns[$scope.instrument]);
		for (var i in db) {
			var keys = Object.keys(db[i])
			for (var k in keys) {
				if ($scope.headerList.indexOf(keys[k])==-1) $scope.headerList.push(keys[k]);
			}
		}
		console.log($scope.headerList);
	}

	$scope.clear = function clear() {
		console.log("Clearing the current data.");
		$scope.db = [];
		$scope.statusString = "Cleared data";
		}

	$scope.load = function load() {
		console.log("Load button clicked");
		console.log("Requested telescope: " + $scope.telescope.name + " on date: " + $scope.date);
		console.log("Saving to local storage");
		$scope.clear();
		localStorage.setItem('telescope', JSON.stringify($scope.telescope));
		$scope.statusString = "Reloading the data";
		loadFromJSON($http);
	}

	$scope.setToday = function setToday() {

	}

	$scope.dateChange = function dateChange() {
		console.log("Date changed to " + $scope.date);
		logDateString = $scope.date.getFullYear() + ("0"+($scope.date.getMonth()+1)).slice(-2) + ("0" + $scope.date.getDate()).slice(-2);
		console.log("Storing locally: " + logDateString);
		localStorage.date = logDateString;
		$scope.dateString = localStorage.date;
		$scope.load();
	}

}
