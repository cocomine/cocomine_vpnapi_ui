import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Button, Col, Modal, Ratio, Row, Spinner} from "react-bootstrap";
import {
    Link,
    Navigate,
    Outlet,
    useBlocker,
    useLoaderData,
    useLocation,
    useNavigate,
    useOutletContext
} from "react-router-dom";
import {readOnlyMode, VMData} from "./Menu";
import {API_URL, ContextType, toastHttpError, TOKEN} from "./App";
import {toast} from "react-toastify";
import power from "./assets/power.svg";
import tools from "./assets/tools.svg";
import Profile from "./Profile";
import moment from "moment/moment";

interface IPowerControl {
    isPower: boolean,
    action: (power: boolean) => void,
    readonly: readOnlyMode;
}

type postMessageDataType = { type: string, data: { installed?: boolean, connected?: boolean }, ask: boolean }

const Action: React.FC = () => {
    const {vmData} = useLoaderData() as { vmData: VMData };
    const location = useLocation();
    const navigate = useNavigate();
    const [show, setShow] = useState(true);
    const {statusUpdateCallback} = useOutletContext<ContextType>()

    // power action
    const powerAction = useCallback(async (power: boolean) => {
        try {
            const res = await fetch(API_URL + "/vpn/" + vmData._id, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Cf-Access-Jwt-Assertion": TOKEN,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    target_state: power ? "START" : "STOP"
                })
            })
            if (!res.ok) {
                if (res.status === 460) return toast.error(`節點只允許 ${vmData._readonly} 操作`)
                if (res.status === 461) return toast.error(`節點已經處於${vmData._isPowerOn ? '開機' : '關機'}狀態`)
                return toastHttpError(res.status)
            }
        } catch (e: any) {
            console.log(e)
            toastHttpError(e.status)
            return
        } finally {
            navigate('..', {replace: true}) // redirect to home page
        }

        statusUpdateCallback(power, vmData._id)
    }, [vmData, statusUpdateCallback, navigate]);

    // extend time action
    const extendTime = useCallback(async () => {
        try {
            const res = await fetch(API_URL + "/vpn/" + vmData._id, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Cf-Access-Jwt-Assertion": TOKEN,
                    'X-Requested-With': 'XMLHttpRequest'
                },
            })
            if (!res.ok) {
                if (res.status === 462) return toast.error(`只允許離線前一小時操作`)
                if (res.status === 463) return toast.error(`節點沒有開啟`)
                return toastHttpError(res.status)
            }
            toast.success("延長開放時間成功")
        } catch (e: any) {
            console.log(e)
            toastHttpError(e.status)
            return
        } finally {
            navigate('..', {replace: true}) // redirect to home page
        }
    }, [vmData, navigate])

    // block navigation when modal is open
    let blocker = useBlocker(() => {
        setShow(false)
        return true
    });

    // redirect to home page after modal close animation
    useEffect(() => {
        if (show) return
        const id = setTimeout(() => {
            if (blocker.state === "blocked") blocker.proceed()
        }, 150);
        return () => clearTimeout(id);
    }, [show, blocker]);

    // set title
    useEffect(() => {
        if (location.pathname === '/' + vmData._id) {
            document.title = vmData._name + " - VPN Manager"
            setShow(true)
        }
    }, [location, vmData]);

    return (
        <>
            {location.pathname === '/' + vmData._id &&
                <Modal show={show} centered onHide={() => navigate('..', {replace: true})}>
                    <Modal.Header closeButton>
                        <Modal.Title>你想? <small
                            style={{color: "darkgray", fontSize: "x-small"}}>({vmData._name})</small></Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Row className="gx-5 gy-4">
                            <Col>
                                <PowerControl isPower={vmData._isPowerOn} action={powerAction}
                                              readonly={vmData._readonly}/>
                            </Col>
                            <Col className="border-start">
                                <Link to={`${location.pathname}/profile`} className="chooseProfile_btn">
                                    <img src={tools} alt="Config file" className="w-100" draggable={false}/>
                                    <p className="text-center pt-2">下載設定檔</p>
                                </Link>
                            </Col>
                            {vmData._isPowerOn &&
                                <ExtensionConnect vmData={vmData}/>}
                            <ExtendTime expired={vmData._expired} onClick={extendTime}/>
                        </Row>
                    </Modal.Body>
                </Modal>
            }
            <Outlet context={{vmData}}/>
        </>
    );
}

const ExtensionConnect: React.FC<{ vmData: VMData }> = ({vmData}) => {
    const [installed, setInstalled] = useState<boolean>(false)
    const [loading, setLoading] = useState(false)

    // connect to extension
    const onClick = useCallback(() => {
        setLoading(true)
        window.postMessage({type: 'Connect', ask: true, data: vmData});
    }, [vmData]);

    // check if extension is installed
    useEffect(() => {
        // callback function
        function callback(e: MessageEvent<postMessageDataType>) {
            if (e.source !== window) {
                return;
            }
            console.debug(e.data)

            if ((e.data.type === 'ExtensionInstalled') && !e.data.ask && e.data.data.installed) {
                setInstalled(vmData._profiles.some(p => p.type === "socks5"))
            }

            if ((e.data.type === 'Connect') && !e.data.ask && e.data.data.connected) {
                setLoading(false)
                toast.success("已連線")
            }
        }

        // add event listener
        window.addEventListener('message', callback);
        window.postMessage({type: 'ExtensionInstalled', ask: true});

        return () => window.removeEventListener('message', callback);
    }, [vmData]);

    if (!installed) return null
    return (
        <>
            <Col xs={12} className="text-center">
                <div className="border-top w-100"></div>
            </Col>
            <Col xs={12}>
                <Row className="justify-content-center align-items-center g-2 pb-2">
                    <Col xs={"auto"} className="text-center text-sm-end">
                        <h5>Cocomine VPN 擴充功能</h5>
                        <span className="text-muted small">你已經安裝了擴充功能, 可以使用一鍵連線功能</span>
                    </Col>
                    <Col xs={"auto"}>
                        <img src={require('./assets/extension.webp')} alt="extension" className="img-fluid"
                             style={{width: "4rem"}}/>
                    </Col>
                </Row>
                <Button variant="primary" className="w-100 rounded-5 rainbow-btn border-0" onClick={onClick}
                        disabled={loading}>
                    <div className="rounded-5">
                        <Row className="justify-content-center align-content-center h-100">
                            <Col xs="auto">
                                {loading ? <Spinner animation="grow" size="sm" className="me-2"/> :
                                    <i className="bi bi-link-45deg me-2"></i>}
                                一鍵連線
                            </Col>
                        </Row>
                    </div>
                </Button>
            </Col>
        </>
    )
}

const ExtendTime: React.FC<{ expired: string | null, onClick: () => void }> = ({expired, onClick}) => {
    const [expect_offline_time_Interval, setExpect_offline_time_Interval] = useState<string>("Loading...")
    const [enableExtend, setEnableExtend] = useState<boolean>(false)
    const [loading, setLoading] = useState(false)
    const click = useCallback(() => {
        setLoading(true);
        onClick()
    }, [onClick]);

    // update expect_offline_time_Interval every second
    useEffect(() => {
        if (expired !== null) {
            const id = setInterval(() => {
                const expect_offline_time = moment(expired)
                const diff = expect_offline_time.diff(Date.now())
                const tmp = moment.utc(diff).format('HH:mm:ss')

                if (diff < 60 * 60 * 1000) setEnableExtend(true)
                setExpect_offline_time_Interval(diff > 0 ? tmp : "00:00:00");
            }, 1000)

            return () => clearInterval(id)
        }
    }, [expired]);

    if (expired === null) return null;
    return (
        <>
            <Col xs={12} className="text-center">
                <div className="border-top w-100"></div>
            </Col>
            <Col xs={12} className="text-center">
                <h3>{expect_offline_time_Interval}</h3>
                <p className="small text-muted">距離預計離線</p>
                <Button variant={enableExtend ? "primary" : "outline-primary"}
                        className="w-100 rounded-5" onClick={click}
                        disabled={!enableExtend || loading}>
                    {loading && <Spinner animation="grow" size="sm" className="me-2"/>}
                    {enableExtend ? "延長開放時間" : "離線前一小時可以延長開放時間"}
                </Button>
            </Col>
        </>
    )
}

const PowerControl: React.FC<IPowerControl> = ({isPower, action, readonly}) => {
    const timeout = useRef<NodeJS.Timeout | null>(null)
    const [loading, setLoading] = useState(false) // loading state

    // on mouse down start timeout for long press event
    const onMouseDown = useCallback(() => {
        timeout.current = setTimeout(() => {
            setLoading(true)
            action(!isPower)
        }, 2000)
    }, [action, isPower]);

    // on mouse up clear timeout for long press event
    const onMouseUp = useCallback(() => {
        if (timeout.current) {
            clearTimeout(timeout.current)
            timeout.current = null
        }
    }, []);

    if (isPower) {
        return (
            <>
                <Ratio aspectRatio="1x1" className="">
                    <Button variant="danger" className="powerBtn" onMouseDown={onMouseDown} onMouseUp={onMouseUp}
                            onTouchStart={onMouseDown} onTouchEnd={onMouseUp}
                            disabled={loading || readonly === "readOnly" || readonly === "startOnly"}>
                        <img src={power} alt="power icon"/>
                        <svg viewBox="0 0 100 100" className="loading">
                            <defs>
                                <circle id="stroke" cx="50" cy="50" r="50"/>

                                <clipPath id="clipPath">
                                    <use xlinkHref="#stroke"/>
                                </clipPath>
                            </defs>

                            <use xlinkHref="#stroke" clipPath="url(#clipPath)" fill="transparent" strokeLinecap="round"
                                 strokeWidth="5" id="anime" className={(loading ? "loading" : undefined)}/>
                        </svg>
                    </Button>
                </Ratio>
                <p className="text-center pt-2">長按關閉節點</p>
            </>
        );
    }

    return (
        <>
            <Ratio aspectRatio="1x1">
                <Button variant="success" className="powerBtn" onMouseDown={onMouseDown} onMouseUp={onMouseUp}
                        onTouchStart={onMouseDown} onTouchEnd={onMouseUp}
                        disabled={loading || readonly === "readOnly" || readonly === "stopOnly"}
                        onContextMenu={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            return false;
                        }}>
                    <img src={power} alt="power icon"/>
                    <svg viewBox="0 0 100 100" className="loading">
                        <defs>
                            <circle id="stroke" cx="50" cy="50" r="50"/>

                            <clipPath id="clipPath">
                                <use xlinkHref="#stroke"/>
                            </clipPath>
                        </defs>

                        <use xlinkHref="#stroke" clipPath="url(#clipPath)" fill="transparent" strokeLinecap="round"
                             strokeWidth="5" id="anime" className={(loading ? "loading" : undefined)}/>
                    </svg>
                </Button>
            </Ratio>
            <p className="text-center pt-2">長按啟動節點</p>
        </>
    );
}

const ChooseProfile: React.FC = () => {
    const [show, setShow] = useState(true);
    const {vmData} = useOutletContext<{ vmData: VMData }>()
    const navigate = useNavigate();

    // set title
    useEffect(() => {
        document.title = vmData._name + " Profile - VPN Manager"
    }, [vmData]);

    // block navigation when modal is open
    let blocker = useBlocker(() => {
        setShow(false)
        return true
    });

    // redirect to home page after modal close animation
    useEffect(() => {
        if (show) return
        const id = setTimeout(() => {
            if (blocker.state === "blocked") blocker.proceed()
        }, 150);
        return () => clearTimeout(id);
    }, [show, blocker]);

    return (
        <>
            <Modal show={show} centered onHide={() => navigate('..', {replace: true})} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>下載設定檔 <small style={{color: "darkgray", fontSize: "x-small"}}>
                        ({vmData._name})
                    </small></Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row className={"g-5 justify-content-center"}>
                        {vmData._profiles.map((profile) => <Profile key={profile.filename} profile={profile}
                                                                    vm_id={vmData._id}/>)}
                    </Row>
                </Modal.Body>
            </Modal>
        </>
    );
};

// @ts-ignore
const loader = async ({params}) => {
    try {
        const VMData = await fetchVMData(params.id);
        console.debug(VMData)
        return {vmData: VMData.data}
    } catch (e: any) {
        toastHttpError(e.status)
        throw e
    }
}

/**
 * Fetch VM data from API
 * @param vm_id VM id
 * @param abortController AbortController
 * @param patch update data or not
 */
const fetchVMData = async (vm_id: string, abortController: AbortController = new AbortController(), patch = false) => {
    const res = await fetch(API_URL + "/vpn/" + vm_id, {
        method: patch ? "PATCH" : "GET",
        credentials: "include",
        signal: abortController.signal,
        redirect: "error",
        headers: {
            "Cf-Access-Jwt-Assertion": TOKEN,
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
    if (!res.ok) throw res;
    return await res.json();
}

const ErrorElement: React.FC = () => {
    return (<Navigate to=".." replace={true} relative="path"/>);
}

export {Action, loader, fetchVMData, ErrorElement, ChooseProfile};