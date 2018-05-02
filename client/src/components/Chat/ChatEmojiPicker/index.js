import React, { Component } from 'react';
import ReactPropTypes from 'prop-types';
import styles from './index.css';
import EmojiPicker from 'emoji-picker-react';

export default class ChatEmojiPicker extends Component {
    constructor(props) {
        super(props);
    }

    static propTypes = {
        onEmojiClick: ReactPropTypes.func,
        onMouseLeave: ReactPropTypes.func
    };

    render() {
        return (
            <div className={styles.Wrapper}
                onMouseLeave={this.props.onMouseLeave}>
                <EmojiPicker onEmojiClick={this.props.onEmojiClick}/>
            </div>
        );
    }
}
