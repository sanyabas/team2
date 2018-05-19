/* eslint-disable no-invalid-this */
import { observable, computed, action, autorun } from 'mobx';
import * as States from '../enum/LoadState';
import ChatListState from './states/ChatListState';
import ReactionSelectorState from './states/ReactionSelectorState';
import ChatCreateState from './states/ChatCreateState';
import AlarmState from './states/AlarmState';
import ChatsState from './states/ChatsState';
import MessageNotificationState from './states/MessageNotificationState';

export default class UIStore {

    constructor(dataStore) {
        this.FILE_SIZE_LIMIT = 2;
        this.FILE_FORMAT = ['image/jpg',
            'image/jpeg',
            'image/png',
            'image/gif',
            'jpg',
            'jpeg',
            'gif',
            'png'
        ];
        this.dataStore = dataStore;
        this.chatListState = new ChatListState(this.dataStore, this);
        this.chatsState = new ChatsState(this.dataStore, this, this.chatListState);
        this.chatCreateState = new ChatCreateState(this.dataStore);
        this.reactionSelectorState = new ReactionSelectorState(this.dataStore);
        this.alarmState = new AlarmState(this.dataStore);
        this.messageNotificationState =
            new MessageNotificationState(this.dataStore, this.chatListState);

        autorun(() => {
            if (dataStore.loadingState === States.LOADED && this.onLoadQueue.length) {
                this.onLoadQueue.pop()();
            }
        });

        autorun(() => {
            if (this.dataStore.profile.avatar) {
                this.loadAvatar = false;
            }
        });
    }

    @observable onLoadQueue = [];
    @observable error = '';

    @observable loadAvatar = false;


    @observable mainView = {
        showContacts: true,
        showChat: true,
        showProfile: false,
        isNightTheme: localStorage.getItem('isNightTheme') === 'true'
    };

    @action toggleNightMode = () => {
        this.mainView.isNightTheme = !this.mainView.isNightTheme;
        localStorage.setItem('isNightTheme', this.mainView.isNightTheme);
    }

    @computed
    get loaderState() {
        return getLoaderState(this.dataStore.loadingState);
    }

    @computed
    get chatState() {
        return this.chatsState.chatState;
    }

    @computed
    get chatInputState() {
        return this.chatsState.chatState.inputState;
    }

    @computed
    get chatPreviewState() {
        return this.chatsState.chatState.previewState;
    }

    @computed
    get profile() {
        return this.dataStore.profile;
    }

    @action uploadAvatar = (file) => {

        let fileFormat = false;
        if (this.FILE_FORMAT.indexOf(file.type) === -1) {
            fileFormat = true;
        }

        if (fileFormat) {
            this.error = 'This file fomat isn`t supported';

            return;
        }

        if (file.size >= this.FILE_SIZE_LIMIT * 1024 * 1024) {
            this.error = `Only ${this.FILE_SIZE_LIMIT}MB files can be loaded`;

            return;
        }
        this.loadAvatar = true;
        this.dataStore.uploadAvatar(file);
    };

    @action toggleProfile = () => {
        this.mainView.showProfile = !this.mainView.showProfile;
    };

    @action clearError = () => {
        this.error = '';
    };

    @action showProfile = () => {
        this.mainView.showProfile = true;
    };

    @action closeProfile = () => {
        this.mainView.showProfile = false;
    };

    @action addAttachment = (attachment) => {
        this.chatsState.addAttachment(attachment);
    };

    @action setSearchResults = (searchResults) => {
        this.chatListState.inSearch = false;
        if (searchResults) {
            this.chatListState.searchResults = searchResults
                .filter(chat => chat.login !== this.dataStore.profile.login);
        } else {
            this.chatListState.searchResults = [];
        }
    };

    @action setCurrentChat = chat => {
        this.chatListState.currentChat = chat;
    }
}

function getLoaderState(loadingState) {
    let loaderState;
    let message = '';

    switch (loadingState) {
        case States.LOADED:
            loaderState = false;
            break;
        case States.LOAD_CONTACTS:
            loaderState = true;
            message = 'Loading contacts';
            break;
        case States.LOAD_PROFILE:
            loaderState = true;
            message = 'Loading profile';
            break;
        case States.ADD_CONTACT:
            loaderState = true;
            message = 'Adding contact';
            break;
        case States.ADD_CHAT:
            loaderState = true;
            message = 'Creating chat';
            break;
        default:
            break;
    }

    return { loaderState, message };
}
