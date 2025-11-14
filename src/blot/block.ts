import Attributor from '../attributor/attributor.js';
import AttributorStore from '../attributor/store.js';
import Scope from '../scope.js';
import type {
  Blot,
  BlotConstructor,
  Formattable,
  Root,
} from './abstract/blot.js';
import LeafBlot from './abstract/leaf.js';
import ParentBlot from './abstract/parent.js';
import InlineBlot from './inline.js';

class BlockBlot extends ParentBlot implements Formattable {
  public static blotName = 'block';
  public static scope = Scope.BLOCK_BLOT;
  public static tagName: string | string[] = 'P';
  public static allowedChildren: BlotConstructor[] = [
    InlineBlot,
    BlockBlot,
    LeafBlot,
  ];

  static create(value?: unknown) {
    return super.create(value) as HTMLElement;
  }

  public static formats(domNode: HTMLElement, scroll: Root): any {
    const match = scroll.query(BlockBlot.blotName);
    if (
      match != null &&
      domNode.tagName === (match as BlotConstructor).tagName
    ) {
      return undefined;
    } else if (typeof this.tagName === 'string') {
      return true;
    } else if (Array.isArray(this.tagName)) {
      return domNode.tagName.toLowerCase();
    }
  }

  protected attributes: AttributorStore;

  // Required container blot names — used to filter formats that belong to a parent container
  requiredContainersNames: string[];

  constructor(scroll: Root, domNode: Node) {
    super(scroll, domNode);
    this.attributes = new AttributorStore(this.domNode);
    let rc = this.statics.requiredContainer;
    const parentNames: string[] = [];
    while (rc != null) {
      parentNames.push(rc.blotName);
      rc = (rc as any).requiredContainer;
    }
    this.requiredContainersNames = parentNames;
  }

  public format(name: string, value: any): void {
    if (this.requiredContainersNames.includes(name)) {
      let parentContainer = this.statics.requiredContainer,
        parent = this.parent;
      while (parentContainer != null) {
        // Parent containers may not be initialized yet — they'll be ready after optimize(), so later call to format will succeed.
        if (!(parent instanceof parentContainer)) {
          break;
        }
        if (name == parentContainer.blotName) {
          // @ts-expect-error - parent may not declare format in its type
          if (typeof parent.format !== 'function') {
            throw new Error(
              `Parent blot ${(parent.constructor as BlotConstructor).blotName} missing 'format' method`,
            );
          }
          // @ts-expect-error - here we are already safe, hack with typescript
          parent.format(name, value);
          break;
        }
        parentContainer = (parentContainer as BlotConstructor)
          .requiredContainer;
        parent = parent.parent;
      }
      return;
    }
    const format = this.scroll.query(name, Scope.BLOCK);
    if (format == null) {
      return;
    } else if (format instanceof Attributor) {
      this.attributes.attribute(format, value);
    } else if (name === this.statics.blotName && !value) {
      this.replaceWith(BlockBlot.blotName);
    } else if (
      value &&
      (name !== this.statics.blotName || this.formats()[name] !== value)
    ) {
      this.replaceWith(name, value);
    }
  }

  public formats(): { [index: string]: any } {
    const formats = this.attributes.values();
    const format = this.statics.formats(this.domNode, this.scroll);
    if (format != null) {
      formats[this.statics.blotName] = format;
    }
    return formats;
  }

  public formatAt(
    index: number,
    length: number,
    name: string,
    value: any,
  ): void {
    if (this.scroll.query(name, Scope.BLOCK) != null) {
      this.format(name, value);
    } else {
      super.formatAt(index, length, name, value);
    }
  }

  public insertAt(index: number, value: string, def?: any): void {
    if (def == null || this.scroll.query(value, Scope.INLINE) != null) {
      // Insert text or inline
      super.insertAt(index, value, def);
    } else {
      const after = this.split(index);
      if (after != null) {
        const blot = this.scroll.create(value, def);
        after.parent.insertBefore(blot, after);
      } else {
        throw new Error('Attempt to insertAt after block boundaries');
      }
    }
  }

  public replaceWith(name: string | Blot, value?: any): Blot {
    const replacement = super.replaceWith(name, value) as BlockBlot;
    this.attributes.copy(replacement);
    return replacement;
  }

  public update(
    mutations: MutationRecord[],
    context: { [key: string]: any },
  ): void {
    super.update(mutations, context);
    const attributeChanged = mutations.some(
      (mutation) =>
        mutation.target === this.domNode && mutation.type === 'attributes',
    );
    if (attributeChanged) {
      this.attributes.build();
    }
  }
}

export default BlockBlot;
