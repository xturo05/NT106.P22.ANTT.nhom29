// frontend/src/App.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

// --- Các hằng số cấu hình ---
const STREAM_CODE = "STREAM_123"; // Mã phòng stream tạm thời
const USER_ID = `User_${Math.floor(Math.random() * 1000)}`; // User ID ngẫu nhiên
// Đảm bảo URL trỏ đúng đến backend Django/Daphne và có dấu / ở cuối
const WEBSOCKET_URL = `ws://localhost:8000/ws/${STREAM_CODE}/${USER_ID}/`;

function App() {
  // --- State cho ứng dụng ---
  const [backendTime, setBackendTime] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const webSocket = useRef(null);
  // Ref cho div chứa tin nhắn để tự cuộn xuống
  const messagesEndRef = useRef(null);
  // --- Kết thúc State ---

  // --- Hàm tự cuộn ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Tự cuộn khi có tin nhắn mới
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]); // Chạy mỗi khi chatMessages thay đổi
  // --- Kết thúc hàm tự cuộn ---

  // --- Effect gọi API lấy thông tin cơ bản từ server ---
  useEffect(() => {
    fetch('http://localhost:8000/') // Gọi API gốc của Django
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok for /');
        return response.json();
      })
      .then(data => setBackendTime(data.message))
      .catch(err => {
         console.error("Error fetching /:", err);
         setError(`Lỗi khi gọi API /: ${err.message}. Backend có đang chạy ở port 8000?`);
      });
  }, []);
  // --- Kết thúc Effect gọi API ---

  // --- Effect chính quản lý kết nối WebSocket ---
  useEffect(() => {
    // Biến cờ để tránh effect chạy lại không cần thiết (cho StrictMode)
    let didConnect = false;

    function connectWebSocket() {
        if (!webSocket.current && !didConnect) {
            didConnect = true; // Đánh dấu đã cố gắng kết nối
            console.log(`[DEBUG] Attempting to connect to WebSocket: ${WEBSOCKET_URL}`);
            webSocket.current = new WebSocket(WEBSOCKET_URL);

            webSocket.current.onopen = () => {
                console.log("[DEBUG] WebSocket Connected");
                setIsConnected(true);
                setError(null);
                setChatMessages(prev => [...prev, { type: 'system', text: `Đã kết nối với user ID: ${USER_ID}` }]);
            };

            webSocket.current.onmessage = (event) => {
                console.log("[DEBUG] Message from server (raw):", event.data);
                try {
                    const data = JSON.parse(event.data);
                    console.log("[DEBUG] Parsed data:", data);
                    let messageToDisplay = '';
                    let messageType = 'user';

                    switch (data.type) {
                        case 'system':
                            messageToDisplay = data.payload;
                            messageType = 'system';
                            console.log("[DEBUG] Handling system message:", messageToDisplay);
                            break;
                        case 'chat':
                            messageToDisplay = data.payload; // Backend đã format "UserID: message"
                            messageType = 'user';
                            console.log("[DEBUG] Handling chat message:", messageToDisplay);
                            break;
                        case 'offer':
                        case 'answer':
                        case 'candidate':
                            console.log(`[DEBUG] Received WebRTC signal (ignored in chat): ${data.type}`);
                            // Xử lý WebRTC sẽ thêm vào đây sau
                            return;
                        default:
                            console.warn("[DEBUG] Received unknown message type:", data);
                            messageToDisplay = `Unknown message: ${event.data}`;
                            messageType = 'system';
                            break;
                    }

                    if (messageToDisplay) {
                        console.log("[DEBUG] Adding message to state:", { type: messageType, text: messageToDisplay });
                        setChatMessages(prev => [...prev, { type: messageType, text: messageToDisplay }]);
                    } else {
                        console.log("[DEBUG] No message to display for received data.");
                    }

                } catch (error) {
                    console.error("[DEBUG] Failed to parse message JSON or handle message:", error);
                    setChatMessages(prev => [...prev, { type: 'system', text: `Lỗi xử lý: ${event.data}` }]);
                }
            };

            webSocket.current.onerror = (event) => {
                console.error("[DEBUG] WebSocket Error:", event);
                setError("Lỗi kết nối WebSocket. Server có đang chạy?");
                setIsConnected(false); // Cập nhật trạng thái khi có lỗi
                webSocket.current = null; // Reset để có thể thử kết nối lại
                didConnect = false;       // Cho phép thử kết nối lại
            };

            webSocket.current.onclose = (event) => {
                console.log("[DEBUG] WebSocket Disconnected:", event.reason, `Clean: ${event.wasClean}`);
                const wasConnected = isConnected; // Lưu trạng thái trước khi set false
                setIsConnected(false);
                if (!event.wasClean && wasConnected) { // Chỉ báo lỗi nếu trước đó đã kết nối thành công và không phải đóng chủ động
                     setChatMessages(prev => [...prev, { type: 'system', text: 'Mất kết nối WebSocket.' }]);
                }
                webSocket.current = null; // Reset ref
                didConnect = false;       // Cho phép thử kết nối lại
            };
        }
    }

    connectWebSocket(); // Gọi hàm kết nối

    // --- Hàm cleanup của useEffect ---
    return () => {
      // Vẫn giữ cleanup để đóng kết nối khi component unmount hoàn toàn
      if (webSocket.current && webSocket.current.readyState === WebSocket.OPEN) {
        console.log("[DEBUG] Closing WebSocket connection on unmount...");
        webSocket.current.close(1000, "Component unmounting");
      }
       // Không nên reset webSocket.current = null ở đây vì StrictMode có thể chạy cleanup trước khi remount
    };
    // --- Kết thúc hàm cleanup ---

  }, []); // Dependency rỗng
  // --- Kết thúc Effect WebSocket ---


  // --- Các hàm xử lý gửi tin nhắn ---
  const handleInputChange = (event) => {
    setMessageInput(event.target.value);
  };

  const sendMessage = useCallback(() => {
    if (messageInput.trim() && webSocket.current && webSocket.current.readyState === WebSocket.OPEN) {
      const messageText = messageInput.trim();
      console.log("[DEBUG] Sending text message:", messageText);
      webSocket.current.send(messageText); // Gửi text thô, backend sẽ xử lý
      setMessageInput('');
    } else if (!isConnected) {
      console.error("[DEBUG] Cannot send: WebSocket not connected.");
      setError("Lỗi: Chưa kết nối WebSocket để gửi tin nhắn.");
    } else {
      console.log("[DEBUG] Cannot send: Message empty.");
    }
  }, [messageInput, isConnected]); // Thêm isConnected vào dependency

  const handleKeyDown = (event) => {
     if (event.key === 'Enter') {
         sendMessage();
     }
  };
  // --- Kết thúc hàm gửi tin nhắn ---


  // --- Phần JSX render giao diện ---
  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React + Django Channels</h1>

      <div className="card">
        <h3>Kết nối Backend (API):</h3>
        {error && !error.includes("WebSocket") ? <p style={{ color: 'red' }}>Lỗi API: {error}</p> : null}
        <p>Thông điệp server: <span style={{color: 'blue'}}>{backendTime || 'Đang tải...'}</span></p>
      </div>

      <div className="card">
        <h3>Chat Room: {STREAM_CODE} (User: {USER_ID})</h3>
        <p>Trạng thái: <span style={{color: isConnected ? 'green' : 'red', fontWeight: 'bold'}}>{isConnected ? 'Đã kết nối' : 'Chưa kết nối / Đã ngắt'}</span></p>
        {error && error.includes("WebSocket") ? <p style={{ color: 'red' }}>{error}</p> : null}

        <div style={{ height: '300px', overflowY: 'scroll', border: '1px solid #ccc', marginBottom: '10px', padding: '5px', textAlign: 'left', background: '#f9f9f9' }}>
          {chatMessages.map((msg, index) => (
            <p key={index} style={{ /* style cũ */ }}>
              {msg.text}
            </p>
          ))}
          {/* Thêm div trống để cuộn tới */}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ display: 'flex' }}>
          <input
            type="text"
            value={messageInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            style={{ flexGrow: 1, marginRight: '5px', padding: '8px' }}
            disabled={!isConnected}
          />
          <button onClick={sendMessage} disabled={!isConnected} style={{ padding: '8px 12px' }}>
            Gửi
          </button>
        </div>
      </div>

      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;