import Attributor from './attributor.js';
import Registry from '../registry.js';
import ClassAttributor from './class.js';
import Scope from '../scope.js';


function inlineClassToObject(el: HTMLElement): [Record<string, boolean> | null, Record<string, Attributor>, Record<string, string>] {
    const klass = el.getAttribute('class') || '';
    const out: Record<string, boolean> = {};
    const reg = ClassesAttributor.getRegistry(el);
    const classes: Record<string, Attributor> = {};
    const overrides: Record<string, string> = {};

    klass?.split(' ').forEach((klassName) => {
        const prefix = klassName.split('-').slice(0, -1).join('-');
        const attributor = reg?.query(prefix, Scope.ATTRIBUTE)
        if (attributor && attributor instanceof ClassAttributor) {
            classes[klassName] = attributor;
            overrides[attributor.attrName] = klassName;
        } else {
            out[klassName] = true;
        }
    });

    if (Object.keys(out).length === 0) {
        return [null, classes, overrides];
    }

    return [out, classes, overrides];
}


class ClassesAttributor extends Attributor {
  public static reg: Registry | null = null;
  
  static getRegistry(domNode: HTMLElement): Registry | null {
    if (ClassesAttributor.reg) {
      return ClassesAttributor.reg;
    }
    const blot = Registry.find(domNode);
    if (blot == null) {
      return null;
    }
    ClassesAttributor.reg = (blot.scroll as any)?.registry;
    return ClassesAttributor.reg;
  }

  static keys(node: HTMLElement): string[] {
    const blot = Registry.find(node);
    if (blot != null && !blot.scroll.containerFormats) {
      return [];
    }
    return node.classList.length > 0 ? [ 'classes' ] : [];
  }

  public add(node: HTMLElement, value: Record<string, any>, klass?: ClassAttributor): boolean {
    if (!klass && !this.canAdd(node, value)) {
      return false;
    }
    
    const reg = ClassesAttributor.getRegistry(node);
    if (!reg) {
      throw new Error('Unable to find registry for domNode');
    }
    const blot = reg.find(node);
    if (!blot) {
      throw new Error('Unable to find blot for domNode');
    }
    const [current,, overrides] = inlineClassToObject(node);
    if (!klass) {
      if (blot.statics.className) {
        value[blot.statics.className] = true;
      }
      Object.keys(current || {}).forEach((key) => {
        if (!(key in value)) {
          value[key] = false;
        }
      });
    }
    Object.entries(value).forEach(([key, val]) => {
      if (val === false) {
        if (node.classList.contains(key)) {
          this.removeClass(node, key);
        }
        return;
      }
      if (!klass) {
        const prefix = key.split('-').slice(0, -1).join('-');
        klass = reg.query(prefix, Scope.ATTRIBUTE) as ClassAttributor;
      }
      if (klass instanceof ClassAttributor) {
        if (klass.attrName in overrides) {
          this.removeClass(node, overrides[klass.attrName], klass);
        }
        overrides[klass.attrName] = key;
        (blot as any).attributes.attributes[klass.attrName] = klass;
      } else if (blot.scroll.containerFormats) {
        (blot as any).attributes.attributes[this.attrName] = this;
      }
      node.classList.add(key);
    });
    if (!node.getAttribute('class')) {
      this.remove(node);
      return false;
    }
    return true;
  }

  public remove(node: HTMLElement): void {
    const reg = ClassesAttributor.getRegistry(node);
    if (!reg) {
      throw new Error('Unable to find registry for domNode');
    }
    const classes = inlineClassToObject(node)[1];
    const blot = reg.find(node);
    if (!blot) {
      throw new Error('Unable to find blot for domNode');
    }
    Object.keys(classes).forEach((key) => {
      delete (blot as any).attributes.attributes[classes[key].attrName];
    });
    node.removeAttribute('class');
    delete (blot as any).attributes.attributes[this.attrName];
  }

  public removeClass(node: HTMLElement, key: string, klass?: ClassAttributor): void {
    node.classList.remove(key);
    const reg = ClassesAttributor.getRegistry(node);
    if (reg) {
      if (!klass) {
        const prefix = key.split('-').slice(0, -1).join('-');
        klass = reg.query(prefix, Scope.ATTRIBUTE) as ClassAttributor;
      }
      const blot = reg.find(node);
      if (klass instanceof ClassAttributor) {
        delete (blot as any)?.attributes.attributes[klass.attrName];
      } else if (blot?.scroll.containerFormats) {
        const keys = inlineClassToObject(node)[0];
        if (!keys || !Object.keys(keys).length) {
          delete (blot as any)?.attributes.attributes[this.attrName];
        }
      }
    }
    if (!node.getAttribute('class')) {
      this.remove(node);
    }
  }

  public value(node: HTMLElement): any {
    const blot = Registry.find(node);
    if (blot != null && !blot.scroll.containerFormats) {
      return undefined;
    }
    const val = inlineClassToObject(node)[0];
    if (!val || Object.keys(val).length === 0) {
      return undefined;
    }
    return val;
  }

  public canAdd(node: HTMLElement, value: any): boolean {
    const blot = Registry.find(node);
    if (blot != null && !blot.scroll.containerFormats) {
      return false;
    }
    return value && typeof value === "object"
  }
}

export default ClassesAttributor;
export const Classes = new ClassesAttributor('classes', 'classes');
