import Attributor from './attributor.js';
import Registry from '../registry.js';
import StyleAttributor from './style.js';
import Scope from '../scope.js';


function camelize(name: string): string {
  const parts = name.split('-');
  const rest = parts
    .slice(1)
    .map((part: string) => part[0].toUpperCase() + part.slice(1))
    .join('');
  return parts[0] + rest;
}


function hiphenate(name: string): string {
  return name.replace(/[A-Z]/g, (match) => '-' + match.toLowerCase());
}


function inlineStyleToObject(el: HTMLElement): Record<string, string> | null {
    const style = el.style;
    const out: Record<string, string> = {};
    const reg = StylesAttributor.getRegistry(el);

    for (let i = 0; i < style.length; i++) {
        const propName = style[i];
        if (reg && reg.query(hiphenate(propName), Scope.ATTRIBUTE) instanceof StyleAttributor) {
            continue;
        }
        const propValue = style.getPropertyValue(propName);
        out[camelize(propName)] = propValue;
    }

    if (Object.keys(out).length === 0) {
        return null;
    }

    return out;
}


class StylesAttributor extends Attributor {
  public static reg: Registry | null = null;
  
  static getRegistry(domNode: HTMLElement): Registry | null {
    if (StylesAttributor.reg) {
      return StylesAttributor.reg;
    }
    const blot = Registry.find(domNode);
    if (blot == null) {
      throw new Error('Unable to find blot for domNode');
    }
    StylesAttributor.reg = (blot.scroll as any).registry;
    return StylesAttributor.reg;
  }

  static keys(node: HTMLElement): string[] {
    return Styles.value(node) ? ['style'] : [];
  }

  public add(node: HTMLElement, value: Record<string, any>): boolean {
    if (!this.canAdd(node, value)) {
      return false;
    }
    const reg = StylesAttributor.getRegistry(node);
    if (!reg) {
      throw new Error('Unable to find registry for domNode');
    }
    Object.entries(value).forEach(([key, val]) => {
      if (val === false || val == null) {
        this.removeStyle(node, key);
        return;
      }
      (node.style as any)[camelize(key)] = val;
      const style = reg.query(hiphenate(key), Scope.ATTRIBUTE);
      if (style instanceof StyleAttributor) {
        const blot = reg.find(node);
        if (blot) {
          (blot as any).attributes.attributes[style.attrName] = style;
        }
      }
    });
    return true;
  }

  public remove(node: HTMLElement): void {
    node.removeAttribute('style');
  }

  public removeStyle(node: HTMLElement, key: string): void {
    (node.style as any)[camelize(key)] = '';
    const reg = StylesAttributor.getRegistry(node);
    if (reg) {
      const style = reg.query(hiphenate(key), Scope.ATTRIBUTE);
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
    return inlineStyleToObject(node);
  }

  public canAdd(_node: HTMLElement, value: any): boolean {
    return value && typeof value === "object"
  }
}

export default StylesAttributor;
export const Styles = new StylesAttributor('styles', 'style');
