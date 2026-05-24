const { io } = require('socket.io-client');

const socket = io('http://localhost:5001', {
  auth: {
    token:
      'PASTE_YOUR_SESSION_OR_USER_JWT',
  },
});

socket.on('connect', () => {
  console.log(
    '✅ Connected:',
    socket.id
  );

  socket.emit(
    'booking:join',
    {
      bookingId:
        '6a12ed59ac65aa725026b709',
    },
    (response) => {
      console.log(
        '📦 booking:join response:',
        response
      );
    }
  );
});

socket.on(
  'connect_error',
  (err) => {
    console.error(
      '❌ Connection error:',
      err.message
    );
  }
);

socket.on('error', (err) => {
  console.error(
    '❌ Socket error:',
    err
  );
});

socket.onAny(
  (event, payload) => {
    console.log(
      '📡 Event:',
      event,
      payload
    );
  }
);
