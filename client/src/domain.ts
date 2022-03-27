export interface DrillDownPathNode {
    id: string
    title: string,
    drilledColumn: string,
    range: TopBottomRange,
    filters?: DrillDownPathNodeFilter[] | null,
    parentId: string | null
    children: DrillDownPathNode[]
}

export interface DrillDownPathNodeFilter {
    filterColumn: string
    filterValues: string[]
    type: DrillDownPathNodeFilterType
}

export interface TopBottomRange {
    top: number,
    bottom: number
}

type DrillDownPathNodeFilterType = 'EQUALS' | 'IN' | 'NOT_IN'