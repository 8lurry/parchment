import Scope from '../../scope.js';
import BlockBlot from '../block.js';
import type { BlotConstructor, Root } from './blot.js';
import ParentBlot from './parent.js';
import { collectFormats, formatValues } from '../../attributor/store.js';

class ContainerBlot extends ParentBlot {
  public static blotName = 'container';
  public static scope = Scope.BLOCK_BLOT;
  public static tagName: string | string[];

  public prev!: BlockBlot | ContainerBlot | null;
  public next!: BlockBlot | ContainerBlot | null;

  public checkMerge(): boolean {
    return (
      this.next !== null && this.next.statics.blotName === this.statics.blotName
    );
  }

  public deleteAt(index: number, length: number): void {
    super.deleteAt(index, length);
    this.enforceAllowedChildren();
  }

  public formatAt(
    index: number,
    length: number,
    name: string,
    value: any,
  ): void {
    super.formatAt(index, length, name, value);
    this.enforceAllowedChildren();
  }

  public insertAt(index: number, value: string, def?: any): void {
    super.insertAt(index, value, def);
    this.enforceAllowedChildren();
  }

  public optimize(context: { [key: string]: any }): void {
    super.optimize(context);
    if (this.children.length > 0 && this.next != null && this.checkMerge()) {
      this.next.moveChildren(this);
      this.next.remove();
    }
  }

  static formats(domNode: HTMLElement, scroll: Root): Record<string, any> | undefined {
    const fmts = formatValues(collectFormats(domNode, scroll, {}), domNode);
    if (Object.keys(fmts).length > 0) {
      return fmts;
    }
    return undefined;
  }

  clone(): ContainerBlot {
    if (!this.scroll.containerFormats) {
      return super.clone() as ContainerBlot;
    }
    const clone = this.scroll.create(
      this.statics.blotName,
    ) as ContainerBlot;

    clone.updateFormats(clone, this.formats() || {});

    return clone;
  }
}

export default ContainerBlot;

export class GenericContainer extends ContainerBlot {
  public static blotName = 'generic-container';
  public static tagName = 'DIV';
  public static isGenericContainer = true;

  static allowedChildren: BlotConstructor[] = [
    ContainerBlot,
    BlockBlot,
  ];

  public checkMerge(): boolean {
    if (this.statics.blotName === 'generic-container') {
      return false;
    }
    return super.checkMerge();
  }

  public removeEmptyContainer(_context: { [key: string]: any }): boolean {
    return true;
  }
}
