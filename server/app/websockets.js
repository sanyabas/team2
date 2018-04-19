'use strict';

const PassportMemStoreSessionGetter = require('./classes/PassportMemStoreSessionGetter');
const olesya = require('./tools/olesya');
const WebSocketServer = require('./classes/WebSocketServer');
const SendQueue = require('./classes/SendQueue');
const { queue } = require('async');
const { markdownIt } = require('./tools/markdown');
const { getHrefArray } = require('./tools/href');
const { openGraph } = require('./controllers/opengraph');
let LOGINS_CACHE = [];

const {
    ChatModel,
    UserModel,
    MessageModel
} = require('./models');
const sendQueue = new SendQueue();
const executeQueues = {};

module.exports = async function (app, sessionStore) {
    const sessionGetter = new PassportMemStoreSessionGetter(sessionStore);
    const wsServer = new WebSocketServer(app, sessionGetter);
    await updateLoginCache();
    console.info('Login cache ready!');
    setInterval(updateLoginCache, 300 * 1000);

    wsServer.on('authUserConnected', ({ socket, uid }) => {
        if (!executeQueues[uid]) {
            executeQueues[uid] = queue(async ({ action, data }, callback) => {
                try {
                    await action(data);
                } catch (error) {
                    console.error(error);
                }
                callback();
            });
        }

        socket.on('GetMessages', pushAction.bind(
            null,
            uid,
            execute.bind(null, socket, uid, GetMessages)
        ));
        socket.on('GetProfile', pushAction.bind(
            null,
            uid,
            execute.bind(null, socket, uid, GetProfile)
        ));
        socket.on('SearchByLogin', pushAction.bind(
            null,
            uid,
            execute.bind(null, socket, uid, SearchByLogin)
        ));
        socket.on('AddContact', pushAction.bind(null, uid, async (userId) => {
            try {
                const result = await addContact(uid, userId);

                result.users.forEach(user => {
                    wsServer.emitByUID(user._id, 'NewChat', result);
                });
            } catch (error) {
                console.error(error);
                socket.emitByUID(uid, 'AddContactResult', {
                    success: false,
                    error: error.message || error.body
                });
            }
        }));
        socket.on('DeleteProfile', pushAction.bind(
            null,
            uid,
            execute.bind(null, wsServer, uid, DeleteProfile)
        ));
        socket.on('GetChatList', pushAction.bind(
            null,
            uid,
            execute.bind(null, socket, uid, GetChatList)
        ));
        socket.on('SendMessage', pushAction.bind(null, uid, async ({ chatId, text }) => {
            try {
                const message = await sendMessage(uid, chatId, text);
                const chat = await ChatModel.findById(chatId).exec();

                wsServer.emitByUID(uid, 'SendMessageResult', {
                    success: true,
                    value: message
                });
                chat.users.forEach(userId => {
                    wsServer.emitByUID(userId, 'NewMessage', message);
                });
            } catch (error) {
                wsServer.emitByUID(uid, 'SendMessageResult', {
                    success: false,
                    error: error.message || error.body
                });
            }
        }));
        socket.on('AskOlesya', pushAction.bind(null, uid, async (text) => {
            try {
                const answer = await olesya.ask(text);
                const olesyaMessage = new MessageModel({ chat: 'olesya', body: answer });

                socket.emit('AskOlesyaResult', {
                    success: true,
                    value: olesyaMessage
                });
            } catch (error) {
                socket.emit('AskOlesyaResult', {
                    success: false,
                    error: error.message || error.body
                });
            }
        }));
        socket.on('disconnect', () => {
            if (wsServer.getUserConnectionsCount(uid) === 0) {
                delete executeQueues[uid];
            }
        });
    });
};

function pushAction(uid, action, data) {
    executeQueues[uid].push({ action, data });
}

async function execute(socket, uid, fn, data) {
    try {
        const result = await fn(uid, data);

        socket.emit(fn.name + 'Result', {
            success: true,
            value: result
        });
    } catch (error) {
        socket.emit(fn.name + 'Result', {
            success: false,
            error: error.message || error.body
        });
    }
}

async function sendMessage(uid, chatId, text) {
    const chat = await ChatModel.findById(chatId).exec();

    if (chat.users.indexOf(uid) === -1) {
        throw new Error('Not your chat!');
    }

    const hrefs = getHrefArray(text);

    const message = new MessageModel({
        chatId: chatId,
        from: uid,
        body: markdownIt(text)
    });

    sendQueue.push(chatId, message);

    if (hrefs.length) {
        try {
            const og = await openGraph(hrefs[0]);
            message.og = og;
        } catch (error) {
            console.error(error);
        }
    }

    return message;
}

async function DeleteProfile(uid) {
    return await UserModel.findByIdAndRemove(uid).exec();
}

async function GetMessages(uid, { chatId, offset, limit }) {
    const chat = await ChatModel.findById(chatId).exec();

    if (chat.users.indexOf(uid) === -1) {
        throw new Error('Not your chat!');
    }

    return {
        chatId,
        messages: await MessageModel
            .find({ chatId: chatId })
            .skip(offset || 0)
            .limit(limit || 0)
            .exec()
    };
}

async function GetProfile(uid, userId) {
    const user = await UserModel.findById(userId || uid).exec();

    return getProfileFromUser(user);
}

async function SearchByLogin(uid, login) {
    login = login.trim();

    if (!login.length) {
        throw new Error('Empty request!');
    }

    const me = await UserModel.findById(uid).exec();
    const foundUsers = await findLoginInCache(login, me);

    if (foundUsers.length !== 0) {
        return foundUsers;
    }

    return findLoginInDB(login, me);
}

async function addContact(uid, userId) {
    if (uid === userId) {
        throw new Error('You can\'t add yourself!');
    }

    const me = await UserModel.findById(uid).exec();
    if (me.contacts.indexOf(userId) !== -1) {
        throw new Error('You have this contact!');
    }
    const he = await UserModel.findById(userId);

    await me.addContact(userId);
    await he.addContact(uid);

    const chat = new ChatModel({
        dialog: true
    });
    await chat.save();

    await chat.addUser(uid);
    await chat.addUser(userId);

    await me.addChat(chat._id);
    await he.addChat(chat._id);

    return getChatForEmit(chat);
}

async function GetChatList(uid) {
    const user = await UserModel
        .findById(uid)
        .populate('chats')
        .exec();

    const result = [];
    for (const chat of user.chats) {
        try {
            const emitChat = await getChatForEmit(chat);

            result.push(emitChat);
        } catch (error) {
            console.error(`Can't find chat ${chat._id}`);
        }
    }

    return result;
}

async function getChatForEmit(chat) {
    const newChat = await ChatModel
        .findById(chat._id)
        .populate('users')
        .exec();

    return {
        _id: chat._id,
        name: chat.name,
        dialog: chat.dialog,
        users: newChat.users.map(getProfileFromUser)
    };
}

function getProfileFromUser(user) {
    return {
        _id: user._id,
        login: user.login,
        avatar: user.avatar
    };
}

async function updateLoginCache() {
    const iterator = UserModel.find({}).cursor();

    const newCache = [];
    let user = await iterator.next();
    while (user) {
        try {
            newCache.push(getProfileFromUser(user));
        } catch (error) {
            console.error(error.body);
        } finally {
            user = await iterator.next();
        }
    }

    LOGINS_CACHE = newCache;
}

async function findLoginInCache(str, me) {
    const foundUsers = [];

    for (const profile of LOGINS_CACHE) {
        const match = profile.login.toLowerCase().indexOf(str.toLowerCase()) !== -1;
        const notHave = me.contacts.indexOf(profile._id) === -1;
        const notMe = profile._id !== me._id;

        if (match && notHave && notMe) {
            foundUsers.push(profile);
        }
    }

    return foundUsers;
}

async function findLoginInDB(str, me) {
    const foundUsers = [];

    const usersIterator = UserModel.find({}).cursor();
    let user = await usersIterator.next();
    while (user) {
        const match = user.login.toLowerCase().indexOf(str.toLowerCase()) !== -1;
        const notHave = me.contacts.indexOf(user._id) === -1;
        const notMe = user._id !== me._id;

        if (match && notHave && notMe) {
            try {
                foundUsers.push(user);
            } catch (error) {
                console.error(error.message);
            }
        }
        user = await usersIterator.next();
    }

    return foundUsers;
}
