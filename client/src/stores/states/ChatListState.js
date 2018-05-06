/* eslint-disable no-invalid-this */
import { observable, action, computed } from 'mobx';
import * as States from '../../enum/LoadState';

export default class ChatListState {
    constructor(dataStore, state) {
        this.dataStore = dataStore;
        this.state = state;
    }

    @observable searchInput = '';
    @observable searchResults = [];
    @observable currentChat = {};
    @observable inSearch = false;
    @observable isCreating = false;

    @action selectChat = (chat) => {
        this.currentChat = chat;
    };

    @action closeChat = () => {
        this.currentChat = {};
    };

    @action selectChatByName = (name) => {
        if (this.dataStore.loadingState !== States.LOADED) {
            this.state.onLoadQueue.push(this.selectChatByName.bind(this, name));

            return;
        }
        this.currentChat = this.chatsToDisplay.find(chat => chat.name === name) || {};
    };

    @action joinChat = link => {
        if (this.dataStore.loadingState !== States.LOADED) {
            this.state.onLoadQueue.push(this.joinChat.bind(this, link));

            return;
        }

        this.dataStore.joinChat(link);
        // this.currentChat = this.chatsToDisplay.find(chat => chat.inviteLink === link);
    };

    @action change = (inputText) => {
        this.searchInput = inputText;
        this.inSearch = true;
        this.dataStore.searchByLogin(this.searchInput);
    };

    @action addContact = (login) => {
        this.dataStore.addContact(this.searchResults
            .find(chat => chat.login === login)._id);

        this.searchResults = this.searchResults
            .filter(chat => chat.login !== login);
    };

    @action toggleCreating = () => {
        this.isCreating = !this.isCreating;
    };


    @computed
    get searchResultsToDisplay() {
        return this.searchResults ? this.searchResults : [];
    }

    @computed
    get chatsToDisplay() {
        return this.dataStore.chatList.filter(chat => {
            return chat.name.toLowerCase()
                .indexOf(this.searchInput.toLowerCase()) !== -1;
        }).map(chat => {
            chat.lastMessage = this.dataStore.getLastChatMessage(chat);

            return chat;
        });
    }

    @computed
    get currentPath() {
        if (this.currentChat.name) {
            return `#/im/${this.currentChat.name}`;
        }

        return '#/im';
    }

    @computed
    get isCreatingChat() {
        return this.isCreating;
    }

}
