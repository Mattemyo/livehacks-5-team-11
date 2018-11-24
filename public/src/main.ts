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
  return (message) => {
    if (users.filter((user) => user.uid === message.id).length === 0) {
      users.push({ uid: message.id, team: message.team, clicks: 0 });

      if (teams.filter((el) => el.tid === message.team).length === 0) {
        teams.push({ tid: message.team, users: [], progress: 0.0, team_clicks: 0 });
      }

      let index = teams.indexOf(teams.filter((el) => el.tid === message.team)[0]);
      teams[index].users.push({ uid: message.id, team: message.team, clicks: 0 });
    } else {
      const user: User = users.filter((user) => user.uid === message.id)[0];
      const team: Team = teams.filter((team) => team.tid === message.team)[0];

      user.clicks++;
      team.team_clicks++;

      team.progress = team.team_clicks / team.users.length / 2 / 100;
      console.log(team.progress);
      updateTeamProgress(team.tid, team.progress);
    }
  };
};

// ======= PROGRESS ANIMATION ======= //
const elements = [0, 1, 2, 3].map((el) => <HTMLElement>document.querySelector(`#${el}`));
const updateTeamProgress = (id, progress) => {
  const element = elements[id];
  element.style.transform = `translateX(calc(${progress} * 72vw + 5vw))`;
};

// ======  WEBSOCKET ======= //
const WEBSOCKET_URL = 'ws://stagecast.se/api/events/livehacks_team11/ws?x-user-listener=1';
const socket = createSocket(WEBSOCKET_URL);
socket.setMessageHandler(createMessageHandler());
