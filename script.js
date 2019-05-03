'use strict';

const e = React.createElement;

class Root extends React.Component {
	constructor(props) {
		super(props);
		this.state = { games: this.props.games,
		               districts: this.props.districts,
		               venues: this.props.venues,
		               leagues: this.props.leagues,
		               enabled: true };
		this.getGames = this.getGames.bind(this);
		this.addGame = this.addGame.bind(this);
	}

	getGames(district, date) {
		for(var i=0; i<this.state.leagues.length; i++) {
			this.state.leagues[i].games.length = 0;
		}
		for(var i=0; i<this.state.venues.length; i++) {
			this.state.venues[i].games.length = 0;
		}
		this.setState({enabled: false,
		               games: [],
		               venues: this.state.venues,
		               leagues: this.state.leagues});
		var url = "https://cors-anywhere.herokuapp.com/http://fogismallar2.svenskfotboll.se/ft.aspx?scr=today&ffid="+district+"&d="+date;
		fetch(url).then(function(response) {
			return response.text();
		}).then((plain) => {
			var parser = new DOMParser();
			var remoteDocument = parser.parseFromString(plain, "text/html");
			var gameTable = remoteDocument.documentElement.getElementsByClassName("clGrid");
			var rows = gameTable[gameTable.length-1].children;

			var league = {};
			var leagueID = -1;
			for(var i=0; i<rows.length; i++) {
				var element = rows[i];
				if(element.children.length == 1) {
					league = {
						name: element.children[0].children[0].firstChild.nodeValue,
						id: leagueID = element.children[0].children[0].href.split("&ftid=")[1],
						games: []
					};
				} else if(element.children.length == 4 && element.children[0].firstChild.hasChildNodes()) {
					var time = element.children[0].firstChild.firstChild.nodeValue;
					var home = element.children[1].firstChild.firstChild.nodeValue.split(" - ")[0];
					var away = element.children[1].firstChild.firstChild.nodeValue.split(" - ")[1];
					var venue = element.children[3].firstChild.firstChild.nodeValue;
					var VenueId = element.children[3].firstChild.href.split("&faid=")[1];

					this.addGame(time,home,away,{name: venue, id: VenueId, games: []},league);
				}
			}
			this.setState({enabled: true});
		}).catch((error)=>{
			this.setState({enabled: true});
		});
	}

	addGame(time,home,away,venue,league) {
		var venueExists = this.state.venues.findIndex(x => x.id === venue.id);
		var leagueExists = this.state.leagues.findIndex(x => x.id === league.id);
		if(venueExists!=-1) {
			venue = this.state.venues[venueExists];
		} else {
			this.setState({venues:[...this.state.venues, venue]});
			this.addLocation(venue);
		}
		if(leagueExists!=-1) {
			league = this.state.leagues[leagueExists];
		} else {
			this.setState({leagues: [...this.state.leagues, league]});
		}
		var game = {
			home: home,
			away: away,
			venue: venue,
			time: time,
			league: league
		};
		venue.games.push(game);
		league.games.push(game);
		this.setState({leagues: this.state.leagues, venues: this.state.venues,games: [...this.state.games, game]});
	}

	addLocation(venue) {
		var url = "https://cors-anywhere.herokuapp.com/http://fogismallar2.svenskfotboll.se/ft.aspx?scr=venue&faid="+venue.id;
		fetch(url).then(function(response) {
			return response.text();
		}).then(function(plain) {
			var parser = new DOMParser();
			var remoteDocument = parser.parseFromString(plain,"text/html");
			var mapLink = remoteDocument.documentElement.querySelector("a[href^=\"http://maps.google.com\"]");
			if(mapLink) {
				venue.lat = mapLink.href.split("http://maps.google.com/maps?q=")[1].split(",")[0];
				venue.lon = mapLink.href.split("http://maps.google.com/maps?q=")[1].split(",")[1];
			}
		}).then(()=>{
			this.setState({venues: this.state.venues});
		});
	}

	render() {
		return (
			<div>
				<Settings enabled={this.state.enabled} callback={this.getGames} districts={this.state.districts}/>
				<Games games={this.state.games}/>
				<Venues venues={this.state.venues}/>
				<Leagues leagues={this.state.leagues}/>
			</div>
		);
	}
}

class Settings extends React.Component {
	constructor(props) {
		super(props);

		this.state = { selected: 21,
		               date: new Date().toISOString().substring(0,10)}

		this.updateDistrict = this.updateDistrict.bind(this);
		this.updateDate = this.updateDate.bind(this);
		this.getGames = this.getGames.bind(this);
	}

	updateDistrict(e) {
		for(let node of e.target.children) {
			if(node.value === e.target.value) {
				this.setState({
					selected: node.id
				});
				break;
			}
		}
	}

	updateDate(e) {
		this.setState({ date: e.target.value});
	}

	getGames() {
		this.props.callback(this.state.selected,this.state.date);
	}

	createOptions() {
		var items = [];
		for(var i=0; i<this.props.districts.length; i++) {
			var district = this.props.districts[i];
			items.push(<option key={district.id} id={district.id}>{district.name}</option>);
		}
		return items;
	}

	render() {
		return (
			<div id="settings">
				<h2>Settings</h2>
				<select onChange={this.updateDistrict} value={this.state.selected}>
					{this.createOptions()}
				</select>
				<input onChange={this.updateDate} type="date" value={this.state.date}/>
				<button disabled={!this.props.enabled} onClick={this.getGames}>
					Get Games
				</button>
			</div>
		);
	}
}

class Games extends React.Component {
	getGamesList() {
		var items = [];
		for(var i=0; i<this.props.games.length; i++) {
			var game = this.props.games[i];
			items.push(<li key={i}>{game.time} {game.home} - {game.away} @ {game.venue.name}</li>);
		}
		return items;
	}
	render() {
		return (
			<div id="games">
				<h2>Games - {this.props.games.length}</h2>
				<ol>
					{this.getGamesList()}
				</ol>
			</div>
		);
	}
}

class Venues extends React.Component {
	getVenueList() {
		var items = [];
		this.props.venues.sort(function(a,b) {
			if(a.games.length > b.games.length) {
				return -1;
			}
			if(a.games.length < b.games.length) {
				return 1;
			}
			return 0;
		});
		for(var i=0; i<this.props.venues.length; i++) {
			var venue = this.props.venues[i];
			if(venue.games.length>0) {
				if(typeof(venue.lat) !== "undefined" && typeof(venue.lon) !== "undefined") {
					items.push(<li key={venue.id}><a href={"http://maps.google.com/maps?q=" + venue.lat + ","+ venue.lon}>{venue.name}</a> - {venue.games.length} games</li>);
				} else {
					items.push(<li key={venue.id}>{venue.name} - {venue.games.length} games</li>);
				}
			}
		}
		return items;
	}

	render() {
		return (
			<div id="venues">
				<h2>Venues - {this.props.venues.length}</h2>
				<ol>
					{this.getVenueList()}
				</ol>
			</div>
		);
	}
}

class Leagues extends React.Component {
	getLeagueList() {
		var items = [];
		this.props.leagues.sort(function(a,b) {
			if(a.games.length > b.games.length) {
				return -1;
			}
			if(a.games.length < b.games.length) {
				return 1;
			}
			return 0;
		});
		for(var i=0; i<this.props.leagues.length; i++) {
			var league = this.props.leagues[i];
			items.push(<li key={league.id}>{league.name} - {league.games.length} games</li>);
		}
		return items;
	}

	render() {
		return (
			<div id="leagues">
				<h2>Leagues - {this.props.leagues.length}</h2>
				<ol>
					{this.getLeagueList()}
				</ol>
			</div>
		);
	}
}

var leagues = [];

var games = [];

const domContainer = document.querySelector('#appRoot');
ReactDOM.render(<Root districts={districts} venues={venues} games={games} leagues={leagues}/>, domContainer);