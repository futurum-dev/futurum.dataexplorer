import React from "react";

import {PlusCircleTwoTone} from "@ant-design/icons";
import {Button} from "antd";

export interface ContextMenuItem {
    title: string,
    action: (data: any) => void
}

export interface ContextMenuProps {
    items: ContextMenuItem[],
    visible: boolean,
    x: any,
    y: any,
    data?: any | null
}

export const ContextMenu = ({items, visible, x, y, data}: ContextMenuProps) => {

    if(!visible)
        return (<></>);

    return (
        <ul className="popup" style={{left: `${x}px`, top: `${y}px`, position: 'fixed'}}>
            {items.map((item, i) => {
                return (<li key={i}><Button type="link" onClick={() => item.action(data)}><PlusCircleTwoTone />{item.title}</Button></li>)
            })}
        </ul>
    );
}