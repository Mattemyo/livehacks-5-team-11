const createSocket = (url) => {
  let connection = null;
  let connected = false;
  let connecting = false;
  let connectionChecker;
  let messageHandler;

  const connect = () => {
    ensureConnected();
    connectionChecker = setInterval(ensureConnected, 1000);
  };

  const disconnect = () => {
    clearInterval(connectionChecker);
    if (connection) {
      connection.close();
    }
  };

  const handleMessage = (message) => {
    let data;
    try {
      data = JSON.parse(message.data);
    } catch (err) {
      return console.log('Got unparsable message', message.data);
    }
    if (messageHandler) {
      messageHandler(data);
    }
  };

  const ensureConnected = () => {
    if (!connected && !connecting) {
      console.log(`Attempting to connect to socket at ${url}`);
      connecting = true;
      connection = new WebSocket(url);

      connection.onmessage = handleMessage;

      connection.onopen = () => {
        console.log('Connected to socket');
        connecting = false;
        connected = true;
      };

      connection.onclose = () => {
        connection = null;
        if (connected) {
          console.log('Lost connection to socket');
          connected = false;
        }
        connecting = false;
      };
    }
  };

  const getIsConnected = () => connected;

  const setMessageHandler = (handler) => {
    messageHandler = handler;
  };

  connect();

  return { disconnect, setMessageHandler, getIsConnected };
};

interface User {
  uid: string;
  team: number;
  clicks: number;
  isActive: boolean;
}

interface Team {
  tid: number;
  users: User[];
  progress: number;
  team_clicks: number;
}

const maxProgress = 100;

let users: User[] = [];
let teams: Team[] = [];

const createMessageHandler = () => {
  const removeInactiveUsers = () => {
    console.log('removed inactive users');
    users = users.filter((user) => user.isActive);
    teams.forEach((team) =>{
       team.users = team.users.filter((user) => user.isActive);
       team.users.forEach((user) => user.isActive = false);
    });
    users.forEach((user) => user.isActive = false);
  };

  setInterval(removeInactiveUsers, 5000);

  return (message) => {
    let index;
    if (users.filter((user) => user.uid === message.id).length === 0) {
      users.push({ uid: message.id, team: message.team, clicks: 0, isActive: true});

      if (teams.filter((el) => el.tid === message.team).length === 0) {
        teams.push({ tid: message.team, users: [], progress: 0.0, team_clicks: 0 });
      }

      index = teams.indexOf(teams.filter((el) => el.tid === message.team)[0]);
      teams[index].users.push({ uid: message.id, team: message.team, clicks: 0, isActive: true});
    } else {
      const user: User = users.filter((user) => user.uid === message.id)[0];
      const team: Team = teams.filter((team) => team.tid === message.team)[0];

      user.clicks++;
      user.isActive = true;
      index = teams.indexOf(teams.filter((el) => el.tid === message.team)[0]);
      teams[index].users.filter((user) => user.uid === message.id)[0].isActive = true;
      team.team_clicks++;

      if(team.users.length !== 0){
        team.progress = team.team_clicks / team.users.length / 2 / 100;
      }

      if(team.progress >= 1){
        teams.sort((a, b) => {
          return b.progress - a.progress;
        });
        console.log(teams);
      }

      console.log(team.progress);
      updateTeamProgress(team.tid, team.progress);
    }
  };
};

// ======= PROGRESS ANIMATION ======= //
const elements = ['0', '1', '2', '3'].map((el) => <HTMLElement>document.getElementById(el));
const updateTeamProgress = (id, progress) => {
  const element = elements[id];
  element.style.transform = `translateX(calc(${progress} * 72vw + 5vw))`;
};

// ======== SCOREBOARD ======= //
const teamColors = ['red', 'green', 'yellow', 'blue']; // each id corresponds to one color

const winnerDiv = document.getElementsByClassName('winner')[0];
const loserDivs = [].slice.call(document.getElementsByClassName('loser'));

const onCompleted = (score) => {
  const [winner, ...losers] = score;
  winnerDiv.getElementsByTagName('img')[0].src = `/img/${teamColors[winner.tid]}-win.png`;
  winnerDiv.getElementsByTagName('p')[0].textContent = `${winner.progress} TPS`;

  losers.forEach((loser, idx) => {
    const element = loserDivs[idx];
    element.getElementsByTagName('img').src = `/img/${teamColors[loser.tid]}-lose.png`;
    element.getElementsByTagName('p').textContent = `${loser.progress} PTS`;
  });
};

// ======  WEBSOCKET ======= //
const WEBSOCKET_URL = 'ws://stagecast.se/api/events/livehacks_team11/ws?x-user-listener=1';
const socket = createSocket(WEBSOCKET_URL);
socket.setMessageHandler(createMessageHandler());
