var districts = [{name: "Blekinge Fotbollsförbund",  id: 2},
                 {name: "Bohusläns Fotbollsförbund", id: 25},
                 {name: "Dalarnas FF",  id: 4},
                 {name: "Dalslands FF", id: 3},
                 {name: "Gestriklands FF", id: 6},
                 {name: "Gotlands FF",  id: 5},
                 {name: "Göteborgs FF", id: 7},
                 {name: "Hallands FF", id: 8},
                 {name: "Hälsinglands FF", id: 9},
                 {name: "Jämtland-Härjedalens FF", id: 10},
                 {name: "Medelpads FF", id: 11},
                 {name: "Norrbottens FF", id: 12},
                 {name: "Skånes FF", id: 14},
                 {name: "Smålands FF", id: 15},
                 {name: "Stockholms FF", id: 16},
                 {name: "SvFF", id: 1},
                 {name: "Södermanlands FF", id: 17},
                 {name: "Upplands FF", id: 18},
                 {name: "Värmlands FF", id: 19},
                 {name: "Västerbottens FF", id: 20},
                 {name: "Västergötlands FF", id: 21},
                 {name: "Västmanlands FF", id: 22},
                 {name: "Ångermanlands FF", id: 23},
                 {name: "Örebro Läns FF", id: 13},
                 {name: "Östergötlands FF", id: 24},
                 {name: "FIFA", id: 27}];

var games = [];

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
		games.length = 0; // empty information array
		var league = "";
		for(var i=0; i<rows.length; i++) {
			var element = rows[i];
			if(element.children.length == 1) {
				league = element.children[0].children[0].firstChild.nodeValue;
			} else if(element.children.length == 4) {
				var time = element.children[0].firstChild.firstChild.nodeValue;
				var home = element.children[1].firstChild.firstChild.nodeValue.split(" - ")[0];
				var away = element.children[1].firstChild.firstChild.nodeValue.split(" - ")[1];
				var venue = element.children[3].firstChild.firstChild.nodeValue;
				var id = element.children[3].firstChild.href.split("&faid=")[1];
				var game = {
				            	home: home,
				            	away: away,
				            	venue: {name: venue, id: id},
				            	time: time,
				            	league: league
				};
				games.push(game);
			}
		}
		loaded();
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

function getVenuePositions() {
	var checked = [];
	for(var i=0; i<games.length; i++) {
		var game = games[i];
		if(!checked.includes(game.venue.id)) {
			checked.push[game.venue.id];
			var url = "https://cors-anywhere.herokuapp.com/http://fogismallar2.svenskfotboll.se/ft.aspx?scr=venue&faid="+game.venue.id;
			fetch(url).then(function(response) {
				return response.text();
			}).then(function(plain) {
				var parser = new DOMParser();
				var remoteDocument = parser.parseFromString(plain, "text/html");
				var mapLink = remoteDocument.documentElement.querySelector("a[href^=\"http://maps.google.com\"]");
				if(mapLink) {
					var lat = mapLink.href.split("http://maps.google.com/maps?q=")[1].split(",")[0];
					var lon = mapLink.href.split("http://maps.google.com/maps?q=")[1].split(",")[1];
					game.venue.lat = lat;
					game.venue.lon = lon;
				}
			});
		}
	}
}
window.onload = setup;