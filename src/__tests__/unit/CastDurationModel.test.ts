import {CastDurationModel, parseCastDuration} from 'module/item/dataModel/propertyModels/CastDurationModel';
import {foundryApi} from 'module/api/foundryApi';
import {expect} from "chai";
import {describe, it} from "mocha";
import sinon from "sinon";

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

    it('constructs from valid string', () => {
        const model = CastDurationModel.from('5 min');
        expect(model.value).to.equal(5);
        expect(model.unit).to.equal('min');
        expect(model.inTicks).to.equal(550);
    });

    it('returns empty for invalid string', () => {
        sandbox.stub(foundryApi, 'warnUser');
        const model = CastDurationModel.from('invalid');
        expect(model.value).to.equal(1);
        expect(model.unit).to.equal('T');
    });

    it('display and toString match', () => {
        const model = CastDurationModel.from('7 T');
        expect(model.display).to.equal('7 T');
        expect(model.toString()).to.equal('7 T');
    });
});
