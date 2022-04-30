import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from "react-redux";

import 'antd/dist/antd.css';

import reportWebVitals from './reportWebVitals';

import Application from "./application";
import {store} from "./store";

import './index.css';

ReactDOM.render(
    <React.StrictMode>
        <Provider store={store}>
            <Application/>
        </Provider>
    </React.StrictMode>,
    document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
