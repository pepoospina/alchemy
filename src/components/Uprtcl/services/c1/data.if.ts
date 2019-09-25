
export interface DataC1If {
    id: string;
    type: string;
    jsonData: string;
}

export interface DraftC1If {
    elementId: string;
    data: DataC1If;
}

export class DataC1 implements DataC1If {
    id: string;    
    type: string;
    jsonData: string;
}

export class DraftC1 implements DraftC1If {
    elementId: string;    
    data: DataC1If;
}