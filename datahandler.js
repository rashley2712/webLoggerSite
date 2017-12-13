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


function dbHandler($scope, $http) {

	// This event is triggered when the view has finished loading
  // $scope.$on('$viewContentLoaded', function($scope) {
  //   $scope.otherData = localStorage.getItem('myBackup')
  // })


	$scope.init = function() {
		$scope.date = "20171210";
		loadFromJSON($http, $scope);
	}

	$scope.sortColumn = 'filename'
	$scope.sortReverse = true;
	$scope.statusString = "data loading....";
	dbfilename = "db.json";
	$scope.telescopes = [{'name': "WHT", 'path' : 'whta', 'imageURL' : 'whtlogo.gif' },
											 {'name': "INT", 'path' : 'inta', 'imageURL' : 'intlogo.gif'}];
	$scope.telescope = $scope.telescopes[0];

	function loadFromJSON($http) {
		JSONfilename = $scope.telescope.path  + "/" + $scope.date + "/" + dbfilename;
		console.log("Getting data at : " + JSONfilename);
		$http.get(JSONfilename).
			success(function(data, status, headers, config) {
				$scope.db = data;
				console.log($scope.db);
				$scope.statusString = "data ready";
			}).
			error(function(data, status, headers, config) {
				console.log("There was an error when fetching the data.")
				$scope.statusString = "no data!";
			});
		}



	$scope.clear = function clear() {
		console.log("Button clicked to clear the data");
		$scope.db = [];
		$scope.statusString = "Cleared data";
		}

	$scope.load = function load() {
		console.log("Load button clicked");
		console.log("Requested telescope: " + $scope.telescope + " on date: " + $scope.date);
		$scope.statusString = "Reloading the data";
		loadFromJSON($http);
		}

	}
