import React, { useState, useEffect } from 'react';
import { Translation } from '@suite-components/Translation';
import styled from 'styled-components';
import { colors, Loader, Button } from '@trezor/components';
import { WalletLayout } from '@wallet-components';
import { getAccountTransactions } from '@wallet-utils/accountUtils';
import { SETTINGS } from '@suite-config';
import TransactionList from './components/TransactionList';
import messages from '@suite/support/messages';
import NoTransactions from './components/NoTransactions';
import PricePanel from './components/PricePanel';
import TransactionSummary from './components/TransactionSummary';
import TokenList from './components/TokenList';

import { Props } from './Container';

const LoaderWrapper = styled.div`
    display: flex;
    flex-direction: column;
    justify-items: center;
    align-items: center;
`;
const LoaderText = styled.div`
    color: ${colors.BLACK0};
    text-align: center;
`;

const Actions = styled.div`
    display: flex;
    padding: 0px 16px;
    margin-bottom: 8px;
    opacity: 0.8;
    justify-content: space-between;
`;

export default (props: Props) => {
    const { selectedAccount, transactions } = props;
    const [selectedPage, setSelectedPage] = useState(1);
    const [isGraphHidden, setIsGraphHidden] = useState(false);

    const descriptor = selectedAccount.account?.descriptor;
    const symbol = selectedAccount.account?.symbol;
    useEffect(() => {
        // reset page on account change
        setSelectedPage(1);
    }, [descriptor, symbol]);

    if (selectedAccount.status !== 'loaded') {
        return <WalletLayout title="Transactions" account={props.selectedAccount} />;
    }

    const { account, network } = selectedAccount;

    const accountTransactions = getAccountTransactions(transactions.transactions, account);
    const { size = undefined, total = undefined } = account.page || {};

    const onPageSelected = (page: number) => {
        setSelectedPage(page);
        props.fetchTransactions(account, page, size);
    };

    return (
        <WalletLayout title="Transactions" account={props.selectedAccount}>
            <PricePanel account={account} />
            {transactions.isLoading && (
                <LoaderWrapper>
                    <Loader size={40} />
                    <LoaderText>
                        <Translation {...messages.TR_LOADING_TRANSACTIONS} />
                    </LoaderText>
                </LoaderWrapper>
            )}
            {accountTransactions.length === 0 && !transactions.isLoading && (
                <NoTransactions
                    receive={() => props.goto('wallet-receive', undefined, true)}
                    buy={() => {}}
                />
            )}
            {accountTransactions.length > 0 && (
                <>
                    {account.networkType !== 'ripple' && (
                        <>
                            <Actions>
                                <Button
                                    variant="tertiary"
                                    size="small"
                                    icon={isGraphHidden ? 'ARROW_DOWN' : 'ARROW_UP'}
                                    onClick={() => {
                                        setIsGraphHidden(!isGraphHidden);
                                    }}
                                >
                                    {isGraphHidden ? 'Show graph' : 'Hide graph'}
                                </Button>
                                {/* TODO: export transactions to a file */}
                            </Actions>
                            <TransactionSummary account={account} isGraphHidden={isGraphHidden} />
                        </>
                    )}
                    {account.networkType === 'ethereum' && (
                        <TokenList explorerUrl={network.explorer.account} tokens={account.tokens} />
                    )}
                    <TransactionList
                        explorerUrl={network.explorer.tx}
                        transactions={accountTransactions}
                        currentPage={selectedPage}
                        totalPages={total}
                        onPageSelected={onPageSelected}
                        perPage={SETTINGS.TXS_PER_PAGE}
                        symbol={account.symbol}
                    />
                </>
            )}
        </WalletLayout>
    );
};
