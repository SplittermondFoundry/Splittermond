import {expect} from 'chai';
import {describe, it} from 'mocha';
import {ParsedModifier, processValues} from "module/modifiers/parsing";
import {AmountExpression, MultiplyExpression, ReferenceExpression} from "module/modifiers/expressions/scalar";
import {evaluate, of as ofCost} from "module/modifiers/expressions/cost";
import {foundryApi} from "module/api/foundryApi";
import sinon, {type SinonSandbox} from "sinon";
import {clearMappers} from "module/modifiers/parsing/normalizer";
import {Cost} from "module/util/costs/Cost";

describe('Value Processor', () => {
    let sandbox: SinonSandbox;
    beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(foundryApi, "format").callsFake(key => key)
        sandbox.stub(foundryApi, "localize").callsFake(key => key)
    })
    afterEach(() => {
        sandbox.restore();
        clearMappers();
    })
    const mockSource = {existing: {path: 'value'}};

    it('should handle valid number attributes', () => {
        const modifiers: ParsedModifier[] = [{
            path: 'test.path',
            attributes: {
                value: 5,
                stringAttr: 'static'
            }
        }];

        const result = processValues(modifiers, mockSource);

        expect(result.errors).to.have.lengthOf(0);
        expect(result.scalarModifiers[0].value).to.be.an.instanceOf(AmountExpression);
        expect(result.scalarModifiers[0].attributes.stringAttr).to.equal('static');
    });

    it('should handle valid reference expressions', () => {
        const modifiers: ParsedModifier[] = [{
            path: 'test.path',
            attributes: {
                value: {
                    propertyPath: 'existing.path',
                    original: 'existing.path',
                    sign: 1
                }
            }
        }];

        const result = processValues(modifiers, mockSource);

        expect(result.errors).to.have.lengthOf(0);
        const expr = result.scalarModifiers[0].value as ReferenceExpression;
        expect(expr).to.be.an.instanceOf(ReferenceExpression);
        expect(expr).to.deep.equal({
            propertyPath: 'existing.path',
            source: mockSource,
            stringRep: 'existing.path'
        });
    });

    it('should collect validation errors for invalid references', () => {
        const modifiers: ParsedModifier[] = [{
            path: 'invalid.path',
            attributes: {
                value: {
                    propertyPath: 'non.existing.path',
                    sign: -1,
                    original: 'non.existing.path'
                }
            }
        }];

        const result = processValues(modifiers, mockSource);

        expect(result.errors).to.have.length.greaterThan(0);
        expect(result.scalarModifiers).to.have.lengthOf(0);
    });

    it('should handle mixed valid/invalid modifiers', () => {
        const modifiers: ParsedModifier[] = [
            {
                path: 'good.modifier',
                attributes: {value: 10}
            },
            {
                path: 'bad.modifier',
                attributes: {value: {propertyPath: 'missing.path', sign: 1, original: 'missing.path'}}
            }
        ];

        const result = processValues(modifiers, mockSource);

        expect(result.scalarModifiers).to.have.lengthOf(1);
        expect(result.errors).to.have.lengthOf(1);
    });

    it('should maintain attribute structure', () => {
        const complexModifier: ParsedModifier = {
            path: 'complex.path',
            attributes: {
                num: 42,
                value: {propertyPath: 'existing.path', sign: -1, original: 'existing.path'},
                str: 'constant'
            }
        };

        const result = processValues([complexModifier], mockSource);

        expect(result.errors).to.have.lengthOf(0);
        expect(result.scalarModifiers).to.have.lengthOf(1);
        expect(result.scalarModifiers[0].value).to.be.instanceOf(MultiplyExpression);
        const attrs = result.scalarModifiers[0].attributes;
        expect(typeof attrs.num).to.equal("number")
        expect(attrs.value).to.be.undefined
        expect(attrs.str).to.equal('constant');
    });

    //Because the only strings that are valid after processing are focus cost modifier strings
    it('should count string values as vector expressions', () => {
        const complexModifier: ParsedModifier = {
            path: 'foreduction.path',
            attributes: {
                value: 'K7V5'
            }
        }

        const result = processValues([complexModifier], mockSource);

        expect(result.errors).to.have.lengthOf(0);
        expect(result.scalarModifiers).to.have.lengthOf(0);
        expect(result.vectorModifiers).to.have.lengthOf(1);
        expect(result.vectorModifiers[0].value).to.deep.equal(ofCost(new Cost(2, 5, true).asModifier()));
    });

    it('should provide references for cost expressions', () => {
        const focusSource = {existing: {path: "1"}}
        const complexModifier: ParsedModifier = {
            path: 'foenhancedreduction.path',
            attributes: {
                value: {
                    propertyPath: 'existing.path',
                    sign: -1,
                    original: 'existing.path'
                }
            }
        }

        const result = processValues([complexModifier], focusSource);

        expect(result.vectorModifiers).to.have.lengthOf(1);
        expect(evaluate(result.vectorModifiers[0].value)).deep.equal(new Cost(-1,0,false).asModifier())
    });
});
