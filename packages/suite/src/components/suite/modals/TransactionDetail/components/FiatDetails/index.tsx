import React from 'react';
import styled from 'styled-components';
import { colors, variables } from '@trezor/components-v2';
import FiatValue from '@suite-components/FiatValue/Container';
import Badge from '@suite-components/Badge';
import { WalletAccountTransaction } from '@wallet-reducers/transactionReducer';
import Box from '../Box';
import BoxRow from '../BoxRow';
import { FormattedDate } from 'react-intl';

const Grid = styled.div`
    display: grid;
    grid-gap: 20px;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
`;

const BoxHeading = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0px 12px;
    font-size: ${variables.FONT_SIZE.TINY};
    font-weight: ${variables.FONT_WEIGHT.DEMI_BOLD};
    color: ${colors.BLACK50};
    margin-bottom: 10px;
`;

const HistoricalBadge = styled(Badge)`
    background: #b3b3b3;
    color: white;
`;

const Col = styled.div<{ direction: 'column' | 'row' }>`
    display: flex;
    flex-direction: ${props => props.direction};
    flex: 1 1 auto;
`;

interface Props {
    tx: WalletAccountTransaction;
    totalOutput?: string;
}

const FiatDetails = ({ tx, totalOutput }: Props) => {
    return (
        <Grid>
            <Col direction="column">
                <BoxHeading>
                    Current Value{' '}
                    {/* such a weird syntax, but basically all I want is show date in parentheses: (formattedDate) */}
                    <FiatValue amount="1" symbol={tx.symbol}>
                        {(_fiatValue, _fiatRate, currentFiatRateTimestamp) => (
                            <>
                                {currentFiatRateTimestamp && (
                                    <>
                                        (
                                        <FormattedDate
                                            value={currentFiatRateTimestamp}
                                            year="numeric"
                                            month="2-digit"
                                            day="2-digit"
                                        />
                                        )
                                    </>
                                )}
                            </>
                        )}
                    </FiatValue>
                    <Badge>
                        <FiatValue amount="1" symbol={tx.symbol} />
                    </Badge>
                </BoxHeading>
                <Box>
                    <BoxRow title="Total Output" alignContent="right">
                        {totalOutput && (
                            <FiatValue amount={totalOutput} symbol={tx.symbol}>
                                {fiatValue => fiatValue}
                            </FiatValue>
                        )}
                    </BoxRow>
                    <BoxRow title="Fee" alignContent="right">
                        <FiatValue amount={tx.fee} symbol={tx.symbol}>
                            {(fiatValue, _timestamp) => fiatValue}
                        </FiatValue>
                    </BoxRow>
                </Box>
            </Col>
            <Col direction="column">
                <BoxHeading>
                    Historical Value ()
                    <HistoricalBadge>
                        <FiatValue amount="1" symbol={tx.symbol}>
                            {(fiatValue, _timestamp) => fiatValue}
                        </FiatValue>
                    </HistoricalBadge>
                </BoxHeading>
                <Box>
                    <BoxRow title="Total Output" alignContent="right">
                        todo
                    </BoxRow>
                    <BoxRow title="Fee" alignContent="right">
                        todo
                    </BoxRow>
                </Box>
            </Col>
        </Grid>
    );
};

export default FiatDetails;
