import React from 'react';
import { PropTypes } from 'mobx-react';
import ReactPropTypes from 'prop-types';
import uuid from 'uuid/v4';
import { observer } from 'mobx-react';
import styles from './index.css';

@observer
export default class ChatInput extends React.Component {
    constructor(props) {
        super(props);
        this.state = { chatInput: '' };
    }

    static propTypes = {
        chatHistories: PropTypes.observableArrayOf(PropTypes.observableObject),
        addMessage: ReactPropTypes.func,
        sendMessage: ReactPropTypes.func,
        chatId: ReactPropTypes.string,
        profile: PropTypes.observableObject
    };

    /* eslint-disable no-console */
    submitHandler(event) {
        const message = {
            from: this.props.profile._id,
            body: this.state.chatInput,
            id: uuid(),
            createdAt: Date.now(),
            editedAt: Date.now()
        };
        this.props.sendMessage({
            chatId: this.props.chatId,
            text: message.body
        });
        event.preventDefault();
        this.setState({ chatInput: '' });
    }

    textChangeHandler(event) {
        this.setState({ chatInput: event.target.value });
    }

    render() {
        return (
            <form id="send-message-form" className={styles.Wrapper}
                onSubmit={this.submitHandler.bind(this)}>
                <button type="button" className={`${styles.ImageButton} ${styles.Button}`}>
                    <i className="material-icons">image</i>
                </button>
                <input type="text" className={styles.Input}
                    value={this.state.chatInput}
                    placeholder=" Write a message..."
                    onChange={this.textChangeHandler.bind(this)}
                    autoFocus />
                <button type="button" className={`${styles.EmojiButton} ${styles.Button}`}>
                    <i className="material-icons">tag_faces</i>
                </button>
                <button form="send-message-form" type="submit"
                    className={`${styles.SendButton} ${styles.Button}`}>
                    <i className="material-icons">send</i>
                </button>
            </form>
        );
    }
}
