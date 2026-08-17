import Attributor from './attributor.js';
import Registry, { findBlotAndRegistry } from '../registry.js';
import ClassAttributor from './class.js';
import Scope from '../scope.js';


function inlineClassToObject(el: HTMLElement): [Record<string, boolean>, Record<string, Attributor>, Record<string, string>] {
    const klass = el.getAttribute('class') || '';
    const out: Record<string, boolean> = {};
    const reg = findBlotAndRegistry(el).registry;
    const classes: Record<string, Attributor> = {};
    const overrides: Record<string, string> = {};

    klass?.split(' ').map(cls => cls.trim()).filter(cls => !!cls).forEach((klassName) => {
        const prefix = klassName.split('-').slice(0, -1).join('-');
        const attributor = reg?.query(prefix, Scope.ATTRIBUTE)
        if (attributor && attributor instanceof ClassAttributor) {
            classes[klassName] = attributor;
            overrides[attributor.attrName] = klassName;
        } else {
            out[klassName] = true;
        }
    });

    return [out, classes, overrides];
}


class ClassesAttributor extends Attributor {
  static keys(node: HTMLElement): string[] {
    return node.classList.length > 0 ? [ 'classes' ] : [];
  }

  public add(node: HTMLElement, value: Record<string, any>, klass?: ClassAttributor): boolean {
    if (!klass && !this.canAdd(node, value)) {
      return false;
    }
    
    const { blot, registry } = findBlotAndRegistry(node);
    if (!blot) {
      throw new Error('Unable to find blot for domNode');
    }
    const [current,, overrides] = inlineClassToObject(node);
    if (!klass) {
      if (blot.statics.className) {
        value[blot.statics.className] = true;
      }
      Object.keys(current).forEach((key) => {
        if (!(key in value)) {
          value[key] = false;
        }
      });
    }
    Object.entries(value).forEach(([key, val]) => {
      let localKlass = klass;
      if (!localKlass) {
        const prefix = key.split('-').slice(0, -1).join('-');
        localKlass = registry!.query(prefix, Scope.ATTRIBUTE) as ClassAttributor;
      }
      if (val === false) {
        if (node.classList.contains(key)) {
          this.removeClass(node, key, localKlass, !klass);
        }
        return;
      }
      if (localKlass instanceof ClassAttributor) {
        if (localKlass.attrName in overrides) {
          this.removeClass(node, overrides[localKlass.attrName], localKlass);
        }
        overrides[localKlass.attrName] = key;
        if (!klass) {
          (blot as any).attributes.attributes[localKlass.attrName] = localKlass;
        }
      }
      node.classList.add(key);
    });
    if (node.classList.length === 0) {
      node.removeAttribute('class');
    }
    return true;
  }

  public remove(node: HTMLElement): void {
    const blot = Registry.find(node);
    if (!blot) {
      throw new Error('Unable to find blot for domNode');
    }
    const [out, classes, overrides] = inlineClassToObject(node);
    Object.values(classes).forEach((attributor) => {
      delete (blot as any).attributes.attributes[attributor.attrName];
    });
    if (blot.statics.className) {
      Object.values(overrides).concat(Object.keys(out)).forEach((cls) => {
        if (cls !== blot.statics.className) {
          node.classList.remove(cls);
        }
      })
    } else {
      node.removeAttribute('class');
    }
  }

  public removeClass(node: HTMLElement, key: string, klass?: ClassAttributor, removeAttr: boolean = false): void {
    node.classList.remove(key);
    const blot = Registry.find(node);
    if (blot && removeAttr && klass && klass instanceof ClassAttributor) {
      delete (blot as any)?.attributes.attributes[klass.attrName];
    }
    if (node.classList.length === 0) {
      node.removeAttribute("class");
    }
  }

  public value(node: HTMLElement): any {
    const val = inlineClassToObject(node)[0];
    if (Object.keys(val).length === 0) {
      return undefined;
    }
    return val;
  }

  public canAdd(_node: HTMLElement, value: any): boolean {
    return value && typeof value === "object"
  }
}

export default ClassesAttributor;
export const Classes = new ClassesAttributor('classes', 'classes');
