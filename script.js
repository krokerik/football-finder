var leagues = [];

var games = [];

var promises = [];

function setup() {
	var select = document.getElementById("districtPicker");
	for(var i=0; i<districts.length; i++) {
		var district = document.createElement("option");
		var districtName = document.createTextNode(districts[i].name);
		district.appendChild(districtName);
		district.value = districts[i].id;
		select.appendChild(district);
	}

	var datePicker = document.getElementById("gameDate");
	datePicker.valueAsDate = new Date();

	var settingsButton = document.getElementById("settingsButton");
	settingsButton.onclick = getGames;
}

function getGames() {
	loading();
	games.length = 0; // empty game array
	for(var i=0; i<venues.length; i++) {
		venues[i].games.length = 0;
	}
	renderList();
	renderVenueList();
	var district = document.getElementById("districtPicker").value;
	var date = document.getElementById("gameDate").value;
	var url = "https://cors-anywhere.herokuapp.com/http://fogismallar2.svenskfotboll.se/ft.aspx?scr=today&ffid="+district+"&d="+date;
	fetch(url).then(function(response) {
		return response.text();
	}).then(function(plain) {
		var parser = new DOMParser();
		var remoteDocument = parser.parseFromString(plain, "text/html");
		var gameTable = remoteDocument.documentElement.getElementsByClassName("clGrid");
		gameTable = gameTable[gameTable.length-1];
		return gameTable.children;
	}).then(function(rows) {
		var league = "";
		var leagueId = -1;
		for(var i=0; i<rows.length; i++) {
			var element = rows[i];
			if(element.children.length == 1) {
				league = element.children[0].children[0].firstChild.nodeValue;
				leagueID = element.children[0].children[0].firstChild.nodeValue;
			} else if(element.children.length == 4 && element.children[0].firstChild.hasChildNodes()) {
				var time = element.children[0].firstChild.firstChild.nodeValue;
				var home = element.children[1].firstChild.firstChild.nodeValue.split(" - ")[0];
				var away = element.children[1].firstChild.firstChild.nodeValue.split(" - ")[1];
				var venue = element.children[3].firstChild.firstChild.nodeValue;
				var VenueId = element.children[3].firstChild.href.split("&faid=")[1];

				addGame(time,home,away,{name: venue, id: VenueId, games: []},league);
			}
		}
		loaded();
		renderList();
	}).catch(function(e) {
		loaded();
		console.error("Error:",e);
	});
}

function loading() {
	var settingsButton = document.getElementById("settingsButton");
	settingsButton.disabled = true;
}

function loaded() {
	var settingsButton = document.getElementById("settingsButton");
	settingsButton.disabled = false;
}

function addGame(time,home,away,venue,league) {
	var exists = venues.findIndex(x => x.id === venue.id);
	if(exists!=-1) {
		venue = venues[exists];
	} else {
		promises.push(getPosition(venue));
		Promise.all(promises).then(function() {
			renderVenueList();
		});
		venues.push(venue);
	}
	var game = {
		home: home,
		away: away,
		venue: venue,
		time: time,
		league: league
	};
	venue.games.push(game);
	games.push(game);
}

function getPosition(venue) {
	loading();
	var url = "https://cors-anywhere.herokuapp.com/http://fogismallar2.svenskfotboll.se/ft.aspx?scr=venue&faid="+venue.id;
	return fetch(url).then(function(response) {
		return response.text();
	}).then(function(plain) {
		var parser = new DOMParser();
		var remoteDocument = parser.parseFromString(plain,"text/html");
		var mapLink = remoteDocument.documentElement.querySelector("a[href^=\"http://maps.google.com\"]");
		if(mapLink) {
			venue.lat = mapLink.href.split("http://maps.google.com/maps?q=")[1].split(",")[0];
			venue.lon = mapLink.href.split("http://maps.google.com/maps?q=")[1].split(",")[1];
		}
	});
}

function renderList() {
	var list = document.getElementById("gameList");
	var child = list.firstElementChild;
	while(child) {
		list.removeChild(child);
		child = list.firstElementChild;
	}
	for(var i=0; i<games.length; i++) {
		var game = games[i];
		var element = document.createElement("li");
		var text = document.createTextNode("Game: "+game.home+" - "+game.away+" @ "+game.venue.name);
		element.appendChild(text);
		list.appendChild(element);
	}
}

function renderVenueList() {
	var list = document.getElementById("venueList");
	var child = list.firstElementChild;
	while(child) {
		list.removeChild(child);
		child = list.firstElementChild;
	}
	venues.sort(function(a,b) {
		if(a.games.length > b.games.length) {
			return -1;
		}
		if(a.games.length < b.games.length) {
			return 1;
		}
		return 0;
	});
	for(var i=0; i<venues.length; i++) {
		var venue = venues[i];
		if(venue.games.length < 1) {
			continue;
		}
		var element = document.createElement("li");
		var text = document.createTextNode(venue.name + " - "+venue.games.length+" games");
		if(typeof(venue.lat) !== "undefined" && typeof(venue.lon) !== "undefined") {
			var link = document.createElement("a");
			link.href = "http://maps.google.com/maps?q="+venue.lat+","+venue.lon;
			link.appendChild(text);
			element.appendChild(link);
		} else {
			var link = document.createElement("a");
			var linkText = document.createTextNode("Do you know the location of this place? Make a pull request with the correct position, id is "+venue.id);
			link.href = "https://github.com/krokerik/football-finder/edit/master/static.js";
			link.appendChild(linkText);
			element.appendChild(text);
			element.appendChild(link);
		}
		list.appendChild(element);
	}
}

window.onload = setup;