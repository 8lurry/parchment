import Attributor from './attributor.js';
import Registry from '../registry.js';
import type { ContainerFormatValue } from '../hierarchical/types.js';
import { formatContainer } from '../hierarchical/hooks.js';


class ContainerAttributor extends Attributor {
    public add(node: HTMLElement, value: ContainerFormatValue): boolean {
        const blot = Registry.find(node);
        if (!blot?.statics.isBlock) {
            return false;
        }

        formatContainer.call(blot, value);

        return false;
    }
}


export default ContainerAttributor;

export const ContainerAttributorInstance = new ContainerAttributor('container', 'data-container')
