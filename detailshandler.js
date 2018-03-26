var app = angular.module("LogApp", ['ngSanitize']);
app.controller("detailsController", detailsHandler);

app.filter('round', function() {
	return function(input, places) {
		return (Math.round(parseFloat(input)));
	}
});

function get(name){
  if(name=(new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)')).exec(location.search))
   return decodeURIComponent(name[1]);
	}

function detailsHandler($scope, $http) {

	var dbFilename = 'db.json.gz';
	var telescopes = [{'name': "WHT", 'path' : 'whta', 'imageURL' : 'whtlogo.gif', 'colour':"red" },
									  {'name': "INT", 'path' : 'inta', 'imageURL' : 'intlogo.gif', 'colour':"blue"}];


	$scope.fitsHeaders = [];

	$scope.init = function() {
		console.log("In Angular init()");
		console.log(localStorage);
		$scope.filename = get('filename');
		$scope.date = get('date');
		telescope = get('telescope');
		if ($scope.filename==null) $scope.filename = localStorage.filename;
		if ($scope.date==null) $scope.date = localStorage.date;
		if (telescope==null) $scope.telescope = JSON.parse(localStorage.telescope);
		else {
			for (t in telescopes) {
				if (telescopes[t]['name'] == telescope) {
					$scope.telescope = telescopes[t];
					break;
				}
			}
		}
		$scope.sortColumn = localStorage.sortColumn;
		$scope.sortReverse = localStorage.sortReverse;

		console.log($scope.telescope);

		loadFromJSON($http, function(data) {
			$scope.db = data;
			selectActiveRecord();
		});
	}

	function loadFromJSON($http, callback) {
		datePath = $scope.date;
		JSONfilename = $scope.telescope.path  + "/" + datePath + "/" + dbFilename  + '?hash_id=' + Math.random();
		console.log("Getting data at : " + JSONfilename);
		$scope.statusString = "loading";
		$http.get(JSONfilename,{cache: false}).
			success(function(data, status, headers, config) {
				console.log(headers());
				//console.log(data);
				callback(data);
			}).
			error(function(data, status, headers, config) {
				console.log("There was an error when fetching the data.")
				$scope.statusString = "error";
			});

	}

	function selectActiveRecord() {
		for (d in $scope.db) {
			if ($scope.db[d]['filename'] == $scope.filename) $scope.activeRecord = $scope.db[d];
		}
		console.log("Found active record.");
		console.log($scope.activeRecord);
		$scope.imageURL = $scope.telescope.path  + "/" + $scope.date + "/" + $scope.activeRecord['imageData'].src;
		$scope.fitsHeaders= [];
		for (key in $scope.activeRecord) {
			$scope.fitsHeaders.push(key);
		}
		$scope.downloadURL = false;
		if ($scope.activeRecord['originalavailable']) $scope.downloadURL = $scope.telescope.path + "/" + $scope.date + "/" + $scope.activeRecord['filename'] ;
		console.log($scope.imageURL);
	}

}
