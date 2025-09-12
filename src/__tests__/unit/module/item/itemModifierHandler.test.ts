import {expect} from 'chai';
import sinon, {SinonSandbox, SinonStubbedInstance} from 'sinon';
import {ItemModifierHandler} from "module/item/itemModifierHandler";
import SplittermondItem from "module/item/item";
import {foundryApi} from 'module/api/foundryApi';
import {clearMappers} from "module/modifiers/parsing/normalizer";
import {of} from "module/modifiers/expressions/scalar";
import type {ScalarModifier} from "module/modifiers/parsing";

describe('ItemModifierHandler', () => {
    let sandbox: SinonSandbox;
    let allErrors: string[];
    let handler: ItemModifierHandler;
    let mockItem: SinonStubbedInstance<SplittermondItem>;
    let logErrorsStub: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        clearMappers();
        allErrors = [];
        logErrorsStub = sandbox.stub().callsFake((...messages: string[]) => {
            allErrors.push(...messages);
        });

        mockItem = sandbox.createStubInstance(SplittermondItem);
        mockItem.name = 'Test Item';

        handler = new ItemModifierHandler(logErrorsStub, mockItem, 'equipment');

        sandbox.stub(foundryApi, 'localize').callsFake((key: string) => key);
        sandbox.stub(foundryApi, 'format').callsFake((key: string, data?: any) => {
            if (key === "splittermond.modifiers.parseMessages.unknownDescriptor") {
                return `Unknown descriptor ${data.attribute}: ${data.value} in item ${data.itemName}`;
            }
            return key;
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('omitForValue', () => {
        it('should return true for zero values', () => {
            const result = (handler as any).omitForValue(of(0));
            expect(result).to.be.true;
        });

        it('should return false for non-zero values', () => {
            const result = (handler as any).omitForValue(of(5));
            expect(result).to.be.false;
        });
    });

    describe('buildModifier', () => {
        it('should create a modifier with correct properties', () => {
            const scalarModifier: ScalarModifier = {
                path: 'item.damage',
                value: of(5),
                attributes: {
                    damageType: 'fire'
                }
            };

            const result = (handler as any).buildModifier(scalarModifier);

            expect(result).to.not.be.null;
            expect(result.path).to.equal('item.damage');
            expect(result.value).to.deep.equal(of(5));
            expect(result.origin).to.equal(mockItem);
            expect(result.selectable).to.be.false;
        });
    });

    describe('buildAttributes', () => {
        it('should build attributes with item name and modifier type', () => {
            const result = handler.buildAttributes('item.damage', {});

            expect(result).to.deep.include({
                name: 'Test Item',
                type: 'equipment'
            });
        });

        it('should include additional attributes', () => {
            const result = handler.buildAttributes('item.damage', {
                damageType: 'fire',
                itemType: 'weapon'
            });

            expect(result).to.deep.include({
                name: 'Test Item',
                type: 'equipment',
                damageType: 'fire',
                itemType: 'weapon'
            });
        });
    });

    describe('mapAttribute', () => {
        it('should handle name attribute', () => {
            const result = handler.mapAttribute('item.damage', 'name', 'Custom Name');
            expect(result).to.equal('Custom Name');
        });

        it('should handle valid damage type', () => {
            const result = handler.mapAttribute('item.damage', 'damageType', 'fire');
            expect(result).to.equal('fire');
        });

        it('should reject invalid damage type', () => {
            const result = handler.mapAttribute('item.damage', 'damageType', 'invalid');
            expect(result).to.be.undefined;
            expect(allErrors).to.have.length.greaterThan(0);
        });

        it('should handle valid item type', () => {
            const result = handler.mapAttribute('item.weaponspeed', 'itemType', 'weapon');
            expect(result).to.equal('weapon');
        });

        it('should keep invalid item type', () => {
            const result = handler.mapAttribute('item.weaponspeed', 'itemType', 'invalid');
            expect(result).to.equal('invalid');
        });
    });

    describe('normalizeDamageType', () => {
        it('should normalize valid damage types', () => {
            const result = handler.normalizeDamageType('item.damage', 'fire');
            expect(result).to.equal('fire');
        });

        it('should reject invalid damage types and report error', () => {
            const result = handler.normalizeDamageType('item.damage', 'invalid');
            expect(result).to.be.undefined;
            expect(allErrors).to.have.length.greaterThan(0);
        });

        it('should handle undefined damage type', () => {
            const result = handler.normalizeDamageType('item.damage', undefined);
            expect(result).to.be.undefined;
        });
    });

    describe('normalizeItemType', () => {
        it('should handle valid item types', () => {
            const result = handler.normalizeItemType('item.weaponspeed', 'weapon');
            expect(result).to.equal('weapon');
        });

        it('should keep invalid item types', () => {
            const result = handler.normalizeItemType('item.weaponspeed', 'invalid');
            expect(result).to.equal('invalid');
        });

        it('should handle undefined item type', () => {
            const result = handler.normalizeItemType('item.weaponspeed', undefined);
            expect(result).to.be.undefined;
        });
    });

    describe('processModifier integration', () => {
        it('should process valid modifier', () => {
            const scalarModifier: ScalarModifier = {
                path: 'item.damage',
                value: of(5),
                attributes: {
                    damageType: 'fire'
                }
            };

            const result = handler.processModifier(scalarModifier);

            expect(result).to.not.be.null;
            expect(result!.groupId).to.equal('item.damage');
            expect(result!.attributes.damageType).to.equal('fire');
        });

        it('should omit modifier with zero value', () => {
            const scalarModifier: ScalarModifier = {
                path: 'item.damage',
                value: of(0),
                attributes: {}
            };

            const result = handler.processModifier(scalarModifier);

            expect(result).to.be.null;
        });

        it('should reject modifier with invalid path', () => {
            const scalarModifier: ScalarModifier = {
                path: 'actor.damage',
                value: of(5),
                attributes: {}
            };

            const result = handler.processModifier(scalarModifier);

            expect(result).to.be.null;
            expect(allErrors).to.have.length.greaterThan(0);
        });

        it('should reject modifier with unknown subpath', () => {
            const scalarModifier: ScalarModifier = {
                path: 'item.unknown',
                value: of(5),
                attributes: {}
            };

            const result = handler.processModifier(scalarModifier);

            expect(result).to.be.null;
            expect(allErrors).to.have.length.greaterThan(0);
        });
    });

    it('should report unknown attributes', () => {
        const scalarModifier: ScalarModifier = {
            path: 'item.damage',
            value: of(5),
            attributes: {
                unknownAttribute: 'value'
            }
        };

        handler.processModifier(scalarModifier);

        expect(allErrors).to.have.length.greaterThan(0);
    });
});
