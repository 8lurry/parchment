import Attributor from './attributor.js';
import Registry from '../registry.js';
import type { ContainerFormatValue } from '../heirarchical/types.js';
import BlockBlot from '../blot/block.js';


class ContainerAttributor extends Attributor {
    public add(node: HTMLElement, value: ContainerFormatValue): boolean {
        const blot = Registry.find(node);
        if (blot && !blot.scroll.containerFormats) {
            return false;
        }

        if (!(blot instanceof BlockBlot)) {
            return false;
        }

        blot.formatContainer(value);

        return true;
    }
}


export default ContainerAttributor;

export const ContainerAttributorInstance = new ContainerAttributor('container', 'data-container')
