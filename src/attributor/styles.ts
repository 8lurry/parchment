import Attributor from './attributor.js';
import Registry from '../registry.js';
import StyleAttributor, { camelize } from './style.js';
import Scope from '../scope.js';

function hiphenate(name: string): string {
  return name.replace(/[A-Z]/g, (match) => '-' + match.toLowerCase());
}

function inlineStyleToObject(el: HTMLElement): [Record<string, string> | null, Record<string, Attributor>] {
    // const style = el.style;
    const style = el.getAttribute('style');
    const out: Record<string, string> = {};
    const reg = StylesAttributor.getRegistry(el);
    const styles: Record<string, Attributor> = {};

    style?.split(';').forEach((styleProp) => {
        const [propName, propValue] = styleProp.split(':').map((s) => s.trim());
        if (propName.startsWith('--')) {
            return;
        }
        if (propName && propValue) {
            const attributor = reg?.query(hiphenate(propName), Scope.ATTRIBUTE)
            if (attributor && attributor instanceof StyleAttributor) {
                styles[propName] = attributor;
            } else {
                out[camelize(propName)] = propValue;
            }
        }
    });

    if (Object.keys(out).length === 0) {
        return [null, styles];
    }

    return [out, styles];
}


class StylesAttributor extends Attributor {
  public static reg: Registry | null = null;
  
  static getRegistry(domNode: HTMLElement): Registry | null {
    if (StylesAttributor.reg) {
      return StylesAttributor.reg;
    }
    const blot = Registry.find(domNode);
    if (blot == null) {
      return null;
    }
    StylesAttributor.reg = (blot.scroll as any)?.registry;
    return StylesAttributor.reg;
  }

  static keys(node: HTMLElement): string[] {
    const blot = Registry.find(node);
    if (blot && !blot.scroll.containerFormats) {
      return [];
    }
    return Styles.value(node) ? ['styles'] : [];
  }

  public add(node: HTMLElement, value: Record<string, any>, style?: StyleAttributor): boolean {
    if (!style && !this.canAdd(node, value)) {
      return false;
    }
    const reg = StylesAttributor.getRegistry(node);
    if (!reg) {
      throw new Error('Unable to find registry for domNode');
    }
    if (!style) {
      const current = inlineStyleToObject(node)[0];
      Object.keys(current || {}).forEach((key) => {
        if (!(key in value)) {
          value[key] = false;
        }
      });
    }
    Object.entries(value).forEach(([key, val]) => {
      if (val === false || val == null) {
        this.removeStyle(node, key);
        return;
      }
      (node.style as any)[camelize(key)] = val;
      if (!style) {
        style = reg.query(hiphenate(key), Scope.ATTRIBUTE) as StyleAttributor;
      }
      const blot = reg.find(node);
      if (blot) {
        if (style instanceof StyleAttributor) {
          (blot as any).attributes.attributes[style.attrName] = style;
        } else if (blot.scroll.containerFormats) {
          (blot as any).attributes.attributes[this.attrName] = this;
        }
      }
    });
    return true;
  }

  public remove(node: HTMLElement): void {
    const blot = Registry.find(node);
    const reg = StylesAttributor.getRegistry(node);
    if (!reg) {
      throw new Error('Unable to find registry for domNode');
    }
    const styles = inlineStyleToObject(node)[1];
    if (!blot) {
      throw new Error('Unable to find blot for domNode');
    }
    Object.keys(styles).forEach((key) => {
      delete (blot as any).attributes.attributes[styles[key].attrName];
    });
    node.removeAttribute('style');
    delete (blot as any).attributes.attributes[this.attrName];
  }

  public removeStyle(node: HTMLElement, key: string, style?: StyleAttributor): void {
    (node.style as any)[camelize(key)] = '';
    const reg = StylesAttributor.getRegistry(node);
    if (reg) {
      if (!style) {
        style = reg.query(hiphenate(key), Scope.ATTRIBUTE) as StyleAttributor;
      }
      if (style instanceof StyleAttributor) {
        const blot = reg.find(node);
        delete (blot as any)?.attributes.attributes[style.attrName];
      }
    }
    if (!node.getAttribute('style')) {
      this.remove(node);
    }
  }

  public value(node: HTMLElement): any {
    const blot = Registry.find(node);
    if (blot && !blot.scroll.containerFormats) {
      return undefined;
    }
    const val = inlineStyleToObject(node)[0];
    if (Object.keys(val || {}).length === 0) {
      return undefined;
    }
    return val;
  }

  public canAdd(node: HTMLElement, value: any): boolean {
    const blot = Registry.find(node);
    if (blot && !blot.scroll.containerFormats) {
      return false;
    }
    return value && typeof value === "object"
  }
}

export default StylesAttributor;
export const Styles = new StylesAttributor('styles', 'styles');
