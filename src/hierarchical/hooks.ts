import type { Blot, Parent } from "../blot/abstract/blot.js";
import type ParentBlot from "../blot/abstract/parent.js";
import type ContainerBlot from "../blot/abstract/container.js";
import type BlockBlot from "../blot/block.js";
import type EmbedBlot from "../blot/embed.js";
import type {
  ContainerInsertionInfo,
  SerializedContainer,
  SerializeContainerOptions,
  ExistingContainer,
  ContainerFormatValue,
} from "./types.js";
import { containerRestoreAction } from "./types.js";

export function formatContainer(value: ContainerFormatValue): void {
  // @ts-expect-error
  const block: BlockBlot | EmbedBlot = this;
  const level = value.level ?? 0;

  const chain = collectContainerChain(block);

  const target = chain[level];

  if (!target) {
    return;
  }

  if (
    value.blot &&
    target.blotName !== value.blot
  ) {
    return;
  }

  Object.entries(value.formats).forEach(
    ([name, val]) => {
      target.blot.format(name, val);
    },
  );
}

export function collectContainerChain(block: BlockBlot | EmbedBlot): ExistingContainer[] {
  const chain: ExistingContainer[] = [];

  let current = block.parent;

  while (current && current.statics.blotName !== 'scroll') {
    chain.push({
      blot: current as ContainerBlot,
      blotName: current.statics.blotName,
    });
    current = current.parent;
  }

  return chain;
}


export function updateFormats(
    blot: ContainerBlot,
    desired: Record<string, unknown>,
  ): void {
  const current = blot.formats() || {};
  if(!('classes' in desired) && blot.statics.className) {
    desired.classes = {};
    blot.statics.className.split(' ').forEach((cls: string) => {
      (desired.classes as Record<string, boolean>)[cls] = true;
    });
  }

  // Remove formats no longer present.
  Object.keys(current).forEach((name) => {
    if (!(name in desired)) {
      blot.format(name, false);
    }
  });

  // Apply desired formats.
  Object.entries(desired).forEach(([name, value]) => {
    blot.format(name, value);
  });
}



export function restoreContainers(containers: SerializedContainer[]): void {
  // @ts-expect-error
  const block: BlockBlot | EmbedBlot = this;
  const prev = block.prev;
  const next = block.next;
  const existing = collectContainerChain(block);
  let prevExisting: ExistingContainer[] = [];

  const boundary = getPreviousBlock(block);
  if(boundary) {
    prevExisting = collectContainerChain(boundary);
  }

    containers =[...containers].reverse();

  let started = false;
  let activeCurrent = block.scroll as unknown as ParentBlot;
  let newContainerCreated = false;
  let brokenOutFromPrev = false;
  let currentNext: Blot | null = null;
  if(prevExisting.length && containers.length && containers[0].action === containerRestoreAction.MERGE_TO_PREV) {
    currentNext = prevExisting[prevExisting.length - 1].blot.next;
  }
  if (!currentNext && existing.length) {
    currentNext = existing[existing.length - 1].blot.next;
  }

  for (let i = 0; i < containers.length; i++) {
    const serialized = containers[i];
    let current: ExistingContainer | undefined;
    if (!started && serialized.action === containerRestoreAction.START) {
      started = true;
    }
    if (!started && !brokenOutFromPrev && serialized.action === containerRestoreAction.MERGE_TO_PREV && prevExisting.length) {
      current = prevExisting.pop();
      existing.pop();
      const nextContainer = containers[i + 1];
      if (prevExisting.length) {
        if (!nextContainer) {
          currentNext = prevExisting[prevExisting.length - 1].blot.next;
        } else if (nextContainer.action !== containerRestoreAction.REUSE) {
          currentNext = prevExisting[prevExisting.length - 1].blot.next;
        } else if (existing.length) {
          currentNext = existing[existing.length - 1].blot.next;
        } else {
          currentNext = null;
        }
      } else if (existing.length) {
        if (!nextContainer || nextContainer.action !== containerRestoreAction.REUSE) {
          currentNext = existing[existing.length - 1].blot;
        } else {
          currentNext = existing[existing.length - 1].blot.next;
        }
      } else {
        currentNext = next;
      }
    } else if (existing.length && !started) {
      brokenOutFromPrev = true;
      current = existing.pop();
      if (current?.blot.parent !== activeCurrent) {
        current = undefined;
      }
      if (existing.length) {
        currentNext = existing[existing.length - 1].blot.next;
      } else {
        currentNext = next;
      }
    } else {
      current = undefined;
      currentNext = null;
    }

    if (started || !current || current.blotName !== serialized.blot) {
      started = true;
      if (!newContainerCreated) {
        if (existing.length && existing[existing.length - 1].blot.parent === activeCurrent) {
          currentNext = activeCurrent.stripContainer(prev as Blot, next as Blot, block, activeCurrent as ParentBlot);
        }
      }
      newContainerCreated = true;
      const newContainer = block.scroll.create(serialized.blot) as ContainerBlot;
      if (block.parent === activeCurrent) {
        block.parent.insertBefore(newContainer, next);
        currentNext = null;
      } else if (existing.length && currentNext) {
        (activeCurrent as ParentBlot).insertBefore(newContainer, currentNext);
        currentNext = null;
      } else {
        (activeCurrent as ParentBlot).appendChild(newContainer);
      }
      activeCurrent = newContainer;
      if (serialized.formats) {
        updateFormats(newContainer, serialized.formats);
      }
    } else {
      activeCurrent = current.blot;
      if (serialized.formats) {
        updateFormats(current.blot, serialized.formats);
      }
    }
  }
  if (existing.length && !newContainerCreated) {
    currentNext = activeCurrent.stripContainer(prev as Blot, next as Blot, block, activeCurrent as ParentBlot);
  }
  if (activeCurrent !== block.parent) {
    (activeCurrent as ParentBlot).insertBefore(
      block,
      currentNext?.parent === activeCurrent ? currentNext : undefined
    );
  }
}


function getPreviousBlock(blot: Blot): BlockBlot | EmbedBlot | undefined {
  const index = blot.offset(blot.scroll);
  if (index <= 0) {
    return;
  }
  const [previousBlock] = blot.scroll.descendant(
    (blot: Blot) => blot.statics.isBlock as boolean,
    index - 1,
  ) as [BlockBlot | EmbedBlot | null, number];
  return previousBlock || undefined;
}

export function serializeContainers(options ?: SerializeContainerOptions): SerializedContainer[] {
  // @ts-expect-error
  const block: BlockBlot | EmbedBlot = this;
  const containers: SerializedContainer[] = [];
  let boundary = options && options.boundary;

  if (!boundary) {
    boundary = getPreviousBlock(block);
  }

  let current = block.parent;
  let action = containerRestoreAction.REUSE;

  if (current.statics.blotName === 'scroll' && options?.insertion?.blot.statics.blotName === 'scroll') {
    containers.push(sanitizeContainer(options.insertion));
  }

  while (current && current.statics.blotName !== 'scroll') {
    if (current === options?.removal?.blot) {
      current = current.parent;
      if (containers.length > 0) {
        containers[containers.length - 1].action = options.removal.firstLine ? containerRestoreAction.START : containerRestoreAction.MERGE_TO_PREV;
      }
      continue;
    }

    if (current === options?.insertion?.blot) {
      containers.push(sanitizeContainer(options.insertion))
    }

    const formats = (current as ContainerBlot).formats();
    if (boundary && action !== containerRestoreAction.MERGE_TO_PREV) {
      if (isChildOf(boundary, current)) {
        action = containerRestoreAction.MERGE_TO_PREV;
      }
    }

    const properties: SerializedContainer = {
      blot: current.statics.blotName,
      action,
      allowSplit: (current as ContainerBlot).allowSplit(),
    }

    if (Object.keys(formats || {}).length > 0) {
      properties.formats = formats;
    }
    containers.push(properties);

    current = current.parent;
  }

  return containers;
}

function isChildOf(blot: Blot, parent: Parent): boolean {
  const blotOffset = blot.offset(blot.scroll);
  const parentOffset = parent.offset(blot.scroll);
  return (
    blotOffset >= parentOffset &&
    blotOffset + blot.length() <= parentOffset + parent.length()
  );
}

function sanitizeContainer(info: ContainerInsertionInfo): SerializedContainer {
  const { container, firstLine } = info;
  const sanitized: SerializedContainer = { ...container };
  if (!firstLine) {
    sanitized.action = containerRestoreAction.MERGE_TO_PREV;
  }
  return sanitized;
}
