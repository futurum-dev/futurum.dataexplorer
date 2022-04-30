import * as React from 'react';
import {ReactNode} from "react";

import {Card, Tree} from 'antd';
import {Key} from "antd/lib/table/interface";
import {DataNode, EventDataNode} from 'antd/lib/tree';
import {CardType} from "antd/lib/card";

import {useAppDispatch, useAppSelector} from "./hooks";
import {selectNode} from "./drill-down-tree-slice";
import {DrillDownPathNode} from "./domain";

import './drill-down-tree.css'

interface TreeNodeData {
    data: DrillDownPathNode,
    children?: TreeNode[];
}

type TreeNode = DataNode & TreeNodeData;

export default function DrillDownTree() {
    const nodes = useAppSelector((state) => state.drillDownPath.nodes)
    const selectedNodeId = useAppSelector((state) => state.drillDownPath.selectedNodeId)
    const dispatch = useAppDispatch()

    const onSelect = (newSelectedKeys: Key[], info: {
        event: 'select';
        selected: boolean;
        node: EventDataNode;
        selectedNodes: TreeNode[];
        nativeEvent: MouseEvent;
    }) => {
        dispatch(selectNode(info.selectedNodes[0].data))
    }

    const treeData: TreeNode[] = nodes.map(MapNode)

    function MapNode(node: DrillDownPathNode): TreeNode {
        return {
            key: node.id,
            title: node.title,
            data: node,
            children: node.children.map(MapNode),
        };
    }

    const selectedKey: Key = selectedNodeId ?? '';

    const treeNodeRenderer = (node: TreeNode): ReactNode => {
        const type: CardType | undefined = node.key === selectedKey ? "inner" : undefined;

        return (
            <div>
                <Card title={node.title} type={type}>
                    {node.data.filters?.map(filter => {

                        switch (filter.type) {
                            case "EQUALS": {
                                return (<p>{filter.filterColumn} == {filter.filterValues[0]}</p>)
                            }
                            case "IN": {
                                return (<p>{filter.filterColumn} IN {filter.filterValues.join(",")}</p>)
                            }
                            case "NOT_IN": {
                                return (<p>{filter.filterColumn} NOT IN {filter.filterValues.join(",")}</p>)
                            }
                        }
                    })}
                </Card>
            </div>
        );
    }

    return (
        <>
            <Tree
                treeData={treeData}
                selectedKeys={[selectedKey]}
                onSelect={onSelect}
                defaultExpandAll={true}
                titleRender={treeNodeRenderer}
            />
        </>
    );
}