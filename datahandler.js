var app = angular.module("LogApp", []);
app.controller("dbController", dbHandler);

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
		console.log(input);
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


function dbHandler($scope, $http) {
	$scope.sortColumn = 'filename'
	$scope.sortReverse = true;

	function loadFromJSON($http) {
		console.log("Getting data");
		$http.get('db.json').
			success(function(data, status, headers, config) {
				$scope.db = data;
				console.log($scope.db);
				$scope.statusString = "data ready";
			}).
			error(function(data, status, headers, config) {
				console.log("There was an error when fetching the data.")
			});
		}

	$scope.statusString = "data loading....";
	loadFromJSON($http);


	$scope.clear = function clear() {
		console.log("Button clicked to clear the data");
		$scope.db = [];
		$scope.statusString = "Cleared data";
		}

	$scope.load = function load() {
		console.log("Load button clicked");
		$scope.statusString = "Reloading the data";
		loadFromJSON($http);
	}

	$scope.resort = function resort() {
		console.log("changing the sort order");
		var sortArray = $scope.db;
		sortArray.sort(function(a, b) {
			var x = a.filename.toLowerCase();
			var y = b.filename.toLowerCase();
			return x < y ? -1 : x > y ? 1 : 0;
		});
		$scope.db = sortArray;
	}
}
