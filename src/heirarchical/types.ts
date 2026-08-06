import type ParentBlot from '../blot/abstract/parent.js';

export enum containerRestoreAction {
    REUSE = 'REUSE',
    START = 'START',
    MERGE_TO_PREV = 'MERGE_TO_PREV',
}

export type ContainerRestoreAction = keyof typeof containerRestoreAction;

export interface SerializedContainer {
    blot: string;
    formats?: Record<string, unknown>;
    action?: ContainerRestoreAction;
    allowSplit?: boolean;
}

export interface ExistingContainer {
    blot: ParentBlot;
    blotName: string;
}

export interface ContainerFormatValue {
    level?: number;      // default 0 (innermost)
    blot?: string;
    formats: Record<string, any>;
}
