import type { Formattable, Root } from '../blot/abstract/blot.js';
import Registry from '../registry.js';
import Scope from '../scope.js';
import Attributor from './attributor.js';
import ClassAttributor from './class.js';
import StyleAttributor from './style.js';
import type ScrollBlot from '../blot/scroll.js';
import StylesAttributor, { Styles } from './styles.js';
import ClassesAttributor, { Classes } from './classes.js';

export function formatValues(attributes: Record<string, Attributor>, domNode: HTMLElement): Record<string, any> {
  return Object.keys(attributes).reduce(
    (attrs: { [key: string]: any }, name: string) => {
      attrs[name] = attributes[name].value(domNode);
      return attrs;
    },
    {},
  );
}

export function collectFormats(
  node: HTMLElement,
  scroll: Root | null,
  attributes: Record<string, Attributor> ,
): Record<string, Attributor> {

  let otherAttributes: string[] = [];
  if ((scroll as ScrollBlot)?.registry.has(Styles)) {
    otherAttributes = otherAttributes.concat(StylesAttributor.keys(node));
  }
  if ((scroll as ScrollBlot)?.registry.has(Classes)) {
    otherAttributes = otherAttributes.concat(ClassesAttributor.keys(node));
  }

  Attributor.keys(node)
    .concat(ClassAttributor.keys(node))
    .concat(StyleAttributor.keys(node))
    .concat(otherAttributes)
    .forEach(name => {
      const attr = scroll?.query(name, Scope.ATTRIBUTE);
      if (attr && attr instanceof Attributor) {
        attributes[attr.attrName] = attr;
      }
    });
  return attributes;
}

class AttributorStore {
  private attributes: { [key: string]: Attributor } = {};
  private domNode: HTMLElement;

  constructor(domNode: HTMLElement) {
    this.domNode = domNode;
    this.build();
  }

  public attribute(attribute: Attributor, value: any): void {
    // verb
    if (value) {
      if (attribute.add(this.domNode, value)) {
        if (attribute.value(this.domNode) != null) {
          this.attributes[attribute.attrName] = attribute;
        } else {
          delete this.attributes[attribute.attrName];
        }
      }
    } else {
      attribute.remove(this.domNode);
      delete this.attributes[attribute.attrName];
    }
  }

  public build(): void {
    this.attributes = {};
    const blot = Registry.find(this.domNode);
    if (blot == null) {
      return;
    }
    collectFormats(this.domNode, blot.scroll, this.attributes);
  }

  public copy(target: Formattable): void {
    Object.keys(this.attributes).forEach((key) => {
      const value = this.attributes[key].value(this.domNode);
      target.format(key, value);
    });
  }

  public move(target: Formattable): void {
    this.copy(target);
    Object.keys(this.attributes).forEach((key) => {
      this.attributes[key].remove(this.domNode);
    });
    this.attributes = {};
  }

  public values(): { [key: string]: any } {
    return formatValues(this.attributes, this.domNode);
  }
}

export default AttributorStore;
