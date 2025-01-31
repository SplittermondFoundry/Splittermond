import type {QuenchBatchContext} from "@ethaks/fvtt-quench";

declare const foundry: any;
const mergeObject = foundry.utils.mergeObject;

export function mergeObjectTest(context: QuenchBatchContext) {
    const {describe, it, expect} = context;

    describe('mergeObject', () => {
        it('should not insert new keys when insertKeys is false', () => {
            const result = mergeObject({k1: 'v1'}, {k2: 'v2'}, {insertKeys: false});
            expect(result).to.deep.equal({k1: 'v1'});
        });

        it('should insert new keys when insertKeys is true', () => {
            const result = mergeObject({k1: 'v1'}, {k2: 'v2'}, {insertKeys: true});
            expect(result).to.deep.equal({k1: 'v1', k2: 'v2'});
        });

        it('should not insert new values when insertValues is false', () => {
            const result = mergeObject({k1: {i1: 'v1'}}, {k1: {i2: 'v2'}}, {insertValues: false});
            expect(result).to.deep.equal({k1: {i1: 'v1'}});
        });

        it('should insert new values when insertValues is true', () => {
            const result = mergeObject({k1: {i1: 'v1'}}, {k1: {i2: 'v2'}}, {insertValues: true});
            expect(result).to.deep.equal({k1: {i1: 'v1', i2: 'v2'}});
        });

        it('should overwrite existing values when overwrite is true', () => {
            const result = mergeObject({k1: 'v1'}, {k1: 'v2'}, {overwrite: true});
            expect(result).to.deep.equal({k1: 'v2'});
        });

        it('should not overwrite existing values when overwrite is false', () => {
            const result = mergeObject({k1: 'v1'}, {k1: 'v2'}, {overwrite: false});
            expect(result).to.deep.equal({k1: 'v1'});
        });

        it('should not merge recursively when recursive is false', () => {
            const result = mergeObject({k1: {i1: 'v1'}}, {k1: {i2: 'v2'}}, {recursive: false});
            expect(result).to.deep.equal({k1: {i2: 'v2'}});
        });

        it('should merge recursively when recursive is true', () => {
            const result = mergeObject({k1: {i1: 'v1'}}, {k1: {i2: 'v2'}}, {recursive: true});
            expect(result).to.deep.equal({k1: {i1: 'v1', i2: 'v2'}});
        });

        it('should perform deletions when performDeletions is true', () => {
            const result = mergeObject({k1: 'v1', k2: 'v2'}, {'-=k1': null}, {performDeletions: true});
            expect(result).to.deep.equal({k2: 'v2'});
        });

        it('should not perform deletions when performDeletions is false', () => {
            const result = mergeObject({k1: 'v1', k2: 'v2'}, {'-=k1': null}, {performDeletions: false});
            expect(result).to.deep.equal({k1: 'v1', k2: 'v2', '-=k1': null});
        });

        it('should enforce types when enforceTypes is true', () => {
            expect(() => mergeObject({k1: 1}, {k1: 'v2'}, {enforceTypes: true})).to.throw();
        });

        it('should not enforce types when enforceTypes is false', () => {
            const result = mergeObject({k1: 1}, {k1: 'v2'}, {enforceTypes: false});
            expect(result).to.deep.equal({k1: 'v2'});
        });

        it('should apply updates in-place when inplace is true', () => {
            const original = {k1: 'v1'};
            const result = mergeObject(original, {k2: 'v2'}, {inplace: true});
            expect(result).to.equal(original);
            expect(result).to.deep.equal({k1: 'v1', k2: 'v2'});
        });

        it('should not apply updates in-place when inplace is false', () => {
            const original = {k1: 'v1'};
            const result = mergeObject(original, {k2: 'v2'}, {inplace: false});
            expect(result).to.not.equal(original);
            expect(result).to.deep.equal({k1: 'v1', k2: 'v2'});
        });
    });
}