'use client'

import { useState, useRef, useEffect } from "react";
import { io } from 'socket.io-client';

export default function Home() {

  const [author, setAuthor] = useState('');

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const [isTyping, setIsTyping] = useState(false);
  const [timeoutTyping, setTimeoutTyping] = useState();
  const [typing, setTyping] = useState(new Set());
  const [usersTyping, setUsersTyping] = useState([])

  const [online, setOnline] = useState([])

  const [room, setRoom] = useState('')
  const [hasJoined, setJoined] = useState(false)
  const [canJoin, setCanJoin] = useState(false)

  const [isRoomWrong, setisRoomWrong] = useState(false)
  const [isUserWrong, setisUserWrong] = useState(false)
  const [showOnlineMenu, setShowOnlineMenu] = useState(false)

  const desktopBottomRef = useRef(null);
  const phoneBottomRef = useRef(null);

  const socket = useRef(null)





  // ---------------------------------WebSocket---------------------------------
  useEffect(() => {
    
    console.log("socket effect")
    // Trigger socket setup
    fetch('/api/server');

    // Connect to socket
    socket.current = io({ path: '/api/server' })



    socket.current.on('connect', () => {
      console.log('connected to socket.io');
    });



    socket.current.on('message', ({msgAuthor, msg}) => {
      console.log('Client received message:', msg);
      setMessages(prev => [...prev, {msgAuthor, msg}]);
    });



    socket.current.on('typing', (username) => {
      console.log('Client received typing:', username);
      if(typing.has(username)){
        setTyping(typing.delete(username))
      }
      else{
        setTyping(typing.add(username))
      }
      setUsersTyping(Array.from(typing))
    });



    socket.current.on('checkUserResponse', (userAllowed) => {
      console.log('Client received checkUserResponse:', userAllowed);
      setCanJoin(userAllowed)
    });



    socket.current.on('updateOnline', (onlineUsers) => {
      console.log('Client received updateOnline:', onlineUsers);
      setOnline(onlineUsers)
    });

    return () => {
      socket.current.disconnect();
    };
  },[]);



  const isSocketUp = (operation="default") => { // if socket is down, log error
    if(socket.current){
      return true
    }
    else{
      console.log(`No socket found, ${operation} aborted`)
      return false
    }
  }

  // --------------------------------Autoscrolling-----------------------------

  useEffect(() => {
    if (desktopBottomRef.current && window.innerWidth >= 768) {
      desktopBottomRef.current?.scrollIntoView({ behavior: "smooth" })
      return
    }
    if (phoneBottomRef.current && window.innerWidth < 768) {
      phoneBottomRef.current?.scrollIntoView({ behavior: "smooth" })
      return
    }
  }, [messages]);


  // ----------------------------------Typing--------------------------

  const userTyping = () => {
    if(!isTyping){
      sendTyping()
      setIsTyping(true)
    }
    
    console.log(isTyping)
    debounce(() => {
      sendTyping()
      setIsTyping(false);
    }, 2000)()
  }

  function debounce(fn, delay) { // send repeated API requests at limited rate
    return (...args) => {
      [!timeoutTyping || clearTimeout(timeoutTyping)]
      setTimeoutTyping(setTimeout(() => fn(...args), delay))
    };
  }

  const sendTyping = () => {
    console.log("sendTyping")
    if(isSocketUp("typing")){
      socket.current.emit('typing', author);
    }
  }


  // --------------------------SEND MESSAGE---------------------------------
  
  const sendMessage = () => {
    console.log("message sent")
    if (message.trim()) {
      if(isSocketUp("message")){
        socket.current.emit('message', {msgAuthor: author, msg: message, roomId: room});
        setMessages((prev) => [...prev, {msgAuthor: author, msg: message}]);
        setMessage('');
      }
    }
  };


  // ---------------------------Online-------------------------------------

  const sendRegisterUser = (usernameCl, roomIdCl) => {
    if(isSocketUp("register")){
      socket.current.emit('register', {username: usernameCl, roomId: roomIdCl});
    }
  }

  // ---------------------------Join Room----------------------------------

  const joinRoom = () => {
    console.log(room)
    if(room && author && canJoin){
      setJoined(true)
      sendRegisterUser(author, room)
      return
    }
    
    setisRoomWrong(false)
    setisUserWrong(false)
    if(!room){
      console.log("room")
      setisRoomWrong(true)
    }
    if(!author){
      console.log("author")
      setisUserWrong(true)
    }
    if(!canJoin){
      console.log("canJoin")
      setisUserWrong(true)
    }
    
  }

  const checkUserExists = () => {
    socket.current.emit('checkUser', {username: author, roomId: room});
  }



  // ---------------------------HTML----------------------------------------

  const toggleOnlineMenu = () => {
    setShowOnlineMenu(!showOnlineMenu)
  }

  if(hasJoined){
    return (
      <main className="w-full flex items-center flex-col h-full">
        {/* Title & Chat DESKTOP */}
        <h1 className="hidden md:block mt-5 text-2xl font-bold">Room {room}</h1>
        <div className="hidden md:flex  flex-row">
          <div className="mt-5 flex flex-col h-[500px] w-[50vw] items-end border rounded-2xl overflow-y-auto">
            {messages.map(({msgAuthor, msg}, i) => (
              <div key={i} className="my-1">
                <p className="mr-5 text-right text-sm font-semibold text-gray-600">{msgAuthor}</p>
                <p className="mr-5 text-right">{msg}</p>
              </div>
            ))}
            <div ref={desktopBottomRef} />
          </div>
        </div>

        {/* Title & Chat PHONE */}
        <h1 className="md:hidden mt-5 text-xl font-bold">Room {room}</h1>
        <div className="md:hidden flex-row">
          <div className="mt-2 flex flex-col h-[60vh] w-[90vw] items-end border rounded-2xl overflow-y-auto">
            {messages.map(({msgAuthor, msg}, i) => (
              <div key={i} className="my-1">
                <p className="mr-5 text-right text-sm font-semibold text-gray-600">{msgAuthor}</p>
                <p className="mr-5 text-right">{msg}</p>
              </div>
            ))}
            
            <div ref={phoneBottomRef} />
          </div>
        </div>

        

        {/* Typing DESKTOP */}
        {usersTyping.length > 0 ? 
          <p className="hidden md:block mt-3 h-2">{usersTyping.join(', ')} is typing...</p> : <p className="h-5"></p>
        }

        {/* Typing PHONE */}
        {usersTyping.length > 0 ? 
          <p className="md:hidden mt-1 h-[1.75rem]">{usersTyping.join(', ')} is typing...</p> : <p className="h-3"></p>
        }

        {/* Message input & Send Desktop */}
        <div className="hidden md:block mt-5 w-[50vw]">
          <input
            type="text"
            value={message}
            onChange={e => {
              setMessage(e.target.value)
              userTyping()
            }
            }
            placeholder="Write here"
            className="w-[80%] px-3 py-2 border rounded-lg mr-[2%]"
          />
          <button 
            onClick={sendMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white w-[18%] rounded-lg shadow-md px-3 py-2 
            active:shadow-inner transition"
          >
            Send
          </button>
        </div>

        {/* Message input & Send PHONE */}
        <div className="md:hidden mt-1 w-[90vw]">
          <input
            type="text"
            value={message}
            onChange={e => {
              setMessage(e.target.value)
              userTyping()
            }
            }
            placeholder="Write here"
            className="w-[80%] px-3 py-2 border rounded-lg mr-[2%]"
          />
          <button 
            onClick={sendMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white w-[18%] rounded-lg shadow-md px-3 py-2 
            active:shadow-inner transition"
          >
            Send
          </button>
        </div>

        {/* Online Tab DESKTOP */}
        <div className="hidden md:block fixed left-0 h-[500px] w-[20vw] border ml-5 mt-18 rounded-2xl 
        overflow-y-auto bg-white shadow-lg"
        >
          <p className="text-center font-bold text-xl my-2">Online users</p>
          {online.map((username, i) => (
            <p key={i} className="mx-5 my-2 text-right font-semibold">{username}</p>
          ))}
        </div>

        {/* Online Tab PHONE */}
        <div className={`fixed left-0 ${showOnlineMenu ? "translate-y-0" : "-translate-y-[105%]"} md:hidden transition-all 
        duration-400 backdrop-blur bg-gradient-to-bl from-gray-300/60 to-gray-100/60 border border-t-0 rounded-b-xl h-fit w-[100%]`}
        >
          <p className="text-center font-bold text-xl my-2">Online users</p>
          {online.map((username, i) => (
            <p key={i} className="mx-5 my-2 text-right font-semibold">{username}</p>
          ))}
        </div>

        {/* Show/Hide Online menu PHONE */}
        <button 
          onClick={toggleOnlineMenu}
          className="md:hidden fixed left-0 top-[80vh] h-[5vh] w-fit bg-blue-600 hover:bg-blue-700 text-white 
          rounded-lg shadow-md px-2 py-1 active:shadow-inner transition"
        >
          Toggle menu
        </button>
      </main>
    );
  }

  return (
    <main className="w-full flex justify-center">
      <div className="max-w-80 min-w-40 md:w-[20%] w-40% h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Join room</h1>
        <input
            type="text"
            value={room}
            onChange={e => {
              setRoom(e.target.value)
              checkUserExists()
            }
            }
            placeholder="Room id"
            className={`w-full mt-5 px-3 py-2 border rounded-lg m-5 ${isRoomWrong ? 'border-red-500' : 'border-black'}`}
        />
        <input
            type="text"
            value={author}
            onChange={e => {
              setAuthor(e.target.value)
              checkUserExists()
            }
            }
            placeholder="Username"
            className={`w-full mt-5 mb-20 px-3 py-2 border rounded-lg m-5 ${isUserWrong ? 'border-red-500' : 'border-black'}`}
        />
        <button 
          onClick={joinRoom}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md px-3 py-2
          active:shadow-inner transition"
        >
          Join
        </button>
      </div>
    </main>
  )

}

