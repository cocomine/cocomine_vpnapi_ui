import React, {CSSProperties, useCallback, useEffect, useMemo, useState} from 'react';
import './App.scss';
import {Col, Container, Row} from "react-bootstrap";
import {fetchVPNData, Menu, userProfile, VMData} from "./Menu";
import loading from "./assets/loading.svg";
import {toast, ToastContainer} from "react-toastify";
import {isRouteErrorResponse, Outlet, useLoaderData, useLocation, useNavigation, useRouteError} from "react-router-dom";
import Lottie from "lottie-react";

const NODE_ENV = process.env.NODE_ENV || 'development';
let API_URL: string;
if (NODE_ENV === 'development') {
    console.log("Development mode")
    API_URL = "http://localhost:8088" //for test
} else {
    console.log("Production mode")
    API_URL = "https://vpn.cocomine.cc/api" //for production
}

interface IstatusUpdateCallback {
    (promise: Promise<VMData>, target_power: boolean): void
}

type ContextType = {
    statusUpdateCallback: IstatusUpdateCallback
}

function App() {
    const navigation = useNavigation();
    const location = useLocation();
    const {vpnData, userProfile} = useLoaderData() as { vpnData: any, userProfile: userProfile };
    const [data, setData] = useState(vpnData);

    // force update status
    const forceUpDateStatus = useCallback(async () => {
        let data
        try {
            data = await fetchVPNData()
        } catch (err: any) {
            console.error(err)
            if (err.name !== "AbortError") toastHttpError(err.status)
            return
        }
        setData(data)
    }, []);

    // status update callback function for child component to update status and show toast message when status changed successfully or failed to change status
    const statusUpdateCallback = useCallback<IstatusUpdateCallback>(async (promise, target) => {
        await forceUpDateStatus()
        try {
            await toast.promise(promise, {
                    pending: `正在${target ? '開機' : '關機'}中...`,
                    success: '節點已成功' + (target ? '開機' : '關機') + '!',
                    error: '節點' + (target ? '開機' : '關機') + '失敗!',
                }
            );
        } catch (e) {
            console.error(e)
        } finally {
            await forceUpDateStatus()
        }
    }, [forceUpDateStatus]);

    // set title
    useEffect(() => {
        if (location.pathname === "/") document.title = "Home - VPN Manager"
    }, [location]);

    return (
        <>
            <Container className="content h-100" data-bs-theme="dark">
                <Menu data={data} userProfile={userProfile}/>
            </Container>
            <Bubbles/>
            <AnimeBackground/>
            <LoadingScreen display={navigation.state === "loading"}/>
            <ToastContainer position="bottom-right"
                            autoClose={5000}
                            hideProgressBar={false}
                            newestOnTop={false}
                            closeOnClick
                            rtl={false}
                            pauseOnFocusLoss
                            draggable
                            pauseOnHover
                            theme="colored"/>
            <Outlet context={{statusUpdateCallback} satisfies ContextType}/>
        </>
    );
}

const ErrorScreen: React.FC = () => {
    const error = useRouteError();
    const error_Elm = useMemo(() => {
        if (isRouteErrorResponse(error)) {
            switch (error.status) {
                case 400:
                    return (<>
                        <h1>400</h1>
                        <Row className="justify-content-center">
                            <Lottie animationData={require("./assets/400.json")}
                                    style={{width: "400px", height: "300px"}}/>
                        </Row>
                        <p>你給的資料我不明白 你肯定沒有錯?</p>
                    </>);
                case 404:
                    return (<>
                        <h1>404</h1>
                        <Row className="justify-content-center">
                            <Lottie animationData={require("./assets/404.json")}
                                    style={{width: "500px", height: "250px"}}/>
                        </Row>
                        <p>這裡不存在任何東西! 你確定去對地方了?</p>
                    </>);
                case 403:
                    return (<>
                        <h1>403</h1>
                        <Row className="justify-content-center">
                            <Lottie animationData={require("./assets/403.json")}
                                    style={{width: "400px", height: "300px"}}/>
                        </Row>
                        <p>你不可以看這個東西!</p>
                    </>);
                case 401:
                    return (<>
                        <h1>401</h1>
                        <Row className="justify-content-center">
                            <Lottie animationData={require("./assets/403.json")}
                                    style={{width: "400px", height: "300px"}}/>
                        </Row>
                        <p>我不知道你是誰 你能告訴我嗎!</p>
                    </>);
                case 500:
                    return (<>
                        <h1>500</h1>
                        <Row className="justify-content-center">
                            <Lottie animationData={require("./assets/500.json")}
                                    style={{width: "300px", height: "300px"}}/>
                        </Row>
                        <p>我出現問題了! 稍後再試一試</p>
                    </>);
                case 504:
                    return (<>
                        <h1>504</h1>
                        <Row className="justify-content-center">
                            <Lottie animationData={require("./assets/500.json")}
                                    style={{width: "300px", height: "300px"}}/>
                        </Row>
                        <p>網絡出現問題! 檢查一下</p>
                    </>);
                case 502:
                    return (<>
                        <h1>502</h1>
                        <Row className="justify-content-center">
                            <Lottie animationData={require("./assets/500.json")}
                                    style={{width: "300px", height: "300px"}}/>
                        </Row>
                        <p>太多人了! 稍後再試一試</p>
                    </>);
                default:
                    return (<><h1>Error</h1><p>未知錯誤</p></>);
            }
        }
        return (<>
            <h1>出事啦!</h1>
            <Row className="justify-content-center">
                <Lottie animationData={require("./assets/403.json")}
                        style={{width: "400px", height: "300px"}}/>
            </Row>
            <p>發生了一些不能遇見的錯誤! 不如再試一試?</p>
        </>)
    }, [error]);
    console.log(error)

    return (
        <div className="error-screen">
            <Row className="h-100 justify-content-center align-items-center">
                <Col xs={12} className="text-center">
                    {error_Elm}
                </Col>
            </Row>
        </div>
    );
}

const AnimeBackground: React.FC = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setIndex((r) => (r + 1) % 3);
        }, 20000);
        return () => clearInterval(id);
    }, [])

    return (
        <div className="anime-background">
            <div className="anime-background-img img1" style={{opacity: index === 0 ? 1 : 0}}></div>
            <div className="anime-background-img img2" style={{opacity: index === 1 ? 1 : 0}}></div>
            <div className="anime-background-img img3" style={{opacity: index === 2 ? 1 : 0}}></div>
        </div>
    )
}

/**
 * Bubbles background animation
 * @constructor
 */
const Bubbles: React.FC = () => {
    const count = 20;

    return (
        <div className="bubbles">
            {Array.from(Array(count).keys()).map((_, i) => <Bubble key={i} delay={i}/>)}
        </div>
    )
}

/**
 * Bubble background animation element
 * @param delay Spawn delay time
 * @constructor
 */
const Bubble: React.FC<{ delay: number }> = ({delay}) => {
    const [isClicked, setIsClicked] = useState(0);
    const defaultStyle = useMemo(() => ({
        "--bubble-left-offset": `${(Math.random() * 100).toFixed(0)}%`,
        "--bubble-size": `${(Math.random() * 150 + 10).toFixed(0)}px`,
        "--bubble-float-duration": `${(Math.random() * 10 + 10).toFixed(0)}s`,
        "--bubble-float-delay": `${delay}s`,
        "--bubble-sway-type": Math.random() > 0.5 ? "sway-left-to-right" : "sway-right-to-left",
        "--bubble-sway-duration": `${(Math.random() * 6 + 4).toFixed(0)}s`,
        "--bubble-sway-delay": `${(Math.random() * 5).toFixed(0)}s`,
    } as CSSProperties), [delay]);
    const style = useMemo(() => ({
        ...defaultStyle,
        opacity: isClicked === 1 ? 0 : 1,
    }) as CSSProperties, [defaultStyle, isClicked]);

    // disappear animation
    useEffect(() => {
        if (isClicked === 1) {
            setTimeout(() => setIsClicked(2), 500);
        }
    }, [isClicked]);

    if (isClicked === 2) return null; //disappear
    return (
        <div className="bubble" style={style} onClick={() => setIsClicked(1)}></div>
    )
}

/**
 * Loading screen
 * @param display display or not
 * @constructor
 */
const LoadingScreen: React.FC<{ display: boolean }> = ({display}) => {
    const [displayStat, setDisplayStat] = useState(0);

    useEffect(() => {
        if (!display) {
            setDisplayStat(1);
            setTimeout(() => setDisplayStat(2), 500);
        } else {
            setDisplayStat(0);
        }
    }, [display]);

    return (
        <div className="loading-screen"
             style={{opacity: displayStat !== 0 ? 0 : 1, display: displayStat === 2 ? "none" : undefined}}>
            <Row className="h-100 justify-content-center align-items-center">
                <Col xs={12} className="text-center">
                    <img src={loading} alt="Loading..."/>
                    <div>Loading...</div>
                </Col>
            </Row>
        </div>
    )
}

/**
 * Toast http error
 * @param status http status code
 */
const toastHttpError = (status: number) => {
    switch (status) {
        case 400:
            toast.error("你給的資料我不明白 你肯定沒有錯?",)
            break;
        case 404:
            toast.error("這裡不存在任何東西! 你確定去對地方了?", {containerId: 1})
            break;
        case 403:
            toast.error("你不可以看這個東西!")
            break;
        case 401:
            toast.error("我不知道你是誰 你能告訴我嗎!")
            break;
        case 500:
            toast.error("我出現問題了! 稍後再試一試")
            break;
        case 504:
            toast.error("網絡出現問題! 檢查一下")
            break;
        case 502:
            toast.error("太多人了! 稍後再試一試")
            break;
        default:
            toast.error("出事啦! 發生了一些不能遇見的錯誤! 不如再試一試?")
    }
}

export default App;
export {API_URL, ErrorScreen, LoadingScreen, toastHttpError};
export type {IstatusUpdateCallback, ContextType};

