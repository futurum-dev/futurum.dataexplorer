import React, {ReactNode, useState} from "react";

import {Slider} from "antd";

interface DataTopBottomSliderProps {
    count: number,
    top: number;
    bottom: number;
    action: (value: [number, number]) => void
}

const DataTopBottomSlider = ({count, top, bottom, action}: DataTopBottomSliderProps) => {
    const [localTop, setLocalTop] = useState<number>(top);
    const [localBottom, setLocalBottom] = useState<number>(bottom);

    function onChange(value: [number, number]) {
        setLocalTop(value[0]);
        setLocalBottom(value[1]);

        console.log('onChange: ', value);
    }

    function onAfterChange(value: [number, number]) {
        setLocalTop(value[0]);
        setLocalBottom(value[1]);

        action(value);
    }

    const tipFormatter = (value?: number): ReactNode => {
        if (value) {
            if (value === localBottom) {
                return count - localBottom;
            }
        }

        return value;
    }

    return (
        <div>
            <Slider
                range={true}
                step={1}
                min={1}
                max={count}
                value={[top, bottom]}
                onChange={onChange}
                onAfterChange={onAfterChange}
                tipFormatter={tipFormatter}
            />
        </div>
    );
};

export default DataTopBottomSlider;