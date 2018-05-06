/* eslint-disable no-console */
/* eslint-disable max-statements */
import DataStore from './DataStore';
import UIStore from './UIStore';
import * as States from '../enum/LoadState';

export default class RootStore {
    constructor(webWorker) {
        this.dataStore = new DataStore(webWorker);
        this.state = new UIStore(this.dataStore, webWorker);
        initWorker(webWorker, this.dataStore, this.state);
    }
}

function initWorker(webWorker, dataStore, state) {
    webWorker.subscribe('SearchByLogin', (error, result) => {
        if (error) {
            console.info(error);

            return;
        }

        dataStore.setLoadingState(States.LOADED);
        state.setSearchResults(result);
    });

    webWorker.subscribe('DeleteProfile', (error) => {
        if (error) {
            console.info(error);
        }
    });

    webWorker.subscribe('SendReaction', (err) => {
        console.info(err);
    });

    webWorker.subscribe('NewReaction', (error, result) => {
        dataStore.addReaction(result);
    });

    webWorker.subscribe('SendMessage', (error, result) => {
        dataStore.messageDidSent(result);
        if (error) {
            console.info(error);
        }
    });

    webWorker.subscribe('GetProfile', (error, profile) => {
        if (error) {
            console.info(error);

            return;
        }

        dataStore.setProfile(profile);
        dataStore.loadChatList();
    });

    webWorker.subscribe('UploadImage', (error, result) => {
        if (error) {
            console.info(error);
        }

        state.addAttachment(result);
    });

    webWorker.subscribe('Alarm', (error, alarm) => {
        console.log(alarm);
        state.alarmState.alarm(alarm.message);
    });

    webWorker.subscribe('UploadAvatar', (error, result) => {
        if (error) {
            console.info(error);
        }

        dataStore.setAvatar(result);
    });

    webWorker.subscribe('NewMessage', (error, result) => {
        if (error) {
            console.info(error);

            return;
        }

        dataStore.addMessage(result);
    });

    webWorker.subscribe('GetChatList', (error, chats) => {
        if (error) {
            console.info('error: ', error);

            return;
        }

        chats.forEach(chat => {
            webWorker.getMessages({
                chatId: chat._id,
                offset: 0,
                limit: 50
            });
        });
        dataStore.addChats(chats);
        dataStore.setLoadingState(States.LOADED);
        dataStore.restoreMessagesForSend();
    });

    webWorker.subscribe('GetMessages', (error, data) => {
        if (!data || error) {
            console.info('error: ', error);

            return;
        }

        dataStore.setChatHistory(data.chatId, data.messages, data.totalCount);
    });

    webWorker.subscribe('AddContact', (error, chat) => {
        if (error) {
            console.info('error: ', error);

            return;
        }

        dataStore.setLoadingState(States.LOADED);
        dataStore.addChats([chat]);
    });

    webWorker.subscribe('NewChat', (error, chat) => {
        if (error) {
            console.info('error: ', error);

            return;
        }

        dataStore.setLoadingState(States.LOADED);
        dataStore.addChats([chat]);
    });

    webWorker.subscribe('CreateChat', (error, chat) => {
        if (error) {
            console.error(`CreateChat error: ${error}`);
        }

        console.info(`CreateChat: ${chat}`);
    });

    webWorker.subscribe('GetContactList', (error, contacts) => {
        if (error) {
            console.error(`GetContactList error: ${error}`);
        }

        dataStore.setLoadingState(States.LOADED);
        dataStore.setContacts(contacts);
    });

    webWorker.subscribe('NewChatUser', (error, chat) => {
        if (error) {
            console.error(`New chat user error: ${error}`);
        }
        console.info('New chat user');
        dataStore.userJoined(chat);
    });

    webWorker.subscribe('JoinChat', (error, chat) => {
        if (error) {
            console.error('Join error', error);
        }

        dataStore.setLoadingState(States.LOADED);
        console.info(chat);
        dataStore.addChats([chat]);
        webWorker.getMessages({ chatId: chat._id, limit: 50, offset: 0 });
        state.setCurrentChat(chat);
    });

}
