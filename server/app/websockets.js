/* eslint-disable max-statements */
/* eslint-disable max-nested-callbacks */
'use strict';

const { readFileSync } = require('fs');
const mongoose = require('mongoose');
const PassportMemStoreSessionGetter = require('./classes/PassportMemStoreSessionGetter');
const olesya = require('./tools/olesya');
const WebSocketServer = require('./classes/WebSocketServer');
const SendQueue = require('./classes/SendQueue');
const { queue } = require('async');
const parseMarkdown = require('./tools/parse-markdown');
const getUrls = require('./tools/get-urls');
const opengraph = require('./tools/opengraph');
const GithubAvatar = require('./tools/github-avatar');
const cloudinary = require('./tools/cloudinary');
const ss = require('socket.io-stream');
const config = require('config');
const { URL } = require('url');

const {
    ChatModel,
    UserModel,
    MessageModel,
    AlarmModel
} = require('./models');
const sendQueue = new SendQueue();
const executeQueues = {};
const emojiJSON = JSON.parse(readFileSync('./emoji.json', 'utf8'));
const emojiArray = Object
    .keys(emojiJSON.emojis)
    .map(n => emojiJSON.emojis[n].u);

module.exports = async function (app, sessionStore) {
    const sessionGetter = new PassportMemStoreSessionGetter(sessionStore);
    const wsServer = new WebSocketServer(app, sessionGetter);
    await initAlarms(wsServer);

    // eslint-disable-next-line max-statements
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
        ss(socket).on('UploadImage', (stream) => {
            const cloud = cloudinary.createCloudStream(res => {
                socket.emit('UploadImageResult', {
                    success: true,
                    value: res.url
                });
            });
            stream.pipe(cloud);
        });
        ss(socket).on('UploadAvatar', (stream) => {
            const cloud = cloudinary.createCloudStream(async res => {
                try {
                    await UserModel.update({ _id: uid }, { $set: { avatar: res.url } }).exec();
                } catch (err) {
                    socket.emit('UploadAvatarResult', {
                        success: false,
                        value: err
                    });
                }
                socket.emit('UploadAvatarResult', {
                    success: true,
                    value: res.url
                });
            });
            stream.pipe(cloud);
        });
        socket.on('AddContact', pushAction.bind(null, uid, async (userId) => {
            try {
                const result = await addContact(uid, userId);

                result.users.forEach(user => {
                    wsServer.emitByUID(user._id, 'NewChat', result);
                });
            } catch (error) {
                console.error(error);
                wsServer.emitByUID(uid, 'AddContactResult', {
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
        socket.on('SetAlarm',
            pushAction.bind(null, uid, async ({ time, messageId, now }) => {
                try {
                    const alarm = await setAlarm(uid, time, messageId, now);
                    initAlarm(wsServer, alarm);

                    socket.emit('SetAlarmResult', {
                        success: true,
                        result: {
                            time,
                            messageId,
                            now
                        }
                    });
                } catch (error) {
                    wsServer.emitByUID(uid, 'SetAlarmResult', {
                        success: false,
                        error: error.message || error.body
                    });
                }
            }));
        socket.on('SendReaction',
            pushAction.bind(null, uid, async ({ code, messageId }) => {
                try {
                    const result = await addReaction(uid, messageId, code);

                    socket.emit('SendReactionResult', {
                        success: true,
                        result: {
                            chatId: result.chat._id,
                            messageId: messageId,
                            uid,
                            code
                        }
                    });
                    result.chat.users.forEach(userId => {
                        wsServer.emitByUID(userId, 'NewReaction', {
                            uid,
                            chatId: result.chat._id,
                            messageId,
                            code
                        });
                    });
                } catch (error) {
                    wsServer.emitByUID(uid, 'AddReactionResult', {
                        success: false,
                        error: error.message || error.body
                    });
                }
            }));
        socket.on('SendMessage', pushAction
            .bind(null, uid, async ({ chatId, text, tempId, attachments }) => {
                try {
                    const message = await sendMessage(uid, chatId, text, attachments);
                    const chat = await ChatModel.findById(chatId).exec();

                    wsServer.emitByUID(uid, 'SendMessageResult', {
                        success: true,
                        value: Object.assign(message.toObject(), {
                            tempId
                        })
                    });
                    chat
                        .users
                        .filter(userId => userId.toString() !== uid)
                        .forEach(userId => {
                            wsServer.emitByUID(userId, 'NewMessage', message);
                        });

                    if (chat.containsUser('OlesyaUserId')) {
                        const answer = await getOlesyaMessage(chat, text);
                        chat.users.forEach(userId => {
                            wsServer.emitByUID(userId, 'NewMessage', answer);
                        });
                    }
                } catch (error) {
                    wsServer.emitByUID(uid, 'SendMessageResult', {
                        success: false,
                        error: error.message || error.body
                    });
                }
            }));
        socket.on('CreateChat', pushAction.bind(null, uid, async userIds => {
            try {
                const allUserIds = userIds.concat([uid]);
                const result = await createChat(allUserIds);

                socket.emit('CreateChatResult', {
                    success: true,
                    value: result
                });

                for (const userId of allUserIds) {
                    wsServer.emitByUID(userId, 'NewChat', result);
                }
            } catch (error) {
                console.error(error);
                socket.emit('CreateChatResult', {
                    success: false,
                    error: error.message || error.body
                });
            }
        }));

        socket.on('RevokeLink', pushAction.bind(
            null,
            uid,
            async chatId => {
                try {
                    const chat = await revokeLink(chatId);

                    socket.emit('RevokeLinkResult', {
                        success: true,
                        value: chat.inviteLink
                    });

                    for (const userId of chat.users) {
                        wsServer.emitByUID(userId, 'NewInviteLink', chat);
                    }
                } catch (error) {
                    socket.emit('RevokeLinkResult', {
                        success: false,
                        error: error.message || error.body
                    });
                }
            }));

        socket.on('GetContactList', pushAction.bind(
            null,
            uid,
            execute.bind(null, socket, uid, GetContactList)));

        socket.on('JoinChat', pushAction.bind(
            null, uid, async link => {
                try {
                    const chat = await joinChat(link, uid);
                    socket.emit('JoinChatResult', {
                        success: true,
                        value: chat
                    });

                    for (const anotherUser of chat.users
                        .map(user => user._id)
                        .filter(userId => userId.toString() !== uid)) {
                        wsServer.emitByUID(anotherUser, 'NewChatUser', chat);
                    }
                } catch (error) {
                    console.error(error);
                    socket.emit('JoinChatResult', {
                        success: false,
                        error: error.message || error.body
                    });
                }
            }
        ));

        socket.on('RenameChat', pushAction.bind(null, uid, async ({ chatId, name }) => {
            try {
                const chat = await renameChat(chatId, name);

                socket.emit('RenameChatResult', {
                    success: true,
                    value: chat
                });

                for (const userId of chat.users
                    .map(user => user._id)) {
                    wsServer.emitByUID(userId, 'NewChatName', chat);
                }
            } catch (error) {
                console.error(error);
                socket.emit('RenameChatResult', {
                    success: false,
                    error: error.message || error.body
                });
            }
        }));

        socket.on('LeaveChat', pushAction.bind(null, uid, async chatId => {
            try {
                const chat = await leaveChat(uid, chatId);

                socket.emit('LeaveChatResult', {
                    success: true,
                    value: chat
                });

                for (const userId of chat.users
                    .map(user => user._id)) {
                    wsServer.emitByUID(userId, 'LeftChatUser', chat);
                }
            } catch (error) {
                console.error(error);
                socket.emit('LeaveChatResult', {
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
    }
    )
    ;
}
;

async function initAlarms(wsServer) {
    const time = Date.now();
    const alarms = await AlarmModel.find();

    const alarmsForRemove = alarms
        .filter(a => a.time < time + a.delta)
        .map(a => a._id);

    await AlarmModel.deleteMany({ _id: { $in: alarmsForRemove } }).exec();

    alarms
        .filter(a => alarmsForRemove.indexOf(a._id) === -1)
        .forEach(initAlarm.bind(null, wsServer));
}

function initAlarm(wsServer, alarm) {
    const time = Date.now();
    const timeout = alarm.time - (time + alarm.delta);

    setTimeout(async () => {
        const message = await MessageModel.findById(alarm.messageId);
        wsServer.emitByUID(alarm.userId, 'Alarm', {
            message,
            alarm: alarm
        });
        await alarm.remove();
    }, timeout);
}

function pushAction(uid, action, data) {
    executeQueues[uid].push({ action, data });
}

async function execute(socket, uid, fn, data) {
    try {
        const result = await fn(uid, data);
        console.info(`Emitting ${fn.name}`);
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

async function setAlarm(uid, time, messageId, now) {
    const timeOnServer = Date.now();

    const alarm = new AlarmModel({
        userId: uid,
        messageId,
        time,
        delta: timeOnServer - now
    });

    await alarm.save();

    return alarm;
}

async function getOlesyaMessage(chat, text) {
    const answer = await olesya.ask(text);

    return await sendMessage(mongoose.Types.ObjectId('OlesyaUserId'), chat._id, answer);
}

async function addReaction(uid, messageId, code) {
    const message = await MessageModel.findById(messageId);
    const chat = await ChatModel.findById(message.chatId);

    if (chat.users.indexOf(uid) === -1) {
        throw new Error('Not your chat!');
    }

    if (emojiArray.indexOf(code) === -1) {
        throw new Error('This is not one emoji!');
    }

    const executeObj = getAddReactionObject(uid, code, message);

    await MessageModel.update(
        { _id: messageId },
        executeObj,
    ).exec();

    return {
        chat,
        message,
        uid
    };
}

async function sendMessage(uid, chatId, text, attachments) {
    const chat = await ChatModel.findById(chatId);
    const user = await UserModel.findById(uid);

    if (chat.users.indexOf(uid) === -1) {
        throw new Error('Not your chat!');
    }

    const urls = getUrls(text);

    const message = new MessageModel({
        chatId: chatId,
        from: uid,
        fromLogin: user.login,
        body: parseMarkdown(text),
        attachments
    });

    sendQueue.push(chatId, message);

    if (urls) {
        try {
            const og = await opengraph(urls[0]);
            message.og = og;
        } catch (error) {
            console.error(error);
        }
    }

    await message.save();

    return message;
}

async function DeleteProfile(uid) {
    return await UserModel.findByIdAndRemove(uid).exec();
}

async function GetMessages(uid, { chatId, offset, limit }) {
    const chat = await ChatModel.findById(chatId);

    if (chat.users.indexOf(uid) === -1) {
        throw new Error('Not your chat!');
    }

    return {
        chatId,
        messages: (await MessageModel
            .find({ chatId: chatId })
            .sort({ createdAt: -1 })
            .skip(offset || 0)
            .limit(limit || 0)
            .exec())
            .reverse(),
        totalCount: await MessageModel
            .find({ chatId: chatId })
            .count({})
    };
}

async function GetProfile(uid, userId) {
    const user = await UserModel.findById(userId || uid);

    return getProfileFromUser(user);
}

async function SearchByLogin(uid, login) {
    login = login.trim();

    if (!login.length) {
        throw new Error('Empty request!');
    }

    const me = await UserModel.findById(uid);
    let foundUsers = await UserModel.find({ login: new RegExp(login, 'i') });

    foundUsers = foundUsers.filter(user => me.contacts.indexOf(user._id) === -1);

    return foundUsers.map(getProfileFromUser);
}

async function addContact(uid, userId) {
    if (uid === userId) {
        throw new Error('You can\'t add yourself!');
    }

    const me = await UserModel.findById(uid);
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
            console.error(`Can't find chat ${chat._id} ${error}`);
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
        avatar: chat.avatar,
        users: newChat.users.map(getProfileFromUser),
        inviteLink: new URL(`join/${chat.inviteLink}`, config.get('host'))
    };
}

function getProfileFromUser(user) {
    return {
        _id: user._id,
        login: user.login,
        avatar: user.avatar
    };
}

function getAddReactionObject(uid, code, message) {
    const executeObj = {};
    if (message.reactions[code] && message.reactions[code].some(r => r.uid === uid)) {
        if (message.reactions[code].filter(r => r.uid !== uid).length === 0) {
            executeObj.$unset = {};
            executeObj.$unset[`reactions.${code}`] = 1;
        } else {
            executeObj.$pull = {};
            executeObj.$pull[`reactions.${code}`] = { uid };
        }
    } else {
        executeObj.$push = {};
        executeObj.$push[`reactions.${code}`] = {
            uid,
            code
        };
    }

    return executeObj;
}

async function GetContactList(uid) {
    const me = await UserModel
        .findById(uid)
        .populate('contacts')
        .exec();

    return me.contacts.map(getProfileFromUser);
}

async function createChat(allUserIds) {
    const users = await UserModel.find({ _id: { $in: allUserIds } });
    const chatName = users.map(user => user.login).join(', ');
    let chat = new ChatModel({
        name: chatName,
        dialog: false,
        users: allUserIds
    });

    await chat.save();

    const randomstring = require('randomstring');

    await chat.update({
        $set: {
            inviteLink: randomstring.generate(),
            avatar: new GithubAvatar(chat._id.toString(), 200).toImgSrc()
        }
    }).exec();

    chat = await ChatModel.findById(chat._id);

    for (const user of users) {
        await user.addChat(chat._id);
    }

    return await getChatForEmit(chat);
}

async function revokeLink(chatId) {
    const chat = await ChatModel.findById(chatId).exec();
    await chat.generateInviteLink();

    return chat;
}

async function joinChat(link, uid) {
    const chat = await ChatModel.findOne({ inviteLink: link });
    if (!chat) {
        throw new Error('Chat not found');
    }
    if (chat.containsUser(uid)) {
        throw new Error('User already in the chat');
    }
    await chat.addUser(uid);
    const allUserIds = chat.users.concat([uid]);
    const users = await UserModel.find({ _id: { $in: allUserIds } });
    await chat.rename(users.map(user => user.login).join(', '));
    users.find(user => user._id.toString() === uid).addChat(chat._id);

    return await getChatForEmit(chat);
}

async function renameChat(chatId, name) {
    const chat = await ChatModel.findById(chatId);
    if (!chat) {
        throw new Error('Chat not found');
    }
    name = name.trim();
    if (!name) {
        throw new Error('Name is empty');
    }
    await chat.rename(name);

    return await getChatForEmit(chat);
}

async function leaveChat(uid, chatId) {
    const chat = await ChatModel.findById(chatId);
    if (!chat || !chat.containsUser(uid)) {
        throw new Error('User doesn\'t belong to the chat');
    }
    await chat.deleteUser(uid);
    const newUsers = chat.users.filter(userId => userId.toString !== uid);
    const users = await UserModel.find({ _id: { $in: newUsers } });
    await chat.rename(users.map(user => user.login).join(', '));
    users.find(user => user._id.toString() === uid).deleteChat(chat._id);

    const chatToEmit = await getChatForEmit(chat);

    if (!chatToEmit.users.length) {
        await chatToEmit.remove();
    }

    return chatToEmit;

}
