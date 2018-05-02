import React from 'react';
import { PropTypes } from 'mobx-react';
import { observer, inject } from 'mobx-react';
import styles from './index.css';
import ChatEmojiPicker from '../ChatEmojiPicker';

@inject('chatInputState') @observer
export default class ChatInput extends React.Component {
    constructor(props) {
        super(props);
    }

    static propTypes = {
        chatInputState: PropTypes.observableObject
    };

    submitHandler(event) {
        this.props.chatInputState.submit();
        event.preventDefault();
    }

    changeHandler(event) {
        this.props.chatInputState.change(event.target.value);
    }

    emojiButtonClick() {
        this.props.chatInputState.toggleEmojiList();
        this.chatInput.focus();
    }

    render() {
        return (
            <div>
                {this.props.chatInputState.showEmojiList
                    ? <ChatEmojiPicker
                        onEmojiClick={this.props.chatInputState.addEmojiIntoText
                            .bind(this.props.chatInputState)}
                        onMouseLeave={this.props.chatInputState.toggleEmojiList
                            .bind(this.props.chatInputState)}/>
                    : null}
                <form id="send-message-form" className={styles.Wrapper}
                    onSubmit={this.submitHandler.bind(this)}>
                    <button type="button" className={`${styles.ImageButton} ${styles.Button}`}>
                        <i className="material-icons">image</i>
                    </button>
                    <input type="text" className={styles.Input}
                        value={this.props.chatInputState.chatInput}
                        placeholder=" Write a message..."
                        onChange={this.changeHandler.bind(this)}
                        ref={(input) => {
                            this.chatInput = input;
                        }}
                        autoFocus/>
                    <button type="button" className={`${styles.EmojiButton} ${styles.Button}`}
                        onClick={this.emojiButtonClick.bind(this)}>
                        <i className="material-icons">tag_faces</i>
                    </button>
                    <button form="send-message-form" type="submit"
                        className={`${styles.SendButton} ${styles.Button}`}>
                        <i className="material-icons">send</i>
                    </button>
                </form>
            </div>
        );
    }
}
