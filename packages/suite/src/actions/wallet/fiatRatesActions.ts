import { FIAT } from '@suite-config';
import { Dispatch, GetState } from '@suite-types';
import {
    RATE_UPDATE,
    LAST_WEEK_RATES_UPDATE,
    TX_FIAT_RATE_UPDATE,
} from './constants/fiatRatesConstants';
import { Network, Account } from '@wallet-types';
import { saveFiatRates } from '@suite-actions/storageActions';
import BlockchainLink from '@trezor/blockchain-link';
// import { resolveStaticPath } from '@suite-utils/nextjs';
import { CoinFiatRates, LastWeekRates } from '@wallet-reducers/fiatRateReducer';
import NETWORKS from '@wallet-config/networks';
// @ts-ignore
import BlockbookWorker from '@trezor/blockchain-link/build/web/blockbook-worker';
import { AccountTransaction } from 'trezor-connect';
import { WalletAccountTransaction } from '@wallet-reducers/transactionReducer';
import { subWeeks } from 'date-fns';

type Ticker = {
    symbol: string;
    url?: string;
};

export type FiatRateActions =
    | {
          type: typeof RATE_UPDATE;
          payload: {
              symbol: Network['symbol'] | string;
              rates: { [key: string]: number };
              ts: number;
          };
      }
    | {
          type: typeof TX_FIAT_RATE_UPDATE;
          payload: {
              txid: string;
              account: Account;
              updateObject: Partial<WalletAccountTransaction>;
              ts: number;
          };
      }
    | {
          type: typeof LAST_WEEK_RATES_UPDATE;
          payload: {
              symbol: Network['symbol'] | string;
              tickers: LastWeekRates['tickers'];
              ts: number;
          };
      };

// how often should suite check for outdated rates;
const INTERVAL = 1000 * 60; // 1 min
// which rates should be considered outdated and updated;
const MAX_AGE = 1000 * 60 * 10; // 10 mins
const INTERVAL_LAST_WEEK = 1000 * 60 * 60 * 4; // 4 hours

const blockchainLinks: Partial<{ [k: string]: BlockchainLink | undefined }> = {};
NETWORKS.forEach(network => {
    if (network.blockbook) {
        blockchainLinks[network.symbol] = new BlockchainLink({
            name: network.symbol,
            worker: BlockbookWorker,
            server: (network.blockbook as unknown) as string[],
            debug: false,
        });
    }
});

// TODO: move coingecko related funcs to separate file
const COINGECKO_BASE_URL = 'https://api.coingecko.com/';
/**
 * Returns an array with coins supported by CoinGecko API
 *
 * @returns {Promise<any>}
 */
const fetchCoinList = async (): Promise<any> => {
    const url = new URL('/api/v3/coins/list', COINGECKO_BASE_URL);

    const response = await fetch(url.toString());
    const tokens = await response.json();
    return tokens;
};

type FCFRParams = {
    symbol?: string;
    url?: string;
};

/**
 * Returns the current rate for a given symbol fetched from CoinGecko API.
 * Returns null if coin for a given symbol was not found.
 *
 * @param {string} symbol
 * @returns
 */
const fetchCurrentFiatRates = async (params: FCFRParams) => {
    let url: URL | null = null;
    const { symbol } = params;

    if (params.url) {
        url = new URL(params.url);
    } else if (symbol) {
        // fetch coin id from coingecko and use it to build URL for fetching rates
        const coinList = await fetchCoinList();
        const coinData = coinList.find((t: any) => t.symbol === symbol.toLowerCase());
        if (!coinData) return null;
        url = new URL(`/api/v3/coins/${coinData.id}`, COINGECKO_BASE_URL);
    }

    if (!url) return null;

    url.searchParams.set('tickers', 'false');
    url.searchParams.set('market_data', 'true');
    url.searchParams.set('community_data', 'false');
    url.searchParams.set('developer_data', 'false');
    url.searchParams.set('sparkline', 'false');

    const response = await fetch(url.toString());
    const rates = await response.json();
    return {
        ts: new Date().getTime() / 1000,
        rates: rates.market_data.current_price,
        symbol: rates.symbol,
    };
};

export const fetchTickerRates = (ticker: Ticker) => async (
    dispatch: Dispatch,
    _getState: GetState,
) => {
    try {
        const blockchainLink = blockchainLinks[ticker.symbol];
        // const param = ticker.url ? { url: ticker.url } : { symbol: ticker.symbol };
        const response = blockchainLink
            ? await blockchainLink.getCurrentFiatRates({})
            : await fetchCurrentFiatRates(ticker);

        if (response) {
            dispatch({
                type: RATE_UPDATE,
                payload: {
                    ts: response.ts * 1000, // blockbook sends time in seconds
                    rates: response.rates,
                    symbol: ticker.symbol,
                },
            });

            // save to storage
            // TODO: let's handle this in storageMiddleware so all storage operations are in one place
            dispatch(saveFiatRates());
        }
        return response;
    } catch (error) {
        console.error(error);
    }
};

/**
 * Returns the historical rate for a given symbol, timesttamp fetched from CoinGecko API.
 * Be aware that the data granularity is 1 day.
 * Returns null if coin for a given symbol was not found.
 *
 * @param {string} symbol
 * @returns
 */
interface HistoricalResponse {
    symbol: string;
    tickers: LastWeekRates['tickers'];
    ts: number;
}
const getFiatRatesForTimestamps = async (
    symbol: string,
    timestamps: number[],
): Promise<HistoricalResponse | null> => {
    const coinList = await fetchCoinList();
    const coinData = coinList.find((t: any) => t.symbol === symbol.toLowerCase());
    if (!coinData) return null;

    const url = new URL(`/api/v3/coins/${coinData.id}/history`, COINGECKO_BASE_URL);

    const promises = timestamps.map(async t => {
        const d = new Date(t * 1000);
        const dateParam = `${d.getUTCDate()}-${d.getUTCMonth() + 1}-${d.getUTCFullYear()}`;
        url.searchParams.set('date', dateParam);

        const response = await fetch(url.toString());
        const data = await response.json();
        // if (!data?.market_data?.current_price) return null;
        // TODO: market_data field is missing if they are no rates available for a given date
        return {
            ts: t,
            rates: data.market_data.current_price,
        };
    });

    const results = await Promise.all(promises);
    return {
        symbol,
        tickers: results,
        ts: new Date().getTime(),
    };
};

/**
 * Returns an array with coin tickers that need fullfil several conditions:
 *  1. network for a given ticker needs to be enabled
 *  2a. no rates available yet (first fetch)
 *  OR
 *  2b. duration since the last check is greater than passed `interval`
 *  Timestamp is extracted via `timestampFunc`.
 *
 * @param {((ticker: CoinFiatRates) => number | undefined)} timestampFunc
 * @param {number} interval
 */
const getStaleTickers = (
    timestampFunc: (ticker: CoinFiatRates) => number | undefined,
    interval: number,
    includeTokens?: boolean,
) => async (_dispatch: Dispatch, getState: GetState) => {
    const { fiat } = getState().wallet;
    const { enabledNetworks } = getState().wallet.settings;
    // TODO: Consider removing FIAT.tickers as now we can fetch rates for any coin by calling an API with the coin symbol,
    // and then using the coin ID from the response to finally fetch the rates
    const watchedTickers = FIAT.tickers.filter(t => enabledNetworks.includes(t.symbol));

    const listOfWatchedSymbols: string[] = FIAT.tickers.map(t => t.symbol);
    // all tickers that are inside reducer and not listed in FIAT.tickers (in file) => probably tokens!
    const tokenTickers = fiat.filter(t => !listOfWatchedSymbols.includes(t.symbol));

    const needUpdateFn = (t: Ticker) => {
        // if no rates loaded yet, load them;
        if (fiat.length === 0) return true;
        const alreadyWatchedTicker = fiat.find(f => f.symbol === t.symbol);
        // is not in fiat[], means is not watched, for example coin was added in settings, add it
        if (!alreadyWatchedTicker) return true;

        const timestamp = timestampFunc(alreadyWatchedTicker);
        if (!timestamp) return true;
        // otherwise load only older ones
        return Date.now() - timestamp > interval;
    };

    const tickersToUpdate: Ticker[] = [];
    watchedTickers.filter(needUpdateFn).forEach(t => tickersToUpdate.push(t));
    if (includeTokens) {
        tokenTickers.filter(needUpdateFn).forEach(t => tickersToUpdate.push(t));
    }

    return tickersToUpdate;
};

/**
 * Updates current fiat rates for every stale ticker
 */
export const handleRatesUpdate = () => async (dispatch: Dispatch, _getState: GetState) => {
    try {
        const staleTickers = await dispatch(
            getStaleTickers(ticker => ticker.current?.ts, MAX_AGE, true),
        );
        const promises = staleTickers.map(fetchTickerRates);
        await Promise.all(promises);
    } catch (error) {
        // todo: dispatch some error;
        // dispatch({ type: '@rate/error', payload: error.message });
        console.error(error);
    }
};

/**
 * Updates the price data for the past 7 days in 4-hour interval (42 data points)
 */
const updateLastWeekRates = () => async (dispatch: Dispatch) => {
    const day = 86400;
    const hour = 3600;
    const currentTimestamp = Math.floor(new Date().getTime() / 1000) - 120; // unix timestamp in seconds - 2 mins
    let timestamps: number[] = [];
    const weekAgoTimestamp = currentTimestamp - 7 * day;

    // calc timestamps in 4 hours intervals the last 7 days
    let timestamp = currentTimestamp;
    while (timestamp > weekAgoTimestamp) {
        timestamp -= 4 * hour;
        timestamps.push(timestamp);
    }
    timestamps = timestamps.reverse();
    // console.log('timestamps', timestamps);

    const staleTickers = await dispatch(getStaleTickers(ticker => ticker.lastWeek?.ts, MAX_AGE));

    const promises = staleTickers.map(async ticker => {
        try {
            const blockchainLink = blockchainLinks[ticker.symbol];
            const response = blockchainLink
                ? await blockchainLink.getFiatRatesForTimestamps({
                      timestamps,
                  })
                : await getFiatRatesForTimestamps(ticker.symbol, timestamps);
            if (response?.tickers) {
                dispatch({
                    type: LAST_WEEK_RATES_UPDATE,
                    payload: {
                        symbol: ticker.symbol,
                        tickers: response.tickers,
                        ts: new Date().getTime(),
                    },
                });
            }
        } catch (error) {
            console.log('updateLastWeekRates fail', error);
        }
    });
    await Promise.all(promises);

    setInterval(() => {
        dispatch(updateLastWeekRates());
    }, INTERVAL_LAST_WEEK);
};

export const fetchFiatRatesForTxs = (account: Account, txs: AccountTransaction[]) => async (
    dispatch: Dispatch,
) => {
    if (txs?.length === 0) return;

    const timestamps = txs.map(tx => tx.blockTime ?? new Date().getTime());
    try {
        const blockchainLink = blockchainLinks[account.symbol as Network['symbol']];
        const response = blockchainLink
            ? await blockchainLink.getFiatRatesForTimestamps({
                  timestamps,
              })
            : await getFiatRatesForTimestamps(account.symbol, timestamps);
        if (response?.tickers) {
            txs.forEach((tx, i) => {
                dispatch({
                    type: TX_FIAT_RATE_UPDATE,
                    payload: {
                        txid: tx.txid,
                        updateObject: { rates: response.tickers[i]?.rates },
                        account,
                        ts: new Date().getTime(),
                    },
                });
            });
        }
    } catch (error) {
        console.log('fetchFiatRatesForTx', error);
        console.log('txs', txs);
        console.log('timestamps', timestamps);
    }
};

export const fetchAccountHistory = async (account: Account, weeks: number) => {
    // TODO: move out of actions?
    const secondsInDay = 3600 * 24;
    const secondsInMonth = secondsInDay * 30;

    const startDate = subWeeks(new Date(), weeks);
    const endDate = new Date();
    try {
        const blockchainLink = blockchainLinks[account.symbol as Network['symbol']];
        const response = blockchainLink
            ? await blockchainLink.getAccountBalanceHistory({
                  descriptor: account.descriptor,
                  from: Math.floor(startDate.getTime() / 1000),
                  to: Math.floor(endDate.getTime() / 1000),
                  groupBy: weeks >= 52 ? secondsInMonth : secondsInDay,
              })
            : null;
        if (response) {
            return response;
        }
        return null;
    } catch (error) {
        console.log('fetchAccountHistory', error);
    }
};

export const initRates = () => (dispatch: Dispatch) => {
    dispatch(handleRatesUpdate());
    dispatch(updateLastWeekRates());
    // todo: might be nice to implement canceling interval but later...
    setInterval(() => {
        dispatch(handleRatesUpdate());
    }, INTERVAL);
};
