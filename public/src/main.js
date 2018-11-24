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
        if (message.data === 'END') {
            disconnect();
        } else {
            let data;
            try {
                data = JSON.parse(message.data);
            } catch (err) {
                return console.log('Got unparsable message', message.data);
            }
            if (messageHandler) {
                messageHandler(data);
            }
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

// CONSTS used to be here

let users = [];

const createMessageHandler = (onChange) => {
    const pruneInactiveUsers = () => {
        console.log('pruneInactiveUsers');
        users
            .filter((user) => !user.alive)
            .forEach((user) => {
                console.log('remove', user.id);
                document.body.removeChild(user.element);
            });
        users = users.filter((user) => user.alive);
        users.forEach((user) => {
            user.alive = false;
        });
    };
    setInterval(pruneInactiveUsers, 10000);

    return (message) => {
        console.log(message);
        //   let user = findUserById(message.from);
        //   if (!user) {
        //     const { color, avatar } = message.msg;
        //     if (!color || !avatar) {
        //       console.warn('Skipping new user without color or avatar', message);
        //       return;
        //     }
        //     user = { id: message.from };
        //     const element = document.createElement('img');
        //     element.src = avatar;
        //     element.className = 'avatar';
        //     element.style.left = AVATAR_SIZE / 2 + Math.random() * (window.innerWidth - AVATAR_SIZE);
        //     element.style.top = AVATAR_SIZE / 2 + Math.random() * (window.innerHeight - AVATAR_SIZE);
        //     element.style.boxShadow = `0 0 150px #${color}`;
        //
        //     document.body.appendChild(element);
        //     user.element = element;
        //     users.push(user);
        //   }
        //   user.alive = true;
        //   Object.assign(user, message.msg);
        //   if (message.msg.progress || message.msg.state === STATE_INACTIVE) {
        //     user.element.style.transform = `scale(${
        //       message.msg.progress ? Math.max(0.1, message.msg.progress) : 0
        //     })`;
        //   }
        // };
    };
};

const WEBSOCKET_URL = 'ws://stagecast.se/api/events/livehacks_team11/ws?x-user-listener=1';
const socket = createSocket(WEBSOCKET_URL);
socket.setMessageHandler(createMessageHandler());