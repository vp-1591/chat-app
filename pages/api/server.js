import { Server } from 'socket.io';

export default function handler(req, res) {

    if (res.socket.server.io) {
        console.log('Socket is already running');
        res.end();
        return;
    }

    const io = new Server(res.socket.server, {
        path: '/api/server',
    });

    res.socket.server.io = io;

    const executeForRoom = (fn, roomId) => {
        for (const [id, socket] of io.of('/').sockets) {
            if (roomId === socket.roomId) {
                fn(socket)
            }
        }
    }

    const getRoomOnline = (roomId) =>{
        const usernames = [];

        executeForRoom((roomSocket) => {
            console.log(roomSocket.username)
            if (roomSocket.username) {usernames.push(roomSocket.username);}
        }, roomId
        )
        console.log(usernames)
        return usernames
    }

    io.on('connection', (socket) => {
        console.log('New socket connection');



        socket.on('message', ({msgAuthor, msg, roomId}) => {
            executeForRoom( (roomSocket) => {
                if( roomSocket.username && roomSocket.username !== msgAuthor){ // broadcast to room but not to self
                    roomSocket.emit('message', {msgAuthor, msg});
                }
            }, roomId)
        });



        socket.on('typing', 
            (username) => {
                executeForRoom(
                    (roomSocket) => {
                        if( roomSocket.username && roomSocket.username !== username){
                            roomSocket.emit('typing',username)
                        }
                    },
                    socket.roomId
                )
            }
        );



        socket.on('register', ({username, roomId}) => {
            socket["username"] = username // attach to socket for later
            socket["roomId"] = roomId
            executeForRoom( (roomSocket) => {
                roomSocket.emit('updateOnline', getRoomOnline(roomId));
            }, roomId)
        });



        socket.on('checkUser', ({username, roomId}) => {
            let usernameAllowed = true
            executeForRoom((roomSocket) => {
                console.log(roomSocket.username)
                if(username === roomSocket.username && socket.id !== roomSocket.id) usernameAllowed = false
            },roomId)
            socket.emit("checkUserResponse",usernameAllowed)
        })



        socket.on('disconnect', () => {
            console.log(`${socket.username || "User"} disconnected`)
            executeForRoom( (roomSocket) => {
                roomSocket.emit('updateOnline', getRoomOnline(socket.roomId))
            }, socket.roomId)
        });
    });

    console.log('Socket server initialized');
    res.end();
}
