import React, {useEffect, useState} from 'react';

import {Card, Tabs} from 'antd';

import {v4 as uuidv4} from 'uuid';

import {useAppDispatch, useAppSelector} from "./hooks";
import {addChildNode, updateNodeTopBottomRange} from "./drill-down-tree-slice";
import {DrillDownPathNode, DrillDownPathNodeFilter} from "./domain";
import DataTopBottomSlider from "./data-top-bottom-slider";
import DataGrid from "./data-grid";
import DataChart from "./data-chart";

import './data-grid.css'

const {TabPane} = Tabs;

const url = 'http://127.0.0.1:5001/query';

interface QueryFilterDto {
    column: string,
    values: string[],
    type: string
}

interface QueryDto {
    drilledColumn: string,
    aggregateColumns: string[],
    filters: QueryFilterDto[],
    top: number,
    bottom: number
}

export interface InteractiveDataComponentProps {
    loading: boolean,
    rowData: any[],
    allColumns: any[],
    columnDefinitions: any[],
    columnDrilldown: (column: string, inFilters: DrillDownPathNodeFilter[]) => void,
    middleDrilldown: (column: string, notInFilters: DrillDownPathNodeFilter[]) => void
}

const InteractiveData = () => {
    const [loading, setLoading] = useState<boolean>(false);

    const [rowData, setRowData] = useState<any[]>([]);

    const [columnDefinitions, setColumnDefinitions] = useState<any[]>([]);

    const [allColumns, setAllColumns] = useState<string[]>([]);

    const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

    const [originalCount, setOriginalCount] = useState<number | null>(null);

    const nodes = useAppSelector((state) => state.drillDownPath.nodes)
    const selectedNodeId = useAppSelector((state) => state.drillDownPath.selectedNodeId) ?? '0';

    const dispatch = useAppDispatch()

    const selectedNode = searchNodes(nodes[0], selectedNodeId);
    const selectedNodeRange = (selectedNode != null) ? selectedNode.range : {top: 4, bottom: 4};

    function applyFilter(queryDto: QueryDto, node: DrillDownPathNode): void {
        if (node.filters && node.filters.length > 0) {
            const filter = node.filters[0];

            switch (filter.type) {
                case "EQUALS": {
                    queryDto.filters.push({
                        column: filter.filterColumn,
                        values: filter.filterValues,
                        type: 'equalsFilter'
                    });
                    break;
                }
                case "IN": {
                    queryDto.filters.push({column: filter.filterColumn, values: filter.filterValues, type: 'inFilter'})
                    break;
                }
                case "NOT_IN": {
                    queryDto.filters.push({
                        column: filter.filterColumn,
                        values: filter.filterValues,
                        type: 'notInFilter'
                    })
                    break;
                }
            }
        }

        if (node.parentId) {
            const parentNode = searchNodes(nodes[0], node.parentId);

            if (parentNode) {
                applyFilter(queryDto, parentNode)
            }
        }
    }

    function searchNodes(element: DrillDownPathNode, matchingId: string): DrillDownPathNode | null {
        if (element.id === matchingId) {
            return element;
        } else if (element.children != null) {
            let i;
            let result = null;
            for (i = 0; result == null && i < element.children.length; i++) {
                result = searchNodes(element.children[i], matchingId);
            }
            return result;
        }
        return null;
    }

    useEffect(() => {
        if (selectedNodeId == null) {
            return;
        }

        setLoading(true)

        setRowData([]);


        if (selectedNode == null) {
            return;
        }

        let top = selectedNodeRange.top;
        let bottom = selectedNodeRange.bottom;
        if (originalCount != null) {
            if (originalCount - selectedNodeRange.bottom < 0) {
                bottom = 0
            }
        }

        const queryDto: QueryDto = {
            drilledColumn: selectedNode.drilledColumn,
            aggregateColumns: [],
            filters: [],
            top: top,
            bottom: bottom
        };
        if (selectedNode.filters != null) {
            applyFilter(queryDto, selectedNode)
        }

        fetch(url, {
            method: 'POST',
            body: JSON.stringify(queryDto),
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(result => {
                return result.json();
            })
            .then(data => {
                const rawData = data.data as string[];

                const rowData = rawData.map((x, i) => {
                    let parsed = JSON.parse(x);
                    return {...parsed, key: i};
                });
                setRowData(rowData);

                const rawColumnData = data.columns as string[];

                const columnData = rawColumnData.map(x => (
                    {
                        key: x,
                        title: x,
                        dataIndex: x,
                    }));
                setColumnDefinitions(columnData);

                const rawAllColumns = data.allColumns as string[];
                setAllColumns(rawAllColumns);

                setSelectedRowKeys([]);

                setOriginalCount(data.originalCount);

                setLoading(false)
            })
    }, [selectedNodeId, selectedNode?.range]);

    const columnDrilldown = (column: string, filters: DrillDownPathNodeFilter[]) => {
        const newDrillDownPath: DrillDownPathNode = {
            id: uuidv4(),
            title: column,
            drilledColumn: column,
            filters: filters,
            range: {top: 4, bottom: 4},
            parentId: selectedNodeId,
            children: [],
        };
        dispatch(addChildNode(newDrillDownPath));
    }

    function onDataTopBottomSliderChange(value: [number, number]) {
        console.log('onAfterChange: ', value);

        if (selectedNode != null) {
            let bottom = originalCount != null ? (originalCount - value[1]) : selectedNodeRange.bottom;
            if (selectedNode.range.top !== value[0] || selectedNode.range.bottom !== bottom) {
                dispatch(updateNodeTopBottomRange({id: selectedNodeId, range: {top: value[0], bottom: bottom}}))
            }
        }
    }

    const middleDrilldown = (column: string, notInFilters: DrillDownPathNodeFilter[]): void => {
        const newDrillDownPath: DrillDownPathNode = {
            id: uuidv4(),
            title: column,
            drilledColumn: column,
            filters: notInFilters,
            range: {top: 4, bottom: 4},
            parentId: selectedNodeId,
            children: [],
        };
        dispatch(addChildNode(newDrillDownPath));
    }

    if (selectedRowKeys) {
        console.log('selectedRowKeys changed: ', selectedRowKeys);
    }

    if (selectedNode == null || rowData.length === 0 || columnDefinitions.length === 0) {
        return <></>
    }

    const top = selectedNodeRange.top
    const bottom = originalCount != null ? originalCount - selectedNodeRange.bottom : selectedNodeRange.bottom

    return (
        <div>
            {(originalCount != null && (
                <Card>
                    <DataTopBottomSlider
                        count={originalCount}
                        top={top}
                        bottom={bottom}
                        action={onDataTopBottomSliderChange}/>
                </Card>))}

            <Tabs defaultActiveKey="1">
                <TabPane tab="Data" key="1">
                    <DataGrid
                        loading={loading}
                        rowData={rowData}
                        allColumns={allColumns}
                        columnDefinitions={columnDefinitions}
                        columnDrilldown={columnDrilldown}
                        middleDrilldown={middleDrilldown}
                    />
                </TabPane>
                <TabPane tab="Chart" key="2">
                    <DataChart
                        loading={loading}
                        rowData={rowData}
                        allColumns={allColumns}
                        columnDefinitions={columnDefinitions}
                        columnDrilldown={columnDrilldown}
                        middleDrilldown={middleDrilldown}
                    />
                </TabPane>
            </Tabs>
        </div>
    );
};

export default InteractiveData;
