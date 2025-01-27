import Timer from './timer.js';
import Logger from './logger.js';
import LoginView from './view/login.js';

class GetAuthViaSteamRequest
{
    url = window.location.origin + '/api/auth-via-steam/';
    method = 'GET';

    constructor(uuid)
    {
        this.url += uuid;
    }

    async request()
    {
        try {
            return await fetch(this.url, {
                method: this.method,
                mode: "cors",
                cache: "no-cache",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                }
            });
        } catch (error) {
            console.error('Error: ', error)
        }

        return false;
    }
}

class PostAuthViaSteamRequest
{
    url = window.location.origin + '/api/auth-via-steam';
    body = {};
    method = 'POST';

    constructor(query) {
        this.body['uuid'] = this.uuidv4();

        (new URLSearchParams(query)).forEach((value, key) => {
            // remove openid. prefix
            key = key.substring(key.indexOf('.') + 1);
            this.body[key] = value;
        });
    }

    async request()
    {
        try {
            return await fetch(this.url, {
                method: this.method,
                mode: "cors",
                cache: "no-cache",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(this.body)
            });
        } catch (error) {
            console.error('Error: ', error)
        }

        return false;
    }

    getUuid()
    {
        return this.body['uuid'];
    }

    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
            .replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0,
                    v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
    }
}

export default class LoginController
{
    /**
     * @type {Router}
     */
    router;
    /**
     * @type {ModalController}
     */
    modals;
    /**
     * @type {Timer}
     */
    timer = new Timer(30000);
    /**
     * @type {GetAuthViaSteamRequest|null}
     */
    getAuthRequest= null;
    /**
     * @type {PostAuthViaSteamRequest|null}
     */
    postAuthRequest = null;

    authCheckingDelay = 400;

    /**
     * JWT Token used to make requests
     * @type {String|null}
     */
    token = null;

    /**
     * @type {LoginView}
     */
    view;

    /**
     * @type {Logger}
     */
    logger;

    /**
     * @param router {Router}
     * @param modals {ModalController}
     * @param logger {Logger}
     */
    constructor(router, modals, logger) {
        this.router = router;
        this.modals = modals;
        this.view = new LoginView();
        this.logger = logger;
    }

    bind()
    {
        this.view.bind();

        this.view.onLoginButtonPress(() => {
            const params = new URLSearchParams({
                'openid.ns': 'http://specs.openid.net/auth/2.0',
                'openid.mode': 'checkid_setup',
                'openid.return_to': window.location.origin + '/auth-via-steam',
                'openid.realm': window.location.origin,
                'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
                'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
            });

            document.location.href = 'https://steamcommunity.com/openid/login?' + params.toString();
        });
    }

    async startCheckingAuth(uuid)
    {
        return new Promise((resolve, reject) => {

            const func = async () => {
                this.getAuthRequest = new GetAuthViaSteamRequest(uuid);
                const response = await this.getAuthRequest.request();
                this.logger.debug({ GetAuthViaSteamResponse: response, GetAuthViaSteamRequest: this.getAuthRequest });

                if (200 !== response.status || this.timer.hasFinished()) {
                    reject();
                    return false;
                }

                const body = await response.json();

                if (typeof body.isAuthenticated === 'undefined' || typeof body.isProcessing === 'undefined') {
                    console.debug('Invalid response format.', { body: body })
                    reject();
                    return false;
                }

                if (body.isAuthenticated) {
                    resolve({ isAuthenticated: true, token: body.token});
                    return true;
                }

                if (!body.isProcessing) {
                    resolve({ isAuthenticated: false, token: null })
                    return false;
                }
                setTimeout(func, this.authCheckingDelay)
            };

            func();
        });
    }

    setAuthFailedState() {
        this.timer.stop();
        this.modals.pleaseWaitModal.toFailure();
        this.modals.pleaseWaitModal.hideAfterDelay();
    }

    setAuthSuccessState() {
        this.timer.stop();
        this.modals.pleaseWaitModal.toSuccess();
        this.modals.pleaseWaitModal.hideAfterDelay();
    }

    async handle()
    {
        if (!this.router.hasQuery()) {
            return false;
        }

        this.router.cleanupAddress();
        this.modals.pleaseWaitModal.toggleHideShow();

        this.timer.start();

        this.postAuthRequest = new PostAuthViaSteamRequest(this.router.query);
        let response = await this.postAuthRequest.request();
        this.logger.debug({ PostAuthViaSteamResponse: response, PostAuthViaSteamRequest: this.postAuthRequest });

        if (202 !== response.status) {
            this.setAuthFailedState();
        }

        this.startCheckingAuth(this.postAuthRequest.getUuid())
            .then(
                (result) => {
                    result.isAuthenticated
                        ? this.setAuthSuccessState()
                        : this.setAuthFailedState()
                    ;
                    this.token = result.token;
                },
                () => {
                    this.setAuthFailedState();
                }
            );

        return true;
    }
}
