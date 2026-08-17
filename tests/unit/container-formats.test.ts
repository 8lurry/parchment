import { describe, it, expect } from 'vitest';
import ParentBlot from '../../src/blot/abstract/parent.js';
import { setupContextBeforeEach, registerStylesFeature } from '../setup.js';
import type { BlockBlot, ContainerBlot } from '../../src/parchment.js';
import { containerRestoreAction } from '../../src/hierarchical/types.js';

describe('container formatting', function () {
    const ctx = setupContextBeforeEach();
    
    function initializeHTML(html: string) {
        registerStylesFeature(ctx);
        ctx.scroll.domNode.innerHTML = html;
        ctx.scroll.update();
    }

    describe('serializeContainers', function () {

        it('Serialize a single formatted container', function () {
            initializeHTML(`
                <div style="padding:2px">
                    <div style="width:50%">
                        <p>Hello</p>
                    </div>
                </div>
            `);

            const outer = ctx.scroll.children.head as ParentBlot;
            const inner = outer.children.head as ParentBlot;
            const block = inner.children.head as BlockBlot;
            expect(block.serializeContainers()).toEqual([
                {
                    action: 'REUSE',
                    allowSplit: true,
                    blot: outer.statics.blotName,
                    formats: {
                        styles: {
                            width: '50%',
                        },
                    },
                },
                {
                    action: 'REUSE',
                    allowSplit: true,
                    blot: inner.statics.blotName,
                    formats: {
                        styles: {
                            padding: '2px',
                        },
                    },
                },
            ]);
        });

        it("Serialize nested containers with empty intermediate", function () {
            initializeHTML(`
                <div style="padding:2px">
                    <div>
                        <p>Hello</p>
                    </div>
                </div>
            `);

            const outer = ctx.scroll.children.head as ParentBlot;
            const inner = outer.children.head as ParentBlot;
            const block = inner.children.head as BlockBlot;
            expect(block.serializeContainers()).toEqual([
                {
                    action: 'REUSE',
                    allowSplit: true,
                    blot: 'generic-container',
                },
                {
                    action: 'REUSE',
                    allowSplit: true,
                    blot: 'generic-container',
                    formats: {
                        styles: {
                            padding: '2px',
                        },
                    },
                },
            ]);
        });

        it("Serialize mixed formatted and empty containers", function () {
            initializeHTML(`
                <div style="padding:2px">
                    <div>
                        <div style="margin:10px">
                            <p>Hello</p>
                        </div>
                    </div>
                </div>
            `);

            const outer = ctx.scroll.children.head as ParentBlot;
            const inner = outer.children.head as ParentBlot;
            const inner2 = inner.children.head as ParentBlot;
            const block = inner2.children.head as BlockBlot;
            expect(block.serializeContainers()).toEqual([
                {
                    action: 'REUSE',
                    allowSplit: true,
                    blot: 'generic-container',
                    formats: {
                        styles: {
                            margin: '10px',
                        },
                    },
                },
                {
                    action: 'REUSE',
                    allowSplit: true,
                    blot: 'generic-container',
                },
                {
                    action: 'REUSE',
                    allowSplit: true,
                    blot: 'generic-container',
                    formats: {
                        styles: {
                            padding: '2px',
                        },
                    },
                },
            ]);
        });
    });

    describe("restoreContainers", function () {

        it("Restore one container", function () {
            initializeHTML(`<p>Hello</p>`);

            const block = ctx.scroll.children.head as BlockBlot;
            block.restoreContainers([
                {
                    action: containerRestoreAction.REUSE,
                    blot: 'generic-container',
                    formats: {
                        styles: {
                            padding: '2px',
                        },
                    },
                },
            ]);

            expect(ctx.scroll.domNode.innerHTML).toEqual(
                `<div style="padding: 2px;"><p>Hello</p></div>`,
            );
        });

        it("Restore multiple containers", function () {
            initializeHTML(`<p>Hello</p>`);

            const block = ctx.scroll.children.head as BlockBlot;
            block.restoreContainers([
                {
                    action: containerRestoreAction.REUSE,
                    blot: 'generic-container',
                    formats: {
                        styles: {
                            width: '50%',
                        },
                    },
                },
                {
                    action: containerRestoreAction.REUSE,
                    blot: 'generic-container',
                    formats: {
                        styles: {
                            padding: '2px',
                        },
                    },
                },
            ]);

            expect(ctx.scroll.domNode.innerHTML).toEqual(
                `<div style="padding: 2px;"><div style="width: 50%;"><p>Hello</p></div></div>`,
            );
        });

        it("Restore replaces an existing hierarchy", function () {
            initializeHTML(`
                <div style="color:red">
                    <p>Hello</p>
                </div>
            `);

            const outer = ctx.scroll.children.head as ParentBlot;
            const block = outer.children.head as BlockBlot;
            block.restoreContainers([
                {
                    blot: 'generic-container',
                    formats: {
                        styles: {
                            width: '50%',
                        },
                    },
                },
            ]);

            expect(ctx.scroll.domNode.innerHTML).toEqual(
                `<div style="width: 50%;"><p>Hello</p></div>`,
            );
        });

        it("Restore empty containers", function () {
            initializeHTML('<p>Hello</p>');

            const block = ctx.scroll.children.head as BlockBlot;

            block.restoreContainers([
                {
                    blot: 'generic-container',
                },
                {
                    blot: 'generic-container',
                    formats: {
                        styles: {
                            padding: '2px',
                        },
                    },
                },
            ]);

            expect(ctx.scroll.domNode.innerHTML).toEqual(
                `<div style="padding: 2px;"><div><p>Hello</p></div></div>`,
            );
        });
    });

    describe("round-trip tests", function () {
        it("serialize → restore → serialize", function () {
            initializeHTML(`
                <div style="padding: 2px;">
                    <div>
                        <div style="margin: 10px;">
                            <p>Hello</p>
                        </div>
                    </div>
                </div>
            `);

            const outer = ctx.scroll.children.head as ParentBlot;
            const inner = outer.children.head as ParentBlot;
            const inner2 = inner.children.head as ParentBlot;
            const block = inner2.children.head as BlockBlot;

            const containers = block.serializeContainers();
            block.restoreContainers(containers);

            expect(ctx.scroll.domNode.innerHTML).toEqual(
                `<div style="padding: 2px;"><div><div style="margin: 10px;"><p>Hello</p></div></div></div>`,
            );
            expect(block.serializeContainers()).toEqual(containers);
        });

        it("restore → serialize → restore", function () {
            initializeHTML(`<p>Hello</p>`);

            const block = ctx.scroll.children.head as BlockBlot;

            const containers = [
                {
                    action: containerRestoreAction.REUSE,
                    allowSplit: true,
                    blot: 'generic-container',
                    formats: {
                        styles: {
                            width: '50%',
                        },
                    },
                },
                {
                    action: containerRestoreAction.REUSE,
                    allowSplit: true,
                    blot: 'generic-container',
                    formats: {
                        styles: {
                            padding: '2px',
                        },
                    },
                },
            ];

            block.restoreContainers(containers);
            expect(block.serializeContainers()).toEqual(containers);

            block.restoreContainers(block.serializeContainers());
            expect(ctx.scroll.domNode.innerHTML).toEqual(
                `<div style="padding: 2px;"><div style="width: 50%;"><p>Hello</p></div></div>`,
            );
        });

        it("Idempotency", function () {
            initializeHTML(`
                <div style="padding: 2px;">
                    <div>
                        <div style="margin: 10px;">
                            <p>Hello</p>
                        </div>
                    </div>
                </div>
            `);

            const outer = ctx.scroll.children.head as ParentBlot;
            const inner = outer.children.head as ParentBlot;
            const inner2 = inner.children.head as ParentBlot;
            const block = inner2.children.head as BlockBlot;

            const containers = block.serializeContainers();
            block.restoreContainers(containers);
            block.restoreContainers(containers);
            block.restoreContainers(containers);
            expect(block.serializeContainers()).toEqual(containers);
        });
    });

    describe('split container chains', function () {
        it('split container chain', function () {
            initializeHTML(`
                <div style="padding: 2px;">
                    <div>
                        <div style="margin: 10px;">
                            <p>Hello</p>
                            <p>World</p>
                            <p>TIA</p>
                        </div>
                    </div>
                </div>
            `);

            const outer = ctx.scroll.children.head as ContainerBlot;
            const inner = outer.children.head as ParentBlot;
            const inner2 = inner.children.head as ParentBlot;
            const block2 = inner2.children.head?.next as BlockBlot;

            const newContainer = outer.splitContainerChain(block2, null);
            expect(newContainer).not.toBeNull();
            expect(ctx.scroll.children.length).toBe(2);
            expect(newContainer!.prev).toBe(outer);

            expect(ctx.scroll.domNode.innerHTML).toEqual(
                `<div style="padding: 2px;"><div><div style="margin: 10px;"><p>Hello</p><p>World</p></div></div></div><div style="padding: 2px;"><div><div style="margin: 10px;"><p>TIA</p></div></div></div>`,
            );
        });

        it('split container chain with under', function () {
            initializeHTML(`
                <div style="padding: 2px;">
                    <div>
                        <div style="margin: 10px;">
                            <p>Hello</p>
                            <p>World</p>
                            <p>TIA</p>
                        </div>
                    </div>
                </div>
            `);

            const outer = ctx.scroll.children.head as ContainerBlot;
            const inner = outer.children.head as ContainerBlot;
            const inner2 = inner.children.head as ContainerBlot;
            const block2 = inner2.children.head?.next as BlockBlot;

            const newContainer = outer.splitContainerChain(block2, inner);
            expect(newContainer).not.toBeNull();
            expect(ctx.scroll.children.length).toBe(1);
            expect(newContainer!.prev).toBe(inner2);

            expect(ctx.scroll.domNode.innerHTML).toEqual(
                `<div style="padding: 2px;"><div><div style="margin: 10px;"><p>Hello</p><p>World</p></div><div style="margin: 10px;"><p>TIA</p></div></div></div>`,
            );
        });
    });
});