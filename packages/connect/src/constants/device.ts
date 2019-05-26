// device list events
export const CONNECT = '@trezor-connect/device/connect';
export const CONNECT_UNACQUIRED = '@trezor-connect/device/connect_unacquired';
export const DISCONNECT = '@trezor-connect/device/disconnect';
export const CHANGED = '@trezor-connect/device/changed';
export const ACQUIRE = '@trezor-connect/device/acquire';
export const RELEASE = '@trezor-connect/device/release';
export const ACQUIRED = '@trezor-connect/device/acquired';
export const RELEASED = '@trezor-connect/device/released';
export const USED_ELSEWHERE = '@trezor-connect/device/used_elsewhere';

export const LOADING = '@trezor-connect/device/loading';

// trezor-link events in protobuf format
export const BUTTON = 'button';
export const PIN = 'pin';
export const PASSPHRASE = 'passphrase';
export const PASSPHRASE_ON_DEVICE = 'passphrase_on_device';
export const WORD = 'word';

// custom
export const WAIT_FOR_SELECTION = '@trezor-connect/device/wait_for_selection';

// this string has different prefix than other constants and it's used as device path
export const UNREADABLE = '@trezor-connect/unreadable-device';
