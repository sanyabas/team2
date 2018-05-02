/* eslint-disable no-invalid-this */
import { observable, action } from 'mobx';
import { emojiIndex } from 'emoji-mart';

export default class ChatInputState {

    constructor(state, dataStore) {
        this.state = state;
        this.dataStore = dataStore;
    }

    @observable chatInput = '';
    @observable showEmojiList = false;

    @action toggleEmojiList = () => {
        this.showEmojiList = !this.showEmojiList;
    };

    @action change = (inputText) => {
        this.chatInput = inputText;
    };

    @action submit = () => {
        if (!this.chatInput) {
            return;
        }
        this.dataStore.sendMessage({
            chatId: this.state.chatState.currentChat._id,
            text: this.chatInput
        });
        this.chatInput = '';
    };

    findEmoji = id => emojiIndex.search(id)
        .filter(x => x.id === id)
        .map(x => x.native);

    addEmojiIntoText(_, emojiValue) {
        this.chatInput += `${this.findEmoji(emojiValue.name)}`;
    }
}
