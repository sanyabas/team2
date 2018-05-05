import io from 'socket.io-client';
import * as Types from '../enum/WSActionType';
import ss from 'socket.io-stream';

const METHODS =
    ['GetMessages', 'GetProfile', 'SearchByLogin', 'AddContact', 'GetChatList',
        'SendMessage', 'SendReaction', 'DeleteProfile', 'UploadImage', 'UploadAvatar', 'CreateChat',
        'RevokeLink', 'GetContactList', 'JoinChat', 'RenameChat', 'LeaveChat', 'SetAlarm'];


let TOKEN;
let socket;

function init() {
    socket = io(process.env.HOST, {
        transports: ['websocket'],
        query: { token: TOKEN }
    });

    socket.on('NewMessage', message => {
        postMessage({ action: 'NewMessage', result: message, type: Types.EMIT });
    });
    socket.on('NewChat', chat => {
        console.info(`Received newChat: ${chat}`);
        postMessage({ action: 'NewChat', result: chat, type: Types.EMIT });
    });
    socket.on('NewInviteLink', chat => {
        postMessage({ action: 'NewInviteLink', result: chat, type: Types.EMIT });
    });
    socket.on('NewChatUser', chat => {
        console.info('[w] Received NewChatUser: ', chat);
        postMessage({ action: 'NewChatUser', result: chat, type: Types.EMIT });
    });

    socket.on('NewReaction', reaction => {
        postMessage({ action: 'NewReaction', result: reaction, type: Types.EMIT });
    });
    socket.on('NewChatName', chat => {
        postMessage({ action: 'NewChatName', result: chat, type: Types.EMIT });
    });
    socket.on('LeftChatUser', chat => {
        postMessage({ action: 'LeftChatUser', result: chat, type: Types.EMIT });
    });

    socket.on('Alarm', alarm => {
        postMessage({ action: 'Alarm', result: alarm, type: Types.EMIT });
    });

    for (const method of METHODS) {
        socket.on(`${method}Result`, result => {
            console.info(`Received ${method}: ${result}`);
            postMessage({ action: method, result, type: Types.RESPONSE });
        });
    }
}

onmessage = e => {
    const action = e.data.action;
    if (action === 'auth' && !TOKEN) {
        TOKEN = e.data.token;
        init();

        return;
    }

    if (action === 'UploadAvatar') {
        uploadAvatar(e);

        return;
    }

    if (action === 'UploadImage') {
        uploadImage(e);

        return;
    }

    socket.emit(action, e.data.value);
};

function uploadAvatar(e) {
    const stream = ss.createStream();
    ss(socket).emit('UploadAvatar', stream);
    ss.createBlobReadStream(e.data.value).pipe(stream);
}


function uploadImage(e) {
    const stream = ss.createStream();
    ss(socket).emit('UploadImage', stream);
    ss.createBlobReadStream(e.data.value).pipe(stream);
}
