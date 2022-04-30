import {createSlice, PayloadAction} from '@reduxjs/toolkit'

import {v4 as uuidv4} from 'uuid';

import {DrillDownPathNode, TopBottomRange} from "./domain";

interface DrillDownPathState {
    nodes: DrillDownPathNode[],
    selectedNodeId: string | null
}

const initialState: DrillDownPathState = {
    nodes: [{
        id: uuidv4(),
        title: "Root",
        drilledColumn: 'country',
        range: {top: 4, bottom: 4},
        parentId: null,
        children: []
    }],
    selectedNodeId: null
}

export const drillDownPathSlice = createSlice({
    name: 'drill-down-path',
    initialState,
    reducers: {
        selectNode: (state, action: PayloadAction<DrillDownPathNode>) => {
            state.selectedNodeId = action.payload.id
        },
        addChildNode: (state, action: PayloadAction<DrillDownPathNode>) => {
            if (action.payload.parentId == null) {
                state.nodes = [...state.nodes, action.payload]
                state.selectedNodeId = action.payload.id
            } else {
                const parentNode = searchNodes(state.nodes[0], action.payload.parentId);

                if (parentNode != null) {
                    parentNode.children = [...parentNode.children, action.payload]
                    state.selectedNodeId = action.payload.id
                } else {
                    state.nodes = [...state.nodes, action.payload]
                    state.selectedNodeId = action.payload.id
                }
            }
        },
        updateNodeTopBottomRange: (state, action: PayloadAction<{ id: string, range: TopBottomRange }>) => {
            const selectedNode = searchNodes(state.nodes[0], action.payload.id);

            if (selectedNode != null) {
                selectedNode.range = action.payload.range
            }
        },
    },
})

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

export const {selectNode, addChildNode, updateNodeTopBottomRange} = drillDownPathSlice.actions

export default drillDownPathSlice.reducer