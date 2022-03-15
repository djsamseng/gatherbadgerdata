import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route,  Routes, Link } from "react-router-dom";
import './index.css';
import App from './App';
import Prod from "./Prod";
import Lists from "./Lists";
import reportWebVitals from './reportWebVitals';

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <nav className='space-x-5 mx-5 p-3'>
        <Link className='hover:bg-gray-500 p-3' to="/">Home</Link>
        <Link className='hover:bg-gray-500 p-3' to="/prod">Prod</Link>
        <Link className='hover:bg-gray-500 p-3' to="/lists">Lists</Link>
      </nav>
      <Routes>
        <Route path="/" element={<App />}></Route>
        <Route path="/prod" element={<Prod />}></Route>
        <Route path="/lists" element={<Lists />}></Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
