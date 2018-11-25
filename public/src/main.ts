const enum STATE {
  PRE = 100,
  RUNNING,
  FINISHED,
}

let gameState = STATE.PRE;
let gameStartedAt;

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

const startGame = () => {
  [0, 1, 2, 3].forEach((el) => teams.push({ tid: el, users: [], progress: 0.0, team_clicks: 0 }));
  gameState = STATE.RUNNING;
  users = [];
  gameStartedAt = Math.floor(Date.now() / 1000);
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

let users: User[] = [];
let teams: Team[] = [];

const registerUser = (message) => {
  users.push({ uid: message.id, team: message.team, clicks: 0, isActive: true });

  if (teams.filter((el) => el.tid === message.team).length === 0) {
    teams.push({ tid: message.team, users: [], progress: 0.0, team_clicks: 0 });
  }

  let index = teams.indexOf(teams.filter((el) => el.tid === message.team)[0]);
  teams[index].users.push({ uid: message.id, team: message.team, clicks: 0, isActive: true });
};

const createMessageHandler = () => {
  const removeInactiveUsers = () => {
    if (gameState !== STATE.RUNNING) {
      return;
    }
    console.log('removed inactive users');
    users = users.filter((user) => user.isActive);
    teams.forEach((team) => {
      team.users = team.users.filter((user) => user.isActive);
      team.users.forEach((user) => (user.isActive = false));
    });
    users.forEach((user) => (user.isActive = false));
  };

  setInterval(removeInactiveUsers, 5000);

  return (message) => {
    if (gameState === STATE.PRE) {
      return;
    } else if (gameState === STATE.RUNNING) {
      let index;
      if (users.filter((user) => user.uid === message.id).length === 0) {
        registerUser(message);
      } else {
        const user: User = users.filter((user) => user.uid === message.id)[0];
        const team: Team = teams.filter((team) => team.tid === message.team)[0];

        user.clicks++;
        user.isActive = true;
        index = teams.indexOf(teams.filter((el) => el.tid === message.team)[0]);
        teams[index].users.filter((user) => user.uid === message.id)[0].isActive = true;
        team.team_clicks++;

        if (team.users.length !== 0) {
          team.progress = team.team_clicks / team.users.length / 2 / 100;
        }

        if (team.progress >= 0.99) {
          teams.sort((a, b) => {
            return b.progress - a.progress;
          });
          localStorage.startedAt = gameStartedAt;
          localStorage.result = JSON.stringify(teams);
          gameState = STATE.FINISHED;
          window.location.href = '/scoreboard.html';
        }

        console.log(team.progress);
        updateTeamProgress(team.tid, team.progress);
      }
    }
  };
};

// ======= PROGRESS ANIMATION ======= //
const elements = ['0', '1', '2', '3'].map((el) => <HTMLElement>document.getElementById(el));
const updateTeamProgress = (id, progress) => {
  const element = elements[id];
  element.style.transform = `translateX(calc(${progress} * 72vw + 5vw))`;
};

const roundToTwo = (val) => {
  return Math.round(val * 100) / 100;
};

// ======== SCOREBOARD ======= //
const teamColors = ['red', 'green', 'yellow', 'blue']; // each id corresponds to one color

const winnerDiv = document.getElementsByClassName('winner')[0];
const loserDivs = [].slice.call(document.getElementsByClassName('loser'));

const onCompleted = (score, startedAt) => {
  const [winner, ...losers] = score;
  const TPS = roundToTwo(
    winner.team_clicks / winner.users.length / (Math.floor(Date.now() / 1000) - startedAt)
  );
  winnerDiv.getElementsByTagName('img')[0].src = `/img/${teamColors[winner.tid]}-win.png`;
  winnerDiv.getElementsByTagName('p')[0].textContent = `${isNaN(TPS) ? 0 : TPS} TPS`;

  losers.forEach((loser, idx) => {
    const element = loserDivs[idx];
    const TPS = roundToTwo(
      loser.team_clicks / loser.users.length / (Math.floor(Date.now() / 1000) - startedAt)
    );
    element.getElementsByTagName('img')[0].src = `/img/${teamColors[loser.tid]}-lose.png`;
    element.getElementsByTagName('p')[0].textContent = `${isNaN(TPS) ? 0 : TPS} TPS`;
  });
};

let timeUntilStart = 5;
const countdown = () => {
  if (timeUntilStart > 0) {
    if (document.getElementById('countdown-label') === null) {
      return;
    }
    document.getElementById('countdown-label').textContent = timeUntilStart.toString();
    timeUntilStart -= 1;
    setTimeout(this.countdown, 1000);
  } else {
    document.getElementById('countdown-label').textContent = '';
    startGame();
  }
};

// ======  WEBSOCKET ======= //
const IP_ADDRESS = '192.168.22.1';
const PORT = 3000;
const GAME_ID = 0;
const WEBSOCKET_URL = `ws://${IP_ADDRESS}:${PORT}/${GAME_ID}/ws`;

const socket = createSocket(`${WEBSOCKET_URL}?x-user-listener=1`);
socket.setMessageHandler(createMessageHandler());
countdown();
