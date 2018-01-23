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
	"IDS":  [ 	{ 'id': "SLTWDSKY",	'name': 'Slit width',		'sort': 'SLITWID', 	'format': 'round2' },
				{ 'id': "GRATNAME", 'name': 'Grating', 			'sort': 'GRATNAME', 'format': 'none' },
				{ 'id': "BSCFILT",  'name': 'Filter', 			'sort': 'BSCFILT', 	'format': 'none' },
				{ 'id': "CENWAVE",  'name': 'Cen. wave', 		'sort': 'CENWAVE', 	'format': 'round' }
			],
	"WFC":  [	{ 'id': "WFFPSYS",	'name': 'System',			'sort': 'WFFPSYS',  'format': 'none' },
				{ 'id': "WFFBAND",	'name': 'Filter', 			'sort': 'WFFBAND',	'format': 'none' },
				{ 'id': "CCDSPEED", 'name': 'Speed',			'sort': 'CCDSPEED', 'format': 'none' }
			],
	"ISIS": [	{ 'id': "ISISLITW",'name': 'Slit width', 		'sort': 'ISISLITW','format': 'round2'},
				{ 'id': "ISIFILTA",'name': 'Filter A', 		'sort': 'ISIFILTA','format': 'none' },
				{ 'id': "ISIFILTB",'name': 'Filter B', 		'sort': 'ISIFILTB','format': 'none' },
				{ 'id': "ISIGRAT", 'name': 'Grating', 			'sort': 'ISIGRAT', 'format': 'none' },
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
	$scope.statusString = "unknown";
	$scope.headerList = ['none'];
	$scope.columnNames = [];
	$scope.totalExposureTime = 0;
	$scope.totalTargetTime = 0;
	$scope.db = [];
	$scope.refreshDataTime = 10;
	$scope.refreshStyle = "inactive";
	$scope.previewStyle = "inactive";
	$scope.refreshText = "";
	$scope.timeLeft = 10;
	$scope.tbVisible = "hidden";
	$scope.JSONPayload = 0;
	datePath="";
	dbfilename = "db.json";
	refreshTimerID = null;
	previewMode = false;

	$scope.init = function() {
		$scope.clear();
		$scope.totalExposureTime = 0;
		$scope.totalTargetTime = 0;
		$scope.instrument = "Unknown";
		$scope.statusString = "init";
		loadFromJSON($http , function(data) {
			//console.log("In data callback.");
			//console.log(data);
			generateHeaderlist(data);
			$scope.db = data;
			$scope.resort($scope.sortColumn, $scope.sortReverse);
			calcStats();
			$scope.statusString = "ready";
			setLatestFrame();
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
		datePath = $scope.date.getFullYear() + ("0"+($scope.date.getMonth()+1)).slice(-2) + ("0" + $scope.date.getDate()).slice(-2);
		JSONfilename = $scope.telescope.path  + "/" + datePath + "/" + dbfilename  + '?hash_id=' + Math.random();
		console.log("Getting data at : " + JSONfilename);
		$scope.statusString = "loading";
		$http.get(JSONfilename,{cache: false}).
			success(function(data, status, headers, config) {
				console.log(headers());
				console.log(data);
				callback(data);
			}).
			error(function(data, status, headers, config) {
				console.log("There was an error when fetching the data.")
				$scope.statusString = "error";
			});

	}

	function generateHeaderlist(db) {
		$scope.headerList = [];

		// Run through all the headers to see which instrument is mentioned the most often
		instrumentCounter = [];
		instrumentList = [];
		for (d in db) {
			if (db[d].INSTRUME) {
				if (instrumentList.indexOf(db[d].INSTRUME)==-1) {
					instrumentList.push(db[d].INSTRUME);
					instrumentCounter.push(1);
				}
				else {
					instrumentCounter[instrumentList.indexOf(db[d].INSTRUME)]++;
				}
			}
		}
		if (instrumentList.length>0) $scope.instrument = instrumentList[indexOfMax(instrumentCounter)];
		else $scope.instrument = "Unknown";
		console.log("Instrument: " + $scope.instrument);
		$scope.columnIDs = [];
		$scope.columnNames = [];
		$scope.instrumentColumns = [];
		for(c in instrumentColumns.all) {
			$scope.columnIDs.push(instrumentColumns.all[c].id);
			$scope.columnNames.push(instrumentColumns.all[c].name);
			$scope.instrumentColumns.push(instrumentColumns.all[c]);
		}
		if ($scope.instrument.indexOf("ISIS")!=-1) $scope.instrument = "ISIS";
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

	function setLatestFrame() {
		dbCopy = $scope.db;
		property = 'unixtime';
		function compare(a,b) {
			if (a[property] < b[property])
				return -1;
			if (a[property] > b[property])
				return 1;
			return 0;
		}
		dbCopy.sort(compare);
		dbCopy = dbCopy.reverse();
		console.log("Most recent entry is ", dbCopy[0]);
		$scope.latestSrc = $scope.telescope.path  + "/" + datePath + "/" + dbCopy[0]['imageData'].src;
		console.log($scope.latestSrc);
		dbCopy = null;

	}

	$scope.updatePreview = function updatePreview(imgFilename, $event) {
		if(!previewMode) return;
		var imageInfo = null;
		for (var d in $scope.db) {
			if ($scope.db[d]['filename']==imgFilename) {
				imageInfo = $scope.db[d]['imageData'];
				break;
			}
		}
		if (imageInfo==null) $scope.currentThumbnail = "nodata.png";
		else $scope.currentThumbnail = $scope.telescope.path  + "/" + datePath + "/" + imageInfo.src;
		$scope.tbVisible = 'visible';
		$scope.previewX = $event.x;
		$scope.previewY = $event.y+20;
	}

	$scope.removePreview = function removePreview() {
		$scope.tbVisible = 'hidden';
	}

	$scope.togglePreview = function togglePreview() {
		console.log("Toggle preview");
		previewMode = !previewMode;
		if (!previewMode) {
			$scope.removePreview();
			$scope.previewStyle = 'inactive';
		} else {
			$scope.previewStyle = 'active';
		}
	}


	$scope.openDetails = function openDetails(imgFilename, $event) {
		console.log("Getting detailed info for: " + imgFilename);
	}

	$scope.clear = function clear() {
		console.log("Clearing the current data.");
		$scope.db = [];
		$scope.statusString = "clear";
		$scope.totalExposureTime = 0;
		$scope.totalTargetTime = 0;

		}

	$scope.reLoad = function reLoad() {
			$scope.statusString = "reload";
			loadFromJSON($http, function(data) {
				console.log("Got refreshed data.");
				existingFilenames = [];
				for (d in $scope.db) existingFilenames.push($scope.db[d]['filename']);
				var newItemCounter = 0;
				for (d in data)
					if (existingFilenames.indexOf(data[d]['filename']) == -1) {
						$scope.db.push(data[d]);
						newItemCounter++;
					}
				console.log("Found " + newItemCounter + " additional rows.");
				$scope.statusString = "calc";
				$scope.resort($scope.sortColumn, $scope.sortReverse);
				calcStats();
				$scope.statusString = "ready";
				setLatestFrame();
			});
	}

	$scope.toggleRefresh = function toggleRefresh() {
		if (refreshTimerID==null) {
			console.log("Starting the refresh sequence");
			refreshTimerID = setInterval($scope.refreshHandler, 1000);
			$scope.refreshDataTime = $scope.timeLeft;
			$scope.refreshText = $scope.timeLeft +  " s";
			$scope.refreshStyle = "active";
		}	else {
			console.log("Stopping the refresh sequence");
			clearTimeout(refreshTimerID);
			refreshTimerID = null;
			$scope.refreshText = "";
			$scope.refreshStyle = "inactive";
		}
	}

	$scope.refreshHandler = function refreshHandler() {
		$scope.timeLeft--;
		$scope.refreshText = $scope.timeLeft +  " s";
		$scope.$apply();
		if ($scope.timeLeft<=0) {
			$scope.reLoad();
			$scope.timeLeft = $scope.refreshDataTime;
		}
	}


	calcStats = function calcStats() {
		var totalExposureTime = 0;
		var totalTargetTime = 0;
		for (var d in $scope.db) {
			exptime = parseFloat($scope.db[d]['EXPTIME']);
			if (!isNaN(exptime)) {
				totalExposureTime+= exptime;
				if ($scope.db[d]['OBSTYPE'] == 'TARGET') totalTargetTime+= exptime;
			}

		}
		$scope.totalExposureTime = totalExposureTime;
		$scope.totalTargetTime = totalTargetTime;
	}

	$scope.changeSort = function changeSort(columnName) {
		console.log("Changing sort column from " + $scope.sortColumn + " to " + columnName);
		$scope.sortColumn = columnName;
		$scope.sortReverse = !$scope.sortReverse;
		$scope.resort($scope.sortColumn, $scope.sortReverse);

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

	$scope.telescopeChange = function telescopeChange() {
		console.log("Changing telescope to ", $scope.telescope);
		localStorage.telescope = JSON.stringify($scope.telescope);
		$scope.clear();
		$scope.init();
	}

	$scope.dateChange = function dateChange() {
		console.log("Date changed to " + $scope.date);
		logDateString = $scope.date.getFullYear() + ("0"+($scope.date.getMonth()+1)).slice(-2) + ("0" + $scope.date.getDate()).slice(-2);
		console.log("Storing locally: " + logDateString);
		localStorage.date = logDateString;
		$scope.dateString = localStorage.date;
		$scope.clear();
		$scope.init();
	}

}

function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}
