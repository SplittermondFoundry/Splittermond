import {expect} from 'chai';
import sinon, {SinonSandbox, SinonStubbedInstance} from 'sinon';
import {ItemModifierHandler, ModifierHandler} from "module/actor/modifiers/itemModifierHandler";
import SplittermondItem from "module/item/item";
import {foundryApi} from 'module/api/foundryApi';
import {splittermond} from "module/config";
import {clearMappers} from "module/actor/modifiers/parsing/normalizer";
import {validateDescriptors} from "module/actor/modifiers/parsing/validators";
import {of} from "module/actor/modifiers/expressions/scalar";
import type {ScalarModifier} from "module/actor/modifiers/parsing";

describe('ModifierHandler', () => {
    let sandbox: SinonSandbox;
    let allErrors: string[];
    let handler: ModifierHandler;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        clearMappers();
        allErrors = [];
        handler = new ModifierHandler(allErrors);

        sandbox.stub(foundryApi, 'format').callsFake((key: string, data?: any) => {
            if (key === "splittermond.modifiers.parseMessages.unknownDescriptor") {
                return `Unknown descriptor ${data.descriptor}: ${data.value} in item ${data.itemName}`;
            }
            return key;
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('reportMissingDescriptor', () => {
        it('should report missing descriptor with value', () => {
            handler.reportMissingDescriptor('damageType', 'fire', 'Test Item');

            expect(allErrors).to.have.lengthOf(1);
            expect(allErrors[0]).to.equal('Unknown descriptor damageType: fire in item Test Item');
        });

        it('should report missing descriptor with undefined value', () => {
            handler.reportMissingDescriptor('damageType', undefined, 'Test Item');

            expect(allErrors).to.have.lengthOf(1);
            expect(allErrors[0]).to.equal('Unknown descriptor damageType:  in item Test Item');
        });
    });
});

describe('ItemModifierHandler', () => {
    let sandbox: SinonSandbox;
    let allErrors: string[];
    let mockItem: SinonStubbedInstance<SplittermondItem>;
    let handler: ItemModifierHandler;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        allErrors = [];

        mockItem = sandbox.createStubInstance(SplittermondItem);
        mockItem.name = 'Test Item';

        handler = new ItemModifierHandler(allErrors, mockItem, 'equipment');

        sandbox.stub(foundryApi, 'format').callsFake((key: string, data?: any) => {
            if (key === "splittermond.modifiers.parseMessages.unknownDescriptor") {
                return `Unknown descriptor ${data.descriptor}: ${data.value} in item ${data.itemName}`;
            }
            return key;
        });

        sandbox.stub(splittermond, 'damageTypes').value(['physical', 'fire', 'ice', 'lightning']);
        sandbox.stub(splittermond, 'itemTypes').value([
            "weapon", "projectile", "equipment", "shield", "armor", "spell",
            "strength", "weakness", "mastery", "species", "culture", "ancestry",
            "education", "resource", "npcfeature", "moonsign", "language",
            "culturelore", "statuseffect", "spelleffect", "npcattack"
        ]);

        sandbox.stub({validateDescriptors}, 'validateDescriptors').returns([]);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('convertToDamageModifier', () => {
        it('should create damage modifier with normalized attributes', () => {
            sandbox.stub(foundryApi,"localize").callsFake(key => {
                if(key === "splittermond.damageTypes.short.fire")return "Feuer";
                if(key === "TYPES.Item.weapon")return "Waffe";
                return key;
            });
            const scalarModifier: ScalarModifier = {
                path: 'item.damage',
                value: of(5),
                attributes: {
                    damageType: 'Feuer',
                    itemType: 'Waffe',
                    customAttr: 'value'
                }
            };

            const result = handler.convertToDamageModifier(scalarModifier, 'Test Emphasis');

            expect(result.groupId).to.equal('item.damage');
            expect(result.value).to.deep.equal(of(5));
            expect(result.attributes.name).to.equal('Test Emphasis');
            expect(result.attributes.type).to.equal('equipment');
            expect(result.attributes.damageType).to.equal('fire');
            expect(result.attributes.itemType).to.equal('weapon');
            expect(result.attributes.customAttr).to.equal('value');
            expect(result.origin).to.equal(mockItem);
        });

        it('should handle undefined damage type and item type', () => {
            const scalarModifier: ScalarModifier = {
                path: 'item.damage',
                value: of(3),
                attributes: {}
            };

            const result = handler.convertToDamageModifier(scalarModifier, 'Test');

            expect(result.attributes.damageType).to.be.undefined;
            expect(result.attributes.itemType).to.be.undefined;
        });
    });

    describe('convertToWeaponSpeedModifier', () => {
        it('should create weapon speed modifier with normalized attributes', () => {
            sandbox.stub(foundryApi,"localize").callsFake(key => {
                if(key === "TYPES.Item.weapon")return "Waffe";
                return key;
            });
            const scalarModifier: ScalarModifier = {
                path: 'item.weaponspeed',
                value: of(2),
                attributes: {
                    itemType: 'Waffe',
                    item: 'Sword'
                }
            };

            const result = handler.convertToWeaponSpeedModifier(scalarModifier, 'Speed Boost');

            expect(result.groupId).to.equal('item.weaponspeed');
            expect(result.value).to.deep.equal(of(2));
            expect(result.attributes.name).to.equal('Speed Boost');
            expect(result.attributes.type).to.equal('equipment');
            expect(result.attributes.itemType).to.equal('weapon');
            expect(result.attributes.item).to.equal('Sword');
            expect(result.origin).to.equal(mockItem);
        });
    });

    describe('convertToItemFeatureModifier', () => {
        it('should create item feature modifier with original path', () => {
            const scalarModifier: ScalarModifier = {
                path: 'item.addfeature',
                value: of(1),
                attributes: {
                    feature: 'robust',
                    itemType: 'weapon'
                }
            };

            const result = handler.convertToItemFeatureModifier(scalarModifier, 'Feature');

            expect(result.groupId).to.equal('item.addfeature');
            expect(result.value).to.deep.equal(of(1));
            expect(result.attributes.name).to.equal('Feature');
            expect(result.attributes.type).to.equal('equipment');
            expect(result.attributes.feature).to.equal('robust');
            expect(result.attributes.itemType).to.equal('weapon');
            expect(result.origin).to.equal(mockItem);
        });
    });

    describe('normalizeAttribute', () => {
        it('should return normalized value for valid descriptor', () => {
            const result = handler.normalizeAttribute('fire', 'damageTypes');

            expect(result).to.equal('fire');
        });

        it('should return undefined for undefined value', () => {
            const result = handler.normalizeAttribute(undefined, 'damageTypes');

            expect(result).to.be.undefined;
        });

        it('should return undefined for invalid descriptor', () => {

            const result = handler.normalizeAttribute(1, 'damageTypes');

            expect(result).to.be.undefined;
            expect(allErrors).to.have.lengthOf(1);
        });
    });

    describe('normalizeDamageType', () => {
        it('should return valid damage type', () => {
            const result = handler.normalizeDamageType('fire');

            expect(result).to.equal('fire');
        });

        it('should return undefined for undefined damage type', () => {
            const result = handler.normalizeDamageType(undefined);

            expect(result).to.be.undefined;
        });

        it('should report error and return undefined for invalid damage type', () => {
            const result = handler.normalizeDamageType('invalid');

            expect(result).to.be.undefined;
            expect(allErrors).to.have.lengthOf(1);
            expect(allErrors[0]).to.equal('Unknown descriptor damageType: invalid in item Test Item');
        });

        it('should handle validation errors', () => {

            const result = handler.normalizeDamageType("${fire}");

            expect(result).to.be.undefined;
            expect(allErrors).to.contain("Unknown descriptor damageType: ${fire} in item Test Item");
        });
    });

    describe('normalizeItemType', () => {
        it('should return valid item type', () => {
            const result = handler.normalizeItemType('weapon');

            expect(result).to.equal('weapon');
        });

        it('should return undefined for undefined item type', () => {
            const result = handler.normalizeItemType(undefined);

            expect(result).to.be.undefined;
        });

        it('should return invalid item type without error (keeping invalid types)', () => {
            const result = handler.normalizeItemType('invalidType');

            expect(result).to.equal('invalidType');
            expect(allErrors).to.be.empty;
        });

        it('should report error but still return valid item type that is in splittermond.itemTypes', () => {
            const result = handler.normalizeItemType('weapon');

            // According to the code, if the item type is in splittermond.itemTypes,
            // it reports an error but still returns the value
            // This is, because if we delete the type, we would make the modifier apply to everything, which is worse.
            expect(result).to.equal('weapon');
            expect(allErrors).to.have.lengthOf(1);
            expect(allErrors[0]).to.equal('Unknown descriptor itemType: weapon in item Test Item');
        });

        it('should handle validation errors', () => {
            const result = handler.normalizeItemType({propertyPath: "weapon", original: "w", sign: 1} as any);

            expect(result).to.be.undefined;
            expect(allErrors).to.have.lengthOf(1);
            expect(allErrors[0]).to.equal('splittermond.modifiers.parseMessages.shouldNotBeAnExpression');
        });
    });

    describe('integration with modifier conversion', () => {
        it('should properly normalize attributes in damage modifier', () => {
            sandbox.restore();
            sandbox = sinon.createSandbox();

            // Re-setup stubs after restore
            sandbox.stub(foundryApi, 'format').callsFake((key: string, data?: any) => {
                if (key === "splittermond.modifiers.parseMessages.unknownDescriptor") {
                    return `Unknown descriptor ${data.descriptor}: ${data.value} in item ${data.itemName}`;
                }
                return key;
            });

            sandbox.stub(splittermond, 'damageTypes').value(['physical', 'fire']);
            sandbox.stub(splittermond, 'itemTypes').value(['weapon', 'spell']);

            handler = new ItemModifierHandler(allErrors, mockItem, 'magic');

            const scalarModifier: ScalarModifier = {
                path: 'item.damage',
                value: of(8),
                attributes: {
                    damageType: 'invalid',  // This should cause an error
                    itemType: 'weapon'      // This should cause an error too
                }
            };

            const result = handler.convertToDamageModifier(scalarModifier, 'Complex Test');

            expect(result.attributes.damageType).to.be.undefined;  // Invalid damage type becomes undefined
            expect(result.attributes.itemType).to.equal('weapon'); // Valid item type kept but error reported
            expect(allErrors).to.have.lengthOf(2);  // Both should report errors
        });
    });
});
