import Attributor from './attributor.js';
import Registry, { findBlotAndRegistry } from '../registry.js';
import StyleAttributor, { camelize } from './style.js';
import Scope from '../scope.js';

function hiphenate(name: string): string {
  return name.replace(/[A-Z]/g, (match) => '-' + match.toLowerCase());
}

function inlineStyleToObject(el: HTMLElement): [Record<string, string>, Record<string, Attributor>] {
    // const style = el.style;
    const style = el.getAttribute('style');
    const out: Record<string, string> = {};
    const reg = findBlotAndRegistry(el).registry;
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

    return [out, styles];
}


class StylesAttributor extends Attributor {
  static keys(node: HTMLElement): string[] {
    return Styles.value(node) ? ['styles'] : [];
  }

  public add(node: HTMLElement, value: Record<string, any>, style?: StyleAttributor): boolean {
    if (!style && !this.canAdd(node, value)) {
      return false;
    }
    const { blot, registry } = findBlotAndRegistry(node);
    if (!blot) {
      throw new Error('Unable to find a blot for domNode');
    }
    if (!style) {
      const current = inlineStyleToObject(node)[0];
      Object.keys(current).forEach((key) => {
        if (!(key in value)) {
          value[key] = false;
        }
      });
    }
    Object.entries(value).forEach(([key, val]) => {
      let localStyle = style;
      if (!localStyle) {
        localStyle = registry!.query(hiphenate(key), Scope.ATTRIBUTE) as StyleAttributor;
      }
      if (val === false || val == null) {
        this.removeStyle(node, key, localStyle, !style);
        return;
      }
      (node.style as any)[camelize(key)] = val;
      if (blot) {
        if (localStyle instanceof StyleAttributor && !style) {
          (blot as any).attributes.attributes[localStyle.attrName] = localStyle;
        }
      }
    });
    if (!node.getAttribute('style')) {
      node.removeAttribute('style');
    }
    return true;
  }

  public remove(node: HTMLElement): void {
    const blot = Registry.find(node);
    if (!blot) {
      throw new Error('Unable to find blot for domNode');
    }
    const styles = inlineStyleToObject(node)[1];
    Object.values(styles).forEach((attributor) => {
      delete (blot as any).attributes.attributes[attributor.attrName];
    });
    node.removeAttribute('style');
  }

  public removeStyle(node: HTMLElement, key: string, style?: StyleAttributor, removeAttr: boolean = false): void {
    (node.style as any)[camelize(key)] = '';
    const blot = Registry.find(node);
    if (blot && removeAttr && style && style instanceof StyleAttributor) {
      delete (blot as any)?.attributes.attributes[style.attrName];
    }
    if (!node.getAttribute('style')) {
      node.removeAttribute('style');
    }
  }

  public value(node: HTMLElement): any {
    const val = inlineStyleToObject(node)[0];
    if (Object.keys(val).length === 0) {
      return undefined;
    }
    return val;
  }

  public canAdd(_node: HTMLElement, value: any): boolean {
    return value && typeof value === "object"
  }
}

export default StylesAttributor;
export const Styles = new StylesAttributor('styles', 'styles');
