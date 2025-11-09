import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx';

console.log('--- main.jsx START ---');
window._ = _;

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
console.log('--- main.jsx END ---');
