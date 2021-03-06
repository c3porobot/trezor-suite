import React from 'react';
import styled from 'styled-components';

import { P, Link, variables } from '@trezor/components';
import { Option } from '@onboarding-components';
import messages from '@suite/support/messages';
import { Translation } from '@suite-components';
import { URLS } from '@suite-constants';

const Wrapper = styled.div`
    display: flex;
    justify-content: center;
    flex-direction: column;
    width: 100%;
    margin-top: 35px;

    @media (min-width: ${variables.SCREEN_SIZE.SM}) {
        flex-direction: row;
    }
`;

interface Props {
    onSelect: (number: boolean) => void;
}

const SelectRecoveryType = ({ onSelect }: Props) => (
    <>
        <P size="small">
            <Translation
                {...messages.TR_RECOVERY_TYPES_DESCRIPTION}
                values={{
                    TR_LEARN_MORE_LINK: (
                        <Link size="small" href={URLS.RECOVERY_MODEL_ONE_URL}>
                            <Translation {...messages.TR_LEARN_MORE_LINK} />
                        </Link>
                    ),
                }}
            />
        </P>
        <Wrapper>
            <Option
                action={() => {
                    onSelect(false);
                }}
                title={<Translation {...messages.TR_BASIC_RECOVERY} />}
                text={<Translation {...messages.TR_BASIC_RECOVERY_OPTION} />}
                button={
                    <Translation
                        {...messages.TR_SELECT_CONCRETE_RECOVERY_TYPE}
                        values={{
                            recoveryType: <Translation {...messages.TR_BASIC_RECOVERY} />,
                        }}
                    />
                }
                imgSrc="images/svg/basic.svg"
            />

            <Option
                action={() => {
                    onSelect(true);
                }}
                title={<Translation {...messages.TR_ADVANCED_RECOVERY} />}
                text={<Translation {...messages.TR_ADVANCED_RECOVERY_OPTION} />}
                button={
                    <Translation
                        {...messages.TR_SELECT_CONCRETE_RECOVERY_TYPE}
                        values={{
                            recoveryType: <Translation {...messages.TR_ADVANCED_RECOVERY} />,
                        }}
                    />
                }
                imgSrc="images/svg/advanced.svg"
            />
        </Wrapper>
    </>
);

export default SelectRecoveryType;
