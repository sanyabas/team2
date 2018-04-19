/* eslint-disable no-console */
import React from 'react';
import ReactDOM from 'react-dom';

import App from './components/App';
import Store from './store/Store';
import { WorkerWrapper } from './websocket/worker-wrapper';
import * as States from './enum/LoadState';

const store = new Store();
const worker = new WorkerWrapper(store);

worker.subscribe('SearchByLogin', (error, result) => {
    store.loadingState = States.LOADED;
    console.info('result: ');
    console.info(result);
    console.info(error);
    store.searchResult = result;
});
worker.subscribe('DeleteProfile', (error, result) => {
    console.info(result);
    console.info(error);
});
worker.subscribe('NewMessage', (error, result) => {
    console.info('new message', error, result);
    const history = store
        .chatHistories
        .find(h => h.chatId === result.chatId);
    history.messages.push(result);

    store.chatHistories = store
        .chatHistories
        .filter(h => h.chatId !== result.chatId)
        .concat([history]);
});
worker.subscribe('SendMessage', (error, result) => {
    console.info('result: ');
    console.info(result);
    console.info(error);
});
worker.subscribe('GetProfile', (error, profile) => {
    store.loadingState = States.LOAD_CONTACTS;
    console.info('err', error, profile);
    store.profile = profile;
    worker.getChatList();
});
worker.subscribe('GetChatList', (error, chats) => {
    chats.forEach(chat => {
        worker.getMessages({
            chatId: chat._id,
            offset: 0,
            limit: 50
        });
    });
    store.chats = store.chats.concat(chats.map(initChat));
    store.loadingState = States.LOADED;
    console.info('chats: ', chats);
});

function initChat(chat) {
    if (!chat) {
        return;
    }
    console.info('chat: ', chat);
    const user = chat.users.find(entry => entry._id !== store.profile._id);
    console.info(chat, store.profile._id);
    chat.avatar = user.avatar;
    chat.name = user.login;

    return chat;
}

worker.subscribe('GetMessages', (error, data) => {
    if (!data) {
        return;
    }
    const chatHistory = store.chatHistories
        .find(history => history.chatId === data.chatId);
    if (chatHistory) {
        chatHistory.messages.push(...data.messages);
    } else {
        store.chatHistories.push({
            chatId: data.chatId,
            messages: data.messages
        });
    }
    console.info('store.chatHistories: ');
    console.info(store.chatHistories);
});

/* eslint-disable handle-callback-err */
worker.subscribe('AddContact', (err, chat) => {
    store.chats = store.chats.concat([initChat(chat)]);
    store.chatHistories = store.chatHistories.concat([{ chatId: chat._id, messages: [] }]);
});

worker.subscribe('AskOlesya', (err, message) => {
    const history = store
        .chatHistories
        .find(h => h.chatId === 'olesya');
    history.messages.push(message);

    store.chatHistories = store
        .chatHistories
        .filter(h => h.chatId !== 'olesya')
        .concat([history]);
});


worker.subscribe('NewChat', (err, chat) => {
    store.loadingState = States.LOADED;
    store.chats = store.chats.concat([initChat(chat)]);
    store.chatHistories = store.chatHistories.concat([{ chatId: chat._id, messages: [] }]);
});

ReactDOM.render(<App store={store} worker={worker}/>, document.getElementById('root'));
