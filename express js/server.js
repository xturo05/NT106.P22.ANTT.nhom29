// server.js - PHIÊN BẢN CÓ XÁC THỰC TOKEN + HANDLER WEBRTC HOÀN CHỈNH + TỰ ĐỘNG GỬI TÍN HIỆU CHO NGƯỜI XEM MỚI

// Log ngay khi file bắt đầu chạy
console.log(`[${new Date().toISOString()}] --- Script server.js bắt đầu thực thi ---`);

// ----- 1. Import -----
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');
const cors = require('cors');

console.log(`[${new Date().toISOString()}] --- Import xong, chuẩn bị khởi tạo App/Server ---`);

// ----- 2. Khởi tạo -----
const app = express();
const server = http.createServer(app);

// Lưu trữ trạng thái livestream cho từng phòng
const roomStates = new Map();

console.log(`[${new Date().toISOString()}] --- HTTP server đã tạo, chuẩn bị tạo Socket.IO Server ---`);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:8000",
        methods: ["GET", "POST"]
    }
});

console.log(`[${new Date().toISOString()}] --- Socket.IO Server đã tạo, chuẩn bị cấu hình Middleware ---`);

// ----- 3. Middleware Express -----
app.use(cors({ origin: 'http://localhost:8000' }));

// ----- 4. Lấy Secret Key -----
const JWT_SECRET = process.env.JWT_SECRET_KEY;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET_KEY is not defined in .env file.");
    process.exit(1);
} else {
    console.log(`[${new Date().toISOString()}] --- JWT Secret Key đã được load ---`);
}

// ----- 5. Route Test HTTP GET /ping -----
app.get('/ping', (req, res) => {
    console.log(`[${new Date().toISOString()}] >>>>> Received HTTP GET /ping request <<<<<`);
    res.status(200).send('Pong! Express server is reachable via HTTP.');
});

// ----- 6. Middleware xác thực WebSocket -----
console.log(`[${new Date().toISOString()}] --- Sắp định nghĩa io.use() ---`);
io.use((socket, next) => {
    console.log(`[${new Date().toISOString()}] --- io.use() BẮT ĐẦU cho socket ${socket.id} ---`);
    const token = socket.handshake.auth.token;
    if (!token) {
        console.warn(`[${new Date().toISOString()}] io.use() -> Lỗi: Không có token cho socket ${socket.id}`);
        return next(new Error('Authentication error: No token provided'));
    }
    console.log(`[${new Date().toISOString()}] io.use() -> Đang verify token cho socket ${socket.id}`);
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.warn(`[${new Date().toISOString()}] io.use() -> Lỗi: Token không hợp lệ cho socket ${socket.id}. Lý do: ${err.message}`);
            return next(new Error('Authentication error: Invalid token'));
        }
        if (!decoded || !decoded.user_id || !decoded.username) {
            console.error(`[${new Date().toISOString()}] io.use() -> Lỗi: Payload thiếu user_id/username hoặc không hợp lệ cho socket ${socket.id}. Payload:`, decoded);
            return next(new Error('Authentication error: Invalid token payload'));
        }
        socket.user = decoded;
        console.log(`[${new Date().toISOString()}] io.use() -> Auth OK: User ${socket.user.username} (${socket.user.user_id}), Socket ID: ${socket.id}`);
        next();
    });
});
console.log(`[${new Date().toISOString()}] --- Đã định nghĩa io.use() ---`);

// ----- 7. Xử lý sự kiện Socket.IO -----
console.log(`[${new Date().toISOString()}] --- Sắp định nghĩa io.on('connection') ---`);
io.on('connection', (socket) => {
    console.log(`[${new Date().toISOString()}] ===> User Connected: ${socket.user.username} (User ID: ${socket.user.user_id}, Socket ID: ${socket.id})`);

    // === XỬ LÝ CHAT ===
    socket.on('joinRoom', (roomIdentifier) => {
        console.log(`[${new Date().toISOString()}] Event 'joinRoom': User ${socket.user.username} requests to join room '${roomIdentifier}'`);
        if (!roomIdentifier) {
            console.log(`[${new Date().toISOString()}] Event 'joinRoom': Denied. No roomIdentifier provided by ${socket.user.username}.`);
            socket.emit('error_message', { message: 'Không có mã phòng được cung cấp.' });
            return;
        }
        Array.from(socket.rooms)
            .filter(room => room !== socket.id && room !== roomIdentifier)
            .forEach(room => {
                console.log(`[${new Date().toISOString()}] Event 'joinRoom': User ${socket.user.username} leaving existing room '${room}'`);
                socket.leave(room);
            });
        socket.join(roomIdentifier);
        console.log(`[${new Date().toISOString()}] Event 'joinRoom': User ${socket.user.username} successfully joined room '${roomIdentifier}'`);
        socket.to(roomIdentifier).emit('userJoined', {
            username: socket.user.username, userId: socket.user.user_id, message: `${socket.user.username} đã tham gia.`
        });

        // Gửi tín hiệu livestream cho người xem mới nếu phòng đang phát
        const roomState = roomStates.get(roomIdentifier);
        if (roomState && roomState.isStreaming) {
            console.log(`[${new Date().toISOString()}] Gửi Offer cho người xem mới ${socket.user.username} trong phòng ${roomIdentifier}`);
            socket.emit('stream_started', { streamerId: roomState.streamerId, streamerName: roomState.streamerName });
            socket.emit('receive_offer', { offer: roomState.offer });
        }
    });

    socket.on('sendMessage', (data) => {
        const { room, message } = data;
        console.log(`[${new Date().toISOString()}] Event 'sendMessage': Received from ${socket.user.username} to room '${room}'. Message: "${message}"`);
        if (!room || !message || message.trim() === '') {
            console.warn(`[${new Date().toISOString()}] Event 'sendMessage': Invalid data from ${socket.user.username}. Room: ${room}, Message: ${message}`);
            socket.emit('error_message', { message: 'Dữ liệu tin nhắn không hợp lệ.' });
            return;
        }
        if (!Array.from(socket.rooms).includes(room)) {
            console.warn(`[${new Date().toISOString()}] Event 'sendMessage': User ${socket.user.username} not in room '${room}'.`);
            socket.emit('error_message', { message: 'Bạn không ở trong phòng này.' });
            return;
        }
        io.to(room).emit('receiveMessage', {
            userId: socket.user.user_id, username: socket.user.username, message: message, timestamp: new Date().toISOString()
        });
        console.log(`[${new Date().toISOString()}] Event 'sendMessage': Broadcasted message from ${socket.user.username} to room '${room}'`);
    });

    // === XỬ LÝ WEBRTC ===
    console.log(`[${new Date().toISOString()}] Setting up WebRTC signal handlers for ${socket.user.username}`);

    // Nhận Offer từ streamer
    socket.on('broadcast_offer', async (data) => {
        const { roomId, offer } = data;
        console.log(`[${new Date().toISOString()}] Event 'broadcast_offer': Received from ${socket.user.username} for room '${roomId}'`);
        if (!roomId || !offer) {
            console.warn(`[${new Date().toISOString()}] Event 'broadcast_offer': Invalid data from ${socket.user.username}. RoomId: ${roomId}, Offer: ${offer}`);
            socket.emit('error_message', { message: 'Dữ liệu Offer không hợp lệ.' });
            return;
        }

        // Kiểm tra quyền chủ phòng
        const ownerId = await getRoomOwnerIdFromDjango(roomId);
        if (!ownerId) {
            console.error(`[${new Date().toISOString()}] Event 'broadcast_offer': Could not get owner ID for room ${roomId}. Denying.`);
            socket.emit('error_message', { message: 'Không thể xác định chủ phòng.' });
            return;
        }
        if (socket.user.user_id !== ownerId) {
            console.warn(`[${new Date().toISOString()}] Event 'broadcast_offer': Denied. User ${socket.user.username} (${socket.user.user_id}) is NOT owner (${ownerId}) of room ${roomId}.`);
            socket.emit('error_message', { message: 'Bạn không có quyền phát sóng trong phòng này.' });
            return;
        }
        console.log(`[${new Date().toISOString()}] Event 'broadcast_offer': User ${socket.user.username} IS owner. Broadcasting offer...`);

        // Lưu trạng thái livestream
        roomStates.set(roomId, {
            offer: offer,
            streamerId: socket.user.user_id,
            streamerName: socket.user.username,
            isStreaming: true
        });
        console.log(`[${new Date().toISOString()}] Lưu trạng thái livestream cho phòng ${roomId}`);

        // Thông báo stream bắt đầu và gửi Offer đến tất cả viewer
        io.to(roomId).emit('stream_started', { streamerId: socket.user.user_id, streamerName: socket.user.username });
        socket.to(roomId).emit('receive_offer', { offer: offer });
        console.log(`[${new Date().toISOString()}] Event 'broadcast_offer': Sent offer to viewers in room ${roomId}.`);
    });

    // Nhận Answer từ viewer
    socket.on('broadcast_answer', async (data) => {
        const { roomId, answer } = data;
        console.log(`[${new Date().toISOString()}] Event 'broadcast_answer': Received from ${socket.user.username} for room '${roomId}'`);
        if (!roomId || !answer) {
            console.warn(`[${new Date().toISOString()}] Event 'broadcast_answer': Invalid data from ${socket.user.username}. RoomId: ${roomId}, Answer: ${answer}`);
            socket.emit('error_message', { message: 'Dữ liệu Answer không hợp lệ.' });
            return;
        }

        // Kiểm tra viewer có trong phòng không
        if (!Array.from(socket.rooms).includes(roomId)) {
            console.warn(`[${new Date().toISOString()}] Event 'broadcast_answer': Denied. User ${socket.user.username} is not in room ${roomId}.`);
            socket.emit('error_message', { message: 'Bạn không ở trong phòng này.' });
            return;
        }

        // Gửi Answer về cho streamer (chủ phòng)
        socket.to(roomId).emit('broadcast_answer', { answer: answer });
        console.log(`[${new Date().toISOString()}] Event 'broadcast_answer': Sent answer to streamer in room ${roomId}.`);
    });

    // Nhận ICE Candidate
    socket.on('broadcast_ice_candidate', async (data) => {
        const { roomId, candidate } = data;
        console.log(`[${new Date().toISOString()}] Event 'broadcast_ice_candidate': Received from ${socket.user.username} for room '${roomId}'`);
        if (!roomId || !candidate) {
            console.warn(`[${new Date().toISOString()}] Event 'broadcast_ice_candidate': Invalid data from ${socket.user.username}. RoomId: ${roomId}, Candidate: ${candidate}`);
            socket.emit('error_message', { message: 'Dữ liệu ICE candidate không hợp lệ.' });
            return;
        }

        // Chuyển tiếp candidate đến tất cả socket khác trong phòng
        socket.to(roomId).emit('receive_ice_candidate', { candidate: candidate });
        console.log(`[${new Date().toISOString()}] Event 'broadcast_ice_candidate': Relayed candidate to room ${roomId}.`);
    });

    // Nhận tín hiệu dừng stream
    socket.on('stop_stream', async (data) => {
        const { roomId } = data;
        console.log(`[${new Date().toISOString()}] Event 'stop_stream': Received from ${socket.user.username} for room '${roomId}'`);
        if (!roomId) {
            console.warn(`[${new Date().toISOString()}] Event 'stop_stream': Invalid data from ${socket.user.username}. RoomId: ${roomId}`);
            socket.emit('error_message', { message: 'Mã phòng không hợp lệ.' });
            return;
        }

        // Kiểm tra quyền chủ phòng
        const ownerId = await getRoomOwnerIdFromDjango(roomId);
        if (!ownerId || socket.user.user_id !== ownerId) {
            console.warn(`[${new Date().toISOString()}] Event 'stop_stream': Denied. User ${socket.user.username} is not owner or owner check failed. Owner ID: ${ownerId}`);
            socket.emit('error_message', { message: 'Bạn không có quyền dừng stream.' });
            return;
        }

        // Xóa trạng thái livestream
        if (roomStates.has(roomId)) {
            console.log(`[${new Date().toISOString()}] Xóa trạng thái livestream cho phòng ${roomId}`);
            roomStates.delete(roomId);
        }

        // Thông báo stream dừng đến tất cả viewer
        socket.to(roomId).emit('stream_stopped', { streamerId: socket.user.user_id });
        console.log(`[${new Date().toISOString()}] Event 'stop_stream': Notified room ${roomId} that stream stopped.`);
    });

    // === XỬ LÝ DISCONNECT ===
    socket.on('disconnect', (reason) => {
        console.log(`[${new Date().toISOString()}] ===> User Disconnected: ${socket.user?.username || 'N/A'} (ID: ${socket.id}). Reason: ${reason}`);
        const username = socket.user ? socket.user.username : 'Một người dùng';
        const userId = socket.user ? socket.user.user_id : null;

        // Kiểm tra nếu người dùng là host và đang livestream thì dừng stream
        for (const [roomId, state] of roomStates) {
            if (state.streamerId === socket.user.user_id) {
                console.log(`[${new Date().toISOString()}] Chủ phòng ${socket.user.username} ngắt kết nối trong khi livestream ở phòng ${roomId}. Dừng livestream.`);
                io.to(roomId).emit('stream_stopped', { streamerId: socket.user.user_id });
                roomStates.delete(roomId);
            }
        }

        socket.rooms.forEach(room => {
            if (room !== socket.id) {
                console.log(`[${new Date().toISOString()}] Event 'disconnect': Notifying room '${room}' that ${username} left.`);
                io.to(room).emit('userLeft', {
                    username: username, userId: userId, message: `${username} đã rời phòng.`
                });
            }
        });
    });

    socket.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] Socket Error for ${socket.user?.username || 'N/A'} (ID: ${socket.id}):`, error);
    });
});
console.log(`[${new Date().toISOString()}] --- Đã định nghĩa io.on('connection') ---`);

// ----- HÀM PLACEHOLDER LẤY OWNER ID -----
async function getRoomOwnerIdFromDjango(roomId) {
    // !!! CẢNH BÁO: ĐÂY LÀ HÀM GIẢ ĐỊNH - BẠN CẦN THAY THẾ BẰNG LOGIC GỌI API THỰC TẾ !!!
    console.warn(`[getRoomOwnerIdFromDjango] Đang dùng logic giả định cho phòng ${roomId}. Cần gọi API Django thực tế!`);
    // Logic giả định để test
    if (!roomId) return null;
    if (roomId.endsWith('1')) {
        console.log(`[getRoomOwnerIdFromDjango] Giả định User ID 1 là chủ phòng ${roomId}`);
        return 1; // User ID 1 là owner cho phòng kết thúc bằng '1'
    } else {
        console.log(`[getRoomOwnerIdFromDjango] Giả định User ID 2 là chủ phòng ${roomId}`);
        return 2; // User ID 2 là owner cho các phòng khác
    }
}

// ----- 8. Chạy Server -----
const PORT = process.env.WEBSOCKET_PORT || 3001;
server.listen(PORT, () => {
    console.log(`\n[${new Date().toISOString()}] >>> Express & WebSocket server listening on port ${PORT} (Authentication Enabled, Full WebRTC Handlers)`);
    console.log(`>>> Ensure Django app (port 8000) serves the chat UI and connects to ws://localhost:${PORT}`);
    console.log(`>>> Ensure client JS sends token via 'auth' option`);
});