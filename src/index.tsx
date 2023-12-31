import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import App, {ErrorScreen, LoadingScreen} from './App';
import reportWebVitals from './reportWebVitals';
import {createBrowserRouter, RouterProvider} from "react-router-dom";
import {loader} from "./Menu";
import {Action, ChooseProfile, ErrorElement, loader as actionLoader} from "./action";
import figlet from "figlet";

// create router
const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        loader: loader,
        errorElement: <ErrorScreen />,
        children: [
            {
                path: ':id',
                loader: actionLoader,
                element: <Action />,
                errorElement: <ErrorElement />,
                children: [
                    {
                        path: 'profile',
                        element: <ChooseProfile />,
                        errorElement: <ErrorElement />,
                    }
                ]
            }
        ]
    }
])

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

figlet.defaults({fontPath: "/ascii-fonts"});
figlet.text('Cocomine VPN Manager', {
    font: 'ANSI Shadow',
    horizontalLayout: 'full',
    verticalLayout: 'full',
    width: 80,
    whitespaceBreak: true
}, function (err, data) {
    if (err) {
        console.error(err);
        return;
    }
    console.log(data);
    console.log("App version: 1.7.1")
});

root.render(
    <React.StrictMode>
        <RouterProvider router={router} fallbackElement={<LoadingScreen display={true}/>} />
    </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
