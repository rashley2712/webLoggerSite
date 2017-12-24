var app = angular.module("LogApp", ['ngSanitize']);
app.controller("dbController", dbHandler);

var today = Date.now();
console.log(today);

app.filter('round', function() {
	return function(input, places) {
		return (Math.round(parseFloat(input)));
	}
});

app.filter('round2', function() {
	return function(input, places) {
		if (places==undefined) places = 2;
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

app.filter('picker', function($filter) {
  return function(value, filterName) {
    return $filter(filterName)(value);
  };
});

app.filter('none', function() {
	return function(input) {
		return input;
	};
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

refreshDataTimeout = 10000;

instrumentColumns = {
	"all":  [ 	{ 'id': "RUN", 		'name': 'Run', 				'sort': 'RUN', 		'format': 'none' },  
			 	{ 'id': "OBJECT", 	'name': 'Object', 			'sort': 'OBJECT', 	'format': 'none' }, 
				{ 'id': "RA", 		'name': 'RA', 				'sort': 'RA', 		'format': 'none' }, 
				{ 'id': "DEC",		'name': 'DEC', 				'sort': 'DEC', 		'format': 'none' },  
				{ 'id': "UTOBS",	'name': 'UT', 				'sort': 'unixtime', 'format': 'formatTime' },
		 		{ 'id': "AIRMASS",	'name': 'Airmass', 			'sort': 'AIRMASS', 	'format': 'round2' },
		 		{ 'id': "EXPTIME",  'name': 'T<sub>exp</sub>', 	'sort': 'EXPTIME', 	'format': 'round' },
				{ 'id': "ROTSKYPA", 'name': 'Sky PA',			'sort': 'ROTSKYPA', 'format': 'round'} 
			],
	"IDS":  [ 	{ 'id': "SLITWID",	'name': 'Slit width',		'sort': 'SLITWID', 	'format': 'round' },
				{ 'id': "GRATNAME", 'name': 'Grating', 			'sort': 'GRATNAME', 'format': 'none' },
				{ 'id': "BSCFILT",  'name': 'Filter', 			'sort': 'BSCFILT', 	'format': 'none' },
				{ 'id': "CENWAVE",  'name': 'Cen. wave', 		'sort': 'CENWAVE', 	'format': 'none' } 
			],
	"WFC":  [	{ 'id': "WFFPSYS",	'name': 'System',			'sort': 'WFFPSYS',  'format': 'none' },
				{ 'id': "WFFBAND",	'name': 'Filter', 			'sort': 'WFFBAND',	'format': 'none' },
				{ 'id': "CCDSPEED", 'name': 'Speed',			'sort': 'CCDSPEED', 'format': 'none' }
			],
	"ISIS": [	{ 'id': "ISISSLITW",'name': 'Slit width', 		'sort': 'ISISSLITW','format': 'round'},
				{ 'id': "ISISFILTA",'name': 'Filter A', 		'sort': 'ISISFILTA','format': 'none' },
				{ 'id': "ISISFILTB",'name': 'Filter B', 		'sort': 'ISISFILTB','format': 'none' },
				{ 'id': "ISISGRAT", 'name': 'Grating', 			'sort': 'ISISGRAT', 'format': 'none' },
				{ 'id': "CENWAVE", 	'name': 'Cen. wave', 		'sort': 'CENWAVE', 	'format': 'none' }
			]
	}


function dbHandler($scope, $http) {
	$scope.telescopes = [{'name': "WHT", 'path' : 'whta', 'imageURL' : 'whtlogo.gif', 'colour':"red" },
											 {'name': "INT", 'path' : 'inta', 'imageURL' : 'intlogo.gif', 'colour':"blue"}];
	$scope.telescope = $scope.telescopes[0];
	$scope.instrumentColumns = instrumentColumns;
	$scope.sortColumn = 'unixtime'
	$scope.sortReverse = true;
	$scope.statusString = "data loading....";
	$scope.headerList = ['none'];
	$scope.instrument = "Unknown";
	$scope.columnNames = [];
	dbfilename = "db.json";

	$scope.init = function() {
		loadFromJSON($http , function(data) { 
			console.log("In data callback.");
			console.log(data);
			generateHeaderlist(data);
			$scope.db = data;
			$scope.resort('unixtime', true);
			$scope.statusString = "data ready.";
			});
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

	function loadFromJSON($http, callback) {
		var datePath = $scope.date.getFullYear() + ("0"+($scope.date.getMonth()+1)).slice(-2) + ("0" + $scope.date.getDate()).slice(-2);
		JSONfilename = $scope.telescope.path  + "/" + datePath + "/" + dbfilename;
		console.log("Getting data at : " + JSONfilename);
		$http.get(JSONfilename).
			success(function(data, status, headers, config) {
				callback(data);
			}).
			error(function(data, status, headers, config) {
				console.log("There was an error when fetching the data.")
				$scope.statusString = "no data!";
			});
		
	}

	function generateHeaderlist(db) {
		$scope.headerList = [];
		$scope.instrument = db[0].INSTRUME;
		console.log("Instrument: " + $scope.instrument);
		$scope.columnIDs = [];
		$scope.columnNames = [];
		$scope.instrumentColumns = [];
		for(c in instrumentColumns.all) {
			console.log(instrumentColumns.all[c]);
			$scope.columnIDs.push(instrumentColumns.all[c].id);
			$scope.columnNames.push(instrumentColumns.all[c].name);
			$scope.instrumentColumns.push(instrumentColumns.all[c]);
		}
		if ((db[0].INSTRUME).indexOf("ISIS")!=-1) $scope.instrument = "ISIS";
		for(c in instrumentColumns[$scope.instrument]) {
			$scope.columnIDs.push(instrumentColumns[$scope.instrument][c].id);
			$scope.columnNames.push(instrumentColumns[$scope.instrument][c].name);
			$scope.instrumentColumns.push(instrumentColumns[$scope.instrument][c]);
		}
		console.log($scope.instrumentColumns);
		//$scope.columnNames = $scope.columnNames.concat(instrumentColumns[$scope.instrument]);
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

	$scope.reLoad = function reLoad() {
			console.log("Timed reload event...");
			$scope.statusString = "Reloading the data";
			loadFromJSON($http, function(data) {
				console.log("Got refreshed data");
			});
			console.log("Starting reload timer: " + refreshDataTimeout);
			setTimeout($scope.reLoad, refreshDataTimeout);
	}

	$scope.startRefresh = function startRefresh() {
		console.log("Refresh button clicked");
		localStorage.setItem('telescope', JSON.stringify($scope.telescope));
		console.log("Starting reload timer: " + refreshDataTimeout);
		setTimeout($scope.reLoad, refreshDataTimeout);
	}


	$scope.setToday = function setToday() {

	}
	
	$scope.resort = function resort(property, reverse) {
		console.log("Re-sort requested by " + property + " reverse " + reverse);
		function compare(a,b) {
		  if (a[property] < b[property])
		    return -1;
		  if (a[property] > b[property])
		    return 1;
		  return 0;
		}
		$scope.db.sort(compare);
		if (reverse == true) $scope.db = $scope.db.reverse();
		//$scope.sortReverse = !$scope.sortReverse;

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
