import produce from 'immer';
import { TRANSPORT, TransportInfo } from 'trezor-connect';
import { SUITE, STORAGE } from '@suite-actions/constants';
import { DISCOVERY } from '@wallet-actions/constants';
import { Action, TrezorDevice, Lock } from '@suite-types';
import { LANGUAGES } from '@suite-config';

export interface DebugModeOptions {
    translationMode: boolean;
}

export interface SuiteState {
    initialRun: boolean;
    online: boolean;
    loading: boolean;
    loaded: boolean;
    error?: string;
    transport?: Partial<TransportInfo>;
    device?: TrezorDevice;
    language: typeof LANGUAGES[number]['code'];
    messages: { [key: string]: any };
    locks: Lock[];
    debug: DebugModeOptions;
    analytics: boolean;
}

const initialState: SuiteState = {
    initialRun: true,
    online: true,
    loading: false,
    loaded: false,
    language: 'en',
    messages: {},
    locks: [],
    debug: {
        translationMode: false,
    },
    analytics: false,
};

const changeLock = (draft: SuiteState, lock: Lock, enabled: boolean) => {
    if (enabled) {
        draft.locks.push(lock);
    } else {
        const index = draft.locks.lastIndexOf(lock);
        draft.locks.splice(index, 1);
    }
};

export default (state: SuiteState = initialState, action: Action): SuiteState => {
    return produce(state, draft => {
        switch (action.type) {
            case SUITE.INIT:
                draft.loading = true;
                break;

            case STORAGE.LOADED:
                draft.initialRun = action.payload.suite.initialRun;
                draft.language = action.payload.suite.language;
                break;

            case SUITE.READY:
                draft.loading = false;
                draft.loaded = true;
                break;

            case SUITE.ERROR:
                draft.loading = false;
                draft.loaded = false;
                draft.error = action.error;
                break;

            case SUITE.INITIAL_RUN_COMPLETED:
                draft.initialRun = false;
                break;

            case SUITE.SELECT_DEVICE:
            case SUITE.UPDATE_SELECTED_DEVICE:
                draft.device = action.payload;
                break;

            case SUITE.SET_LANGUAGE:
                draft.language = action.locale;
                draft.messages = action.messages;
                break;

            case SUITE.SET_DEBUG_MODE:
                draft.debug = { ...draft.debug, ...action.payload };
                break;

            case SUITE.TOGGLE_ANALYTICS:
                draft.analytics = !state.analytics;
                break;

            case TRANSPORT.START:
                draft.transport = action.payload;
                break;

            case TRANSPORT.ERROR:
                draft.transport = {
                    bridge: action.payload.bridge,
                };
                break;

            case SUITE.ONLINE_STATUS:
                draft.online = action.payload;
                break;

            case SUITE.LOCK_UI:
                changeLock(draft, SUITE.LOCK_TYPE.UI, action.payload);
                break;

            case SUITE.LOCK_DEVICE:
                changeLock(draft, SUITE.LOCK_TYPE.DEVICE, action.payload);
                break;

            case SUITE.LOCK_ROUTER:
                changeLock(draft, SUITE.LOCK_TYPE.ROUTER, action.payload);
                break;

            case DISCOVERY.START:
                changeLock(draft, SUITE.LOCK_TYPE.DEVICE, true);
                break;
            case DISCOVERY.STOP:
            case DISCOVERY.COMPLETE:
                changeLock(draft, SUITE.LOCK_TYPE.DEVICE, false);
                break;

            // no default
        }
    });
};
