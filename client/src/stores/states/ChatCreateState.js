/* eslint-disable no-invalid-this */
import { observable, action, computed } from 'mobx';

export default class ChatCreateState {
    constructor(dataStore) {
        this.dataStore = dataStore;
    }

    @observable selectedContacts = [];

    getIndex(contact) {
        return this.selectedContacts.findIndex(selected => selected._id === contact._id);
    }

    @action toggleContactForChat = (contact) => {
        const index = this.getIndex(contact);
        if (index !== -1) {
            this.selectedContacts.splice(index, 1);
        } else {
            this.selectedContacts.push(contact);
        }
    };

    @action createChat = () => {
        if (!this.selectedContacts.length) {
            return;
        }
        this.dataStore.createChat(Array.from(this.selectedContacts).map(contact => contact._id));
        this.isCreating = false;
        this.selectedContacts.clear();
    };

    @action clearSelected = () => {
        this.selectedContacts.clear();
    };

    @computed
    get contactsForChat() {
        return this.selectedContacts;
    }
}
