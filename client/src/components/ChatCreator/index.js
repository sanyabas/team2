import React, { Component } from 'react';
import { PropTypes } from 'mobx-react';
import ReactPropTypes from 'prop-types';
import { observer } from 'mobx-react';
import SearchResults from './SearchResults';
import Contact from '../Contact';
import styles from './index.css';

@observer
export default class ChatList extends Component {

    static propTypes = {
        chats: PropTypes.observableArray,
        chatInput: ReactPropTypes.string,
        children: ReactPropTypes.array,
        addContact: ReactPropTypes.func,
        searchByLogin: ReactPropTypes.func,
        chooseOlesya: ReactPropTypes.func,
        searchResult: PropTypes.observableArray
    };

    constructor(props) {
        super(props);
        this.state = {
            chats: this.props.chats
        };
    }

    filteredList(event) {
        const res = this.props.chats.filter(chat => {
            return chat.name.toLowerCase().search(event.target.value) !== -1;
        });

        this.props.searchByLogin(event.target.value);

        this.setState({ chatInput: event.target.value });
        this.setState({ chats: res });
    }

    addContact(event) {
        event.preventDefault();
        this.props.addContact(this.state.chatInput);
        this.setState({ chatInput: '' });
    }

    render() {
        return (
            <div className={styles.Wrapper}>
                <div className={styles.Wrappers}>
                    <form className={styles.SearchForm} onSubmit={this.addContact.bind(this)}>
                        <input placeholder="Search" className={styles.SearchInput}
                            value={this.state.chatInput}
                            onChange={this.filteredList.bind(this)}/>
                    </form>
                    {this.props.children}
                    <SearchResults>
                        {this.props.searchResult &&
                        this.props.searchResult.map(result =>
                            <Contact
                                key={result._id}
                                login={result.login}
                                avatar={result.avatar}
                                withSelect={false}
                                onClick={() => this.props.addContact(result._id)}/>
                        )}
                    </SearchResults>
                </div>
            </div>
        );
    }
}
