import {CastDurationModel, parseCastDuration} from 'module/item/dataModel/propertyModels/CastDurationModel';
import {foundryApi} from 'module/api/foundryApi';
import {expect} from "chai";
import {describe, it} from "mocha";
import sinon, {type SinonSandbox} from "sinon";
import ModifierManager from "module/actor/modifier-manager";
import SplittermondActor from "module/actor/actor";
import SplittermondItem from "module/item/item";
import {of} from "module/modifiers/expressions/scalar";

describe('parseCastDuration', () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => sandbox.restore());

    const tickCases = [
        {input: '10 T', expected: {value: 10, unit: 'T'}},
        {input: '5tick', expected: {value: 5, unit: 'T'}},
        {input: '120 t', expected: {value: 120, unit: 'T'}},
        {input: '120T', expected: {value: 120, unit: 'T'}},
        {input: '   10   ', expected: {value: 10, unit: 'T'}},
    ];
    tickCases.forEach(({input, expected}) => {
        it(`parses tick input '${input}' correctly`, () => {
            expect(parseCastDuration(input)).to.deep.equal(expected);
        });
    });

    const minuteCases = [
        {input: '2 min  ', expected: {value: 2, unit: 'min'}},
        {input: '3    minutes', expected: {value: 3, unit: 'min'}},
        {input: '1minute', expected: {value: 1, unit: 'min'}},
        {input: '  1m', expected: {value: 1, unit: 'min'}},
    ];
    minuteCases.forEach(({input, expected}) => {
        it(`parses minute input '${input}' correctly`, () => {
            expect(parseCastDuration(input)).to.deep.equal(expected);
        });
    });

    const invalidCases = [
        '',
        'abc',
        '0 min',
        '-5 T',
        '10 hours',
    ];

    invalidCases.forEach(input => {
        it(`returns null for invalid input ${input}`, () => {
            sandbox.stub(foundryApi, 'warnUser');
            expect(parseCastDuration(input)).to.be.null;
        });
    });
})

describe('CastDurationModel', () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => sandbox.restore());

    describe('basic construction and conversion', () => {
        it('constructs from valid string', () => {
            const model = CastDurationModel.from('5 min');
            expect(model.value).to.equal(5);
            expect(model.unit).to.equal('min');
        });

        it('returns empty for invalid string', () => {
            sandbox.stub(foundryApi, 'warnUser');
            const model = CastDurationModel.from('invalid');
            expect(model.value).to.equal(1);
            expect(model.unit).to.equal('T');
        });

        it('creates empty model with correct defaults', () => {
            const model = CastDurationModel.empty();
            expect(model.value).to.equal(1);
            expect(model.unit).to.equal('T');
        });
    });

    describe('time unit conversion', () => {
        it('converts ticks correctly', () => {
            const model = createModel(sandbox, {value: 10, unit: 'T'});
            expect(model.inTicks).to.equal(10);
        });

        it('converts minutes to ticks correctly', () => {
            const model = createModel(sandbox, {value: 5, unit: 'min'});
            expect(model.inTicks).to.equal(600); // 5 * 120
        });

        it('handles fractional minutes', () => {
            const model = createModel(sandbox, {value: 2.5, unit: 'min'});
            expect(model.inTicks).to.equal(300); // 2.5 * 120
        });
    });

    describe('display methods', () => {
        it('innateDuration shows base value without modifiers', () => {
            const model = createModel(sandbox, {value: 5, unit: 'T'});
            model.document.actor.modifier.add('item.castDuration', {
                name: "Test Spell",
                type: "innate",
                unit: 'T'
            }, of(10));
            expect(model.innateDuration).to.equal('5 T');
        });

        it('innateDuration shows base value for minutes', () => {
            const model = CastDurationModel.from('2 min');
            expect(model.innateDuration).to.equal('2 min');
        });

        it('display modified duration with the original unit of Ticks', () => {
            const model = createModel(sandbox, {value: 10, unit: 'T'});
            const modifierManager = model.document.actor.modifier;
            const attributesMin = {
                item: 'Test Spell',
                itemType: 'spell',
                name: "Test Spell",
                type: "innate" as const,
                unit: 'min'
            };
            const attributesTicks = {
                item: 'Test Spell',
                itemType: 'spell',
                name: "Test Spell",
                type: "innate" as const,
                unit: 'T'
            };
            modifierManager.add('item.castDuration', attributesMin, of(1)); // 1 minute = 120 ticks
            modifierManager.add('item.castDuration', attributesTicks, of(30));

            expect(model.display).to.equal("160 T");
        });

        it('display modified duration with the original unit of minutes', () => {
            const model = createModel(sandbox, {value: 2, unit: 'min'});
            const modifierManager = model.document.actor.modifier;
            const attributesMin = {
                item: 'Test Spell',
                itemType: 'spell',
                name: "Test Spell",
                type: "innate" as const,
                unit: 'min'
            };
            const attributesTicks = {
                item: 'Test Spell',
                itemType: 'spell',
                name: "Test Spell",
                type: "innate" as const,
                unit: 'T'
            };
            modifierManager.add('item.castDuration', attributesMin, of(1)); // 1 minute = 120 ticks
            modifierManager.add('item.castDuration', attributesTicks, of(30));

            expect(model.display).to.equal("3.25 min");
        });
    });
    describe('modifier calculations', () => {

        it('handles no modifiers', () => {
            const model = createModel(sandbox, {value: 5, unit: 'T'});
            expect(model.display).to.equal('5 T');
        });

        it('applies multiplicative modifiers correctly', () => {
            const model = createModel(sandbox, {value: 10, unit: 'T'});
            const modifierManager = model.document.actor.modifier;
            const attributes = {item: 'Test Spell', itemType: 'spell', name: "Test Spell", type: "innate" as const};
            modifierManager.add('item.castDuration.multiplier', attributes, of(3));
            modifierManager.add('item.castDuration.multiplier', attributes, of(0.5));

            // Should calculate: 10 * (3 * 0.5) + 0 = 15
            expect(model.inTicks).to.equal(15);
        });

        it('applies additive modifiers with same unit', () => {
            const model = createModel(sandbox, {value: 10, unit: 'T'});
            const modifierManager = model.document.actor.modifier;
            const attributes = {
                item: 'Test Spell',
                itemType: 'spell',
                name: "Test Spell",
                type: "innate" as const,
                unit: 'T'
            };
            modifierManager.add('item.castDuration', attributes, of(5));
            modifierManager.add('item.castDuration', attributes, of(3));

            // Should calculate: 10 + 5 + 3 = 18
            expect(model.inTicks).to.equal(18);
        });

        it('converts additive modifiers with different units', () => {
            const model = createModel(sandbox, {value: 10, unit: 'T'});
            const modifierManager = model.document.actor.modifier;
            const attributesMin = {
                item: 'Test Spell',
                itemType: 'spell',
                name: "Test Spell",
                type: "innate" as const,
                unit: 'min'
            };
            const attributesTicks = {
                item: 'Test Spell',
                itemType: 'spell',
                name: "Test Spell",
                type: "innate" as const,
                unit: 'T'
            };
            modifierManager.add('item.castDuration', attributesMin, of(1)); // 1 minute = 120 ticks
            modifierManager.add('item.castDuration', attributesTicks, of(30));

            // Should calculate: 10 + 120 + 30 = 160
            expect(model.inTicks).to.equal(160);
        });

        it('accepts global modifiers', () => {
            const model = createModel(sandbox, {value: 10, unit: 'T'});
            const modifierManager = model.document.actor.modifier;
            const attributesMin = {
                name: "Test Spell",
                type: "innate" as const,
                unit: 'min'
            };
            modifierManager.add('item.castDuration', attributesMin, of(1));

            // Should calculate: 10 + 120 = 130
            expect(model.inTicks).to.equal(130);
        });

        it('ignores additive modifiers without unit', () => {
            const model = createModel(sandbox, {value: 10, unit: 'T'});
            const modifierManager = model.document.actor.modifier;
            const attributesMin = {
                name: "Test Spell",
                type: "innate" as const,
            };
            modifierManager.add('item.castDuration', attributesMin, of(1));

            expect(model.inTicks).to.equal(10);
        });

    });

    describe('edge cases', () => {
        it('handles large values correctly', () => {
            const model = createModel(sandbox, {value: 9999, unit: 'T'});
            expect(model.inTicks).to.equal(9999);
        });

        [[3.4,3],[1.5,1],[2.9,2]].forEach(([input, expected]) => {
            it(`returns only integer ticks for ${input}`, () => {
                const model = createModel(sandbox, {value: input, unit: 'T'});
                expect(model.inTicks).to.equal(expected);
            })
        });
        it(`does not return negative tick values`, () => {
            const model = createModel(sandbox, {value: -1, unit: 'T'});
            expect(model.inTicks).to.equal(0);
        });

        it(`does not return negative minute values`, () => {
            const model = createModel(sandbox, {value: -5.2, unit: 'min'});
            expect(model.inTicks).to.equal(0);
        });

        it('handles decimal values correctly', () => {
            const model = createModel(sandbox, {value: 1.5, unit: 'T'});
            expect(model.inTicks).to.equal(1);
        });
    });
});

type Props = ConstructorParameters<typeof CastDurationModel>[0];

function createModel(sandbox: SinonSandbox, props: Props) {
    const mockModiferManager = new ModifierManager();

    const mockActor = sandbox.createStubInstance(SplittermondActor)
    Object.defineProperty(mockActor, "modifier", {value: mockModiferManager, enumerable: true});

    const mockDocument = sandbox.createStubInstance(SplittermondItem);
    mockDocument.name = 'Test Spell';
    mockDocument.type = 'spell';
    Object.defineProperty(mockDocument, "actor", {value: mockActor, enumerable: true});
    const model = new CastDurationModel(props);
    Object.defineProperty(model, "parent", {value: mockDocument, enumerable: true});
    return model
}

