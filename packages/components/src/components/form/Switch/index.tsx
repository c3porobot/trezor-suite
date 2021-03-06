import React, { useState } from 'react';
import ReactSwitch, { ReactSwitchProps } from 'react-switch';
import colors from '../../../config/colors';
import styled, { css } from 'styled-components';

const StyledReactSwitch = styled(({ isSmall, ...rest }) => <ReactSwitch {...rest} />)<
    Pick<Props, 'isSmall'>
>`
    .react-switch-handle {
        top: ${props => (props.isSmall ? 2 : 3)}px !important;
        border: solid 1px ${colors.WHITE} !important;
        background-image: linear-gradient(to top, ${colors.BLACK96}, ${colors.WHITE}) !important;

        ${props =>
            props.checked &&
            css`
                transform: ${props.isSmall
                    ? 'translateX(16px) !important'
                    : 'translateX(21px) !important'};
            `}

        ${props =>
            !props.checked &&
            css`
                transform: ${props.isSmall
                    ? 'translateX(2px) !important'
                    : 'translateX(3px) !important'};
            `}
    }
`;

interface Props extends ReactSwitchProps {
    onChange: (checked: boolean) => any;
    isDisabled?: boolean;
    isSmall?: boolean;
    dataTest?: string;
}

interface StateProps {
    checked: boolean;
}

const Wrapper = styled.div`
    display: flex;
`;

const Switch = ({ onChange, isDisabled, isSmall, dataTest, ...rest }: Props) => {
    const [checked, setChecked] = useState<StateProps['checked']>(false);
    const handleChange = (checked: boolean) => {
        onChange(checked);
        setChecked(checked);
    };

    return (
        <Wrapper data-test={dataTest}>
            <StyledReactSwitch
                checked={checked}
                disabled={isDisabled}
                onChange={handleChange}
                onColor={colors.GREEN}
                checkedIcon={false}
                uncheckedIcon={false}
                offColor={colors.BLACK70}
                color={colors.GREEN}
                isSmall={isSmall}
                width={isSmall ? 32 : 42}
                height={isSmall ? 18 : 24}
                handleDiameter={isSmall ? 14 : 18}
                boxShadow="0 2px 4px 0 rgba(0, 0, 0, 0.5)"
                activeBoxShadow="0 2px 4px 0 rgba(0, 0, 0, 0.8)"
                {...rest}
            />
        </Wrapper>
    );
};

export { Switch, Props as SwitchProps };
