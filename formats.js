
		function decimalPlacesFloat(value, places) {
			multiplier = Math.pow(10, places);
			return Math.round(value*multiplier) / multiplier;
		}

		function decimalPlacesString(value, places) {
			floatValue = decimalPlacesFloat(value, places);
			numberString = floatValue.toString();
			trailingZeros = places - numberString.split('.')[1].length;
			for (var i=0; i<trailingZeros; i++) numberString = numberString + "0";
			return numberString;
		}

		function zeroPad(input) {
			if (input < 10) return "0" + input.toString();
			return input.toString();
		}

		function timeDecimalToHMS(inputTime){
			hours = Math.floor(inputTime);
			inputTime-=hours;
			minutes = Math.floor(inputTime*60);
			inputTime = inputTime*60 - minutes;
			seconds = Math.floor(inputTime*60);
			timeString = zeroPad(hours) + ":" + zeroPad(minutes) + ":" + zeroPad(seconds);
			return timeString;
		}


		function formatUTCTime(date) {
			return zeroPad(date.getUTCHours()) + ":" + zeroPad(date.getUTCMinutes()) + ":" + zeroPad(date.getUTCSeconds());
			}
