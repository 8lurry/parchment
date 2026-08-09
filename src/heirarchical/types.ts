import type ParentBlot from '../blot/abstract/parent.js';
import type { Blot } from '../parchment.js';

export enum containerRestoreAction {
    REUSE = 'REUSE',
    START = 'START',
    MERGE_TO_PREV = 'MERGE_TO_PREV',
}

export type ContainerRestoreAction = keyof typeof containerRestoreAction;

export type ContainerInsertionInfo = {
    blot: ParentBlot;
    container: SerializedContainer;
    firstLine: boolean;
};

export type ContainerRemovalInfo = {
    blot: ParentBlot;
    firstLine: boolean;
};

export type SerializeContainerOptions = {
    boundary?: Blot;
    insertion?: ContainerInsertionInfo;
    removal?: ContainerRemovalInfo;
};

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
