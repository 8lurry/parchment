import type ContainerBlot from '../blot/abstract/container.js'
import type BlockBlot from '../blot/block.js';
import type EmbedBlot from '../blot/embed.js';

export enum containerRestoreAction {
    REUSE = 'REUSE',
    START = 'START',
    MERGE_TO_PREV = 'MERGE_TO_PREV',
}

export type ContainerRestoreAction = keyof typeof containerRestoreAction;

export type ContainerInsertionInfo = {
    blot: ContainerBlot;
    container: SerializedContainer;
    firstLine: boolean;
};

export type ContainerRemovalInfo = {
    blot: ContainerBlot;
    firstLine: boolean;
};

export type SerializeContainerOptions = {
    boundary?: BlockBlot | EmbedBlot;
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
    blot: ContainerBlot;
    blotName: string;
}

export interface ContainerFormatValue {
    level?: number;      // default 0 (innermost)
    blot?: string;
    formats: Record<string, any>;
}
