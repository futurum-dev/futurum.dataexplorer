import React, {useEffect, useState} from "react";

import {Table} from "antd";
import {useAppSelector} from "./hooks";
import {DrillDownPathNode} from "./domain";

const url = 'http://127.0.0.1:5001/data/query3';

interface QueryFilterDto {
    column: string,
    values: string[],
    type: string
}

interface QueryDto {
    drilledColumn: string,
    aggregateColumns : string[],
    filters: QueryFilterDto[],
    top: number,
    bottom: number
}

const DataSummaryGrid = () => {
    const [rowData, setRowData] = useState<any[]>([]);

    const [columnDefinitions, setColumnDefinitions] = useState<any[]>([]);

    const nodes = useAppSelector((state) => state.drillDownPath.nodes)
    const selectedNodeId = useAppSelector((state) => state.drillDownPath.selectedNodeId) ?? '0'

    const selectedNode = searchNodes(nodes[0], selectedNodeId);

    function applyFilter(queryDto: QueryDto, node: DrillDownPathNode): void {
        if (node.filters && node.filters.length > 0) {
            const filter = node.filters[0];

            switch (filter.type) {
                case "EQUALS": {
                    queryDto.filters.push({column: filter.filterColumn, values: filter.filterValues, type: 'equalsFilter'});
                    break;
                }
                case "IN": {
                    queryDto.filters.push({column: filter.filterColumn, values: filter.filterValues, type: 'inFilter'})
                    break;
                }
                case "NOT_IN": {
                    queryDto.filters.push({column: filter.filterColumn, values: filter.filterValues, type: 'notInFilter'})
                    break;
                }
            }
        }

        if (node.parentId) {
            const parentNode = searchNodes(nodes[0], node.parentId);

            if(parentNode) {
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

            setRowData([]);

            setColumnDefinitions([]);

            return;
        }

        const selectedNode = searchNodes(nodes[0], selectedNodeId);

        if (selectedNode == null || selectedNode.parentId == null) {

            setRowData([]);

            setColumnDefinitions([]);

            return;
        }

        const parentNode = searchNodes(nodes[0], selectedNode.parentId);

        if (parentNode == null) {

            setRowData([]);

            setColumnDefinitions([]);

            return;
        }

        setRowData([]);

        let queryDto: QueryDto = {
            drilledColumn: parentNode.drilledColumn,
            aggregateColumns: [],
            filters: [],
            top: 0,
            bottom: 0
        }
        if (selectedNode.filters != null) {
            applyFilter(queryDto, parentNode)
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

                const columnData = rawColumnData.map(x => ({key: x, title: x, dataIndex: x}));
                setColumnDefinitions(columnData);
            })
    }, [selectedNodeId]);

    if (rowData.length > 0 && selectedNode != null) {
        let isMiddleDrilldown = false;
        if(selectedNode.filters != null && selectedNode.filters.length > 0 && selectedNode.filters[0].type === "NOT_IN")
        {
            isMiddleDrilldown = true;
        }

        return (
            <div>
                {!isMiddleDrilldown &&
                    (<Table
                    columns={columnDefinitions}
                    dataSource={rowData}
                />)}
            </div>
        );
    } else {
        return (<></>);
    }
};

export default DataSummaryGrid;