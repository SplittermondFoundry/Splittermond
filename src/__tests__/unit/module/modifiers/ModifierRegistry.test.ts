import {afterEach, beforeEach, describe, it} from "mocha";
import {expect} from 'chai';
import sinon, {SinonSandbox, type SinonSpy} from 'sinon';
import {ModifierRegistry} from "module/modifiers/ModifierRegistry";
import {ModifierHandler} from "module/modifiers/ModiferHandler";
import SplittermondItem from "module/item/item";
import {ModifierType} from "module/actor/modifier-manager";
import {makeConfig} from "module/modifiers/ModifierConfig";
import {foundryApi} from "module/api/foundryApi";

describe('ModifierRegistry', () => {
    let sandbox: SinonSandbox;
    let registry: ModifierRegistry;
    let consoleDebugSpy: SinonSpy;

    // Mock handler classes for testing
    class TestHandler extends ModifierHandler {
        constructor(logErrors: (...messages: string[]) => void, _:SplittermondItem, _modifierType: ModifierType) {
            super(logErrors, makeConfig({topLevelPath: "test"}));
        }

        protected omitForValue(): boolean {
            return false;
        }

        protected buildModifier(): null {
            return null;
        }
    }

    class AnotherTestHandler extends ModifierHandler {
        constructor(logErrors: (...messages: string[]) => void, _: SplittermondItem, _modifierType: ModifierType) {
            super(logErrors,  makeConfig({topLevelPath: "another"}));
        }

        protected omitForValue(): boolean {
            return false;
        }

        protected buildModifier(): null {
            return null;
        }
    }

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        registry = new ModifierRegistry();
        consoleDebugSpy = sandbox.spy(console, 'debug');
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('addHandler', () => {
        describe('successful handler registration', () => {
            it('should register a new handler for a given groupId', () => {
                expect(() => registry.addHandler('item', TestHandler)).to.not.throw();

                expect(() => registry.addHandler('item', TestHandler))
                    .to.throw('Modifier handler for groupId \'item\' is already registered.');
            });

            it('should convert groupId to lowercase for registration', () => {
                registry.addHandler('ITEM', TestHandler);

                expect(() => registry.addHandler('item', AnotherTestHandler))
                    .to.throw('Modifier handler for groupId \'item\' is already registered.');
            });

            it('should allow registration of handlers for different groupIds', () => {
                expect(() => {
                    registry.addHandler('item', TestHandler);
                    registry.addHandler('actor', AnotherTestHandler);
                    registry.addHandler('spell', TestHandler);
                }).to.not.throw();
            });
        });

        describe('duplicate registration prevention', () => {
            it('should throw error when registering handler for existing groupId', () => {
                registry.addHandler('item', TestHandler);

                expect(() => registry.addHandler('item', AnotherTestHandler))
                    .to.throw('Modifier handler for groupId \'item\' is already registered.');
            });

            it('should throw error when registering handler for existing groupId (case insensitive)', () => {
                registry.addHandler('item', TestHandler);

                expect(() => registry.addHandler('ITEM', AnotherTestHandler))
                    .to.throw('Modifier handler for groupId \'item\' is already registered.');

                expect(() => registry.addHandler('Item', AnotherTestHandler))
                    .to.throw('Modifier handler for groupId \'item\' is already registered.');
            });
        });

        describe('shadowing detection', () => {
            it('should debug log when registering more specific handler than existing one', () => {
                registry.addHandler('item', TestHandler);
                registry.addHandler('item.damage.fire', AnotherTestHandler);

                expect(consoleDebugSpy.calledOnce).to.be.true;
                const debugMessage = consoleDebugSpy.lastCall.firstArg
                expect(debugMessage).to.include("Splittermond | More general handlers than groupId 'item.damage.fire':");
                expect(debugMessage).to.include("item");
            });

            it('should debug log when registering more general handler than existing specific ones', () => {
                registry.addHandler('item.damage.fire', TestHandler);
                registry.addHandler('item', AnotherTestHandler);

                expect(consoleDebugSpy.calledOnce, "Console was called exactly once").to.be.true;
                const debugMessage = consoleDebugSpy.lastCall.args.join(" ")
                expect(debugMessage).to.include("Splittermond | More specific handlers than groupId 'item':");
                expect(debugMessage).to.include("item.damage.fire");
            });

            it('should not debug log for completely different paths like \'actor\' and \'item\'', () => {
                registry.addHandler('actor', TestHandler);
                registry.addHandler('item', AnotherTestHandler);

                expect(consoleDebugSpy.called).to.be.false;
            });

            it('should debug log for multiple levels of nesting', () => {
                registry.addHandler('item.damage.fire.magical', TestHandler);
                registry.addHandler('item.damage.fire.magical.enhanced', AnotherTestHandler);

                expect(consoleDebugSpy.calledOnce, "Console was called exactly once").to.be.true;
                const debugMessage = consoleDebugSpy.lastCall.args.join(" ")
                expect(debugMessage).to.include("Splittermond | More general handlers than groupId 'item.damage.fire.magical.enhanced':");
            });

            it('should debug log for partial matches at any level', () => {
                registry.addHandler('actor.skills', TestHandler);
                registry.addHandler('actor.skills.combat', AnotherTestHandler);

                expect(consoleDebugSpy.calledOnce, "Console was called exactly once").to.be.true;
                const debugMessage = consoleDebugSpy.lastCall.args.join(" ")
                expect(debugMessage).to.include("Splittermond | More general handlers than groupId 'actor.skills.combat':");
                expect(debugMessage).to.include("actor.skills");
            });

            it('should debug log about multiple more specific handlers', () => {
                registry.addHandler('item.damage.fire', TestHandler);
                registry.addHandler('item.damage.ice', AnotherTestHandler);
                registry.addHandler('item', TestHandler);

                expect(consoleDebugSpy.calledOnce, "Console was called exactly once").to.be.true;
                const debugMessage = consoleDebugSpy.lastCall.args.join(" ")
                expect(debugMessage).to.include("Splittermond | More specific handlers than groupId 'item':");
                expect(debugMessage).to.include("item.damage.fire, item.damage.ice");
            });

            it('should debug log about shadowing regardless of case', () => {
                registry.addHandler('Item.Damage', TestHandler);
                registry.addHandler('ITEM.DAMAGE.FIRE', AnotherTestHandler);

                expect(consoleDebugSpy.calledOnce).to.be.true;
            });
        });

        describe('edge cases', () => {
            it('should handle empty string groupId', () => {
                expect(() => registry.addHandler('', TestHandler)).to.not.throw();

                expect(() => registry.addHandler('item', AnotherTestHandler)).to.not.throw();
            });

            it('should handle groupId with special characters', () => {
                expect(() => {
                    registry.addHandler('item-special', TestHandler);
                    registry.addHandler('item_underscore', AnotherTestHandler);
                    registry.addHandler('item@symbol', TestHandler);
                }).to.not.throw();
            });

            it('should handle very long groupId paths', () => {
                const longPath = 'very.long.path.with.many.segments.that.goes.on.and.on.for.testing.purposes';
                expect(() => registry.addHandler(longPath, TestHandler)).to.not.throw();
            });

            it('should handle groupIds with dots at the beginning or end', () => {
                expect(() => {
                    registry.addHandler('.item', TestHandler);
                    registry.addHandler('item.', AnotherTestHandler);
                }).to.throw();
            });

            it('should handle consecutive dots in groupId', () => {
                expect(() => registry.addHandler('item..damage', TestHandler)).to.throw();
            });

            it('should handle numeric segments in groupId', () => {
                expect(() => {
                    registry.addHandler('item.123', TestHandler);
                    registry.addHandler('456.damage', AnotherTestHandler);
                }).to.not.throw();
            });
        });

        describe('case sensitivity variations', () => {
            it('should treat different cases as the same groupId', () => {
                registry.addHandler('Item.Damage.Fire', TestHandler);

                expect(() => registry.addHandler('item.damage.fire', AnotherTestHandler))
                    .to.throw('Modifier handler for groupId \'item.damage.fire\' is already registered.');

                expect(() => registry.addHandler('ITEM.DAMAGE.FIRE', AnotherTestHandler))
                    .to.throw('Modifier handler for groupId \'item.damage.fire\' is already registered.');
            });

            it('should warn about shadowing regardless of case', () => {
                registry.addHandler('Item.Damage', TestHandler);
                registry.addHandler('ITEM.DAMAGE.FIRE', AnotherTestHandler);

                expect(consoleDebugSpy.calledOnce).to.be.true;
            });
        });
    });

    describe('getCache', () => {
        it('should return a ModifierCache instance', () => {
            const mockLogErrors = sandbox.stub();
            const mockItem = {} as SplittermondItem;
            const mockType = 'equipment' as ModifierType;

            const cache = registry.getCache(mockLogErrors, mockItem, mockType);

            expect(cache).to.be.instanceOf(Object);
            expect(cache.getHandler).to.be.a('function');
        });

        it('should return different cache instances for different calls', () => {
            const mockLogErrors = sandbox.stub();
            const mockItem = {} as SplittermondItem;
            const mockType = 'equipment' as ModifierType;

            const cache1 = registry.getCache(mockLogErrors, mockItem, mockType);
            const cache2 = registry.getCache(mockLogErrors, mockItem, mockType);

            expect(cache1).to.not.equal(cache2);
        });
    });

    describe('ModifierCache', () => {
        let cache: any;
        let mockLogErrors: sinon.SinonStub;
        let mockItem: SplittermondItem;

        beforeEach(() => {
            mockLogErrors = sandbox.stub();
            mockItem = {name: 'Test Item'} as SplittermondItem;
            cache = registry.getCache(mockLogErrors, mockItem, 'equipment');
        });

        it('should pass correct arguments to handler constructor', () => {
            const constructorSpy = sinon.stub()
            registry.addHandler('item', constructorSpy as any);

            cache.getHandler('item');

            expect(constructorSpy.calledOnce).to.be.true;
            expect(constructorSpy.lastCall.args).to.deep.equal([mockLogErrors, mockItem, 'equipment']);
        });

        describe('handler resolution tests', () => {
            it('should return registered handler for exact groupId match', () => {
                registry.addHandler('item', TestHandler);

                const handler = cache.getHandler('item');

                expect(handler).to.be.instanceOf(TestHandler);
            });

            it('should return handler for parent segment (e.g., \'item\' handler for \'item.damage.fire\')', () => {
                registry.addHandler('item', TestHandler);

                const handler = cache.getHandler('item.damage.fire');

                expect(handler).to.be.instanceOf(TestHandler);
            });

            it('should return cached handler on subsequent calls for same groupId', () => {
                registry.addHandler('item', TestHandler);

                const handler1 = cache.getHandler('item');
                const handler2 = cache.getHandler('item');

                expect(handler1).to.equal(handler2);
            });

            it('should return NoActionModifierHandler for unregistered groupId', () => {
                const handler = cache.getHandler('unknown');

                expect(handler.constructor.name).to.equal('NoActionModifierHandler');
            });
        });

        describe('case sensitivity tests', () => {
            it('should handle case insensitive groupId matching', () => {
                registry.addHandler('ITEM', TestHandler);

                const handler = cache.getHandler('item');

                expect(handler).to.be.instanceOf(TestHandler);
            });

            it('should handle mixed case in groupId segments', () => {
                registry.addHandler('Item.Damage', TestHandler);

                const handler1 = cache.getHandler('item.damage.fire');
                const handler2 = cache.getHandler('ITEM.DAMAGE.ICE');

                expect(handler1).to.be.instanceOf(TestHandler);
                expect(handler2).to.be.instanceOf(TestHandler);
            });
        });

        describe('segment matching hierarchy tests', () => {
            it('should prefer more specific handler over general one', () => {
                registry.addHandler('item', TestHandler);
                registry.addHandler('item.damage', AnotherTestHandler);

                const handler = cache.getHandler('item.damage.fire');

                expect(handler).to.be.instanceOf(AnotherTestHandler);
            });

            it('should use \'item.damage\' handler over \'item\' handler for \'item.damage.fire\'', () => {
                registry.addHandler('item', TestHandler);
                registry.addHandler('item.damage', AnotherTestHandler);

                const handler = cache.getHandler('item.damage.fire');

                expect(handler).to.be.instanceOf(AnotherTestHandler);
            });

            it('should traverse segments from most specific to least specific', () => {
                registry.addHandler('item', TestHandler);

                const handler1 = cache.getHandler('item.damage.fire.magical');
                const handler2 = cache.getHandler('item.weaponspeed');
                const handler3 = cache.getHandler('item');

                expect(handler1).to.be.instanceOf(TestHandler);
                expect(handler2).to.be.instanceOf(TestHandler);
                expect(handler3).to.be.instanceOf(TestHandler);
            });

            it('should handle deep nesting with multiple handler levels', () => {
                const FireHandler = class extends TestHandler {
                }
                registry.addHandler('item', TestHandler);
                registry.addHandler('item.damage', AnotherTestHandler);
                registry.addHandler('item.damage.fire', FireHandler);

                const fireHandler = cache.getHandler('item.damage.fire.magical');
                const iceHandler = cache.getHandler('item.damage.ice');
                const weaponHandler = cache.getHandler('item.weaponspeed');

                expect(fireHandler).to.be.instanceOf(FireHandler);
                expect(iceHandler).to.be.instanceOf(AnotherTestHandler); // uses item.damage
                expect(weaponHandler).to.be.instanceOf(TestHandler); // uses item
            });
        });

        describe('caching behavior tests', () => {
            it('should cache instantiated handlers', () => {
                registry.addHandler('item', TestHandler);

                const handler1 = cache.getHandler('item');
                const handler2 = cache.getHandler('item');

                expect(handler1).to.equal(handler2);
            });

            it('should reuse cached handler for same groupId', () => {
                registry.addHandler('item', TestHandler);

                const handler1 = cache.getHandler('item.damage');
                const handler2 = cache.getHandler('item.weaponspeed');

                expect(handler1).to.equal(handler2);
            });

            it('should cache based on the resolved handler groupId, not the requested groupId', () => {
                registry.addHandler('item', TestHandler);

                const handler1 = cache.getHandler('item.damage.fire');
                const handler2 = cache.getHandler('item.weaponspeed');
                const handler3 = cache.getHandler('item');

                // All should be the same instance since they all resolve to 'item'
                expect(handler1).to.equal(handler2);
                expect(handler2).to.equal(handler3);
            });
        });

        describe('NoActionModifierHandler fallback tests', () => {
            it('should return NoActionModifierHandler for completely unknown paths', () => {
                const handler = cache.getHandler('completely.unknown.path');

                expect(handler.constructor.name).to.equal('NoActionModifierHandler');
            });

            it('should return NoActionModifierHandler when no parent handlers exist', () => {
                registry.addHandler('actor', TestHandler);

                const handler = cache.getHandler('item.damage');

                expect(handler.constructor.name).to.equal('NoActionModifierHandler');
            });

            it('NoActionModifierHandler should return null from buildModifier', () => {
                sandbox.stub(foundryApi, "format").callsFake(key => key);
                const handler = cache.getHandler('unknown');
                const mockModifier = {
                    path: 'unknown',
                    value: {} as any,
                    attributes: {}
                };
                const mockConfig = {
                    requiredAttributes: [],
                    optionalAttributes: []
                };

                const result = (handler).processModifier(mockModifier, mockConfig);

                expect(result).to.be.null;
            });

            it('should create new NoActionModifierHandler instances for each unknown path', () => {
                const handler1 = cache.getHandler('unknown1');
                const handler2 = cache.getHandler('unknown2');

                expect(handler1).to.not.equal(handler2);
                expect(handler1.constructor.name).to.equal('NoActionModifierHandler');
                expect(handler2.constructor.name).to.equal('NoActionModifierHandler');
            });
        });

        describe('complex scenarios', () => {
            it('should handle multiple cache instances with different handlers', () => {
                registry.addHandler('item', TestHandler);
                registry.addHandler('actor', AnotherTestHandler);

                const cache2 = registry.getCache(mockLogErrors, mockItem, 'equipment');

                const itemHandler1 = cache.getHandler('item');
                const itemHandler2 = cache2.getHandler('item');
                const actorHandler1 = cache.getHandler('actor');
                const actorHandler2 = cache2.getHandler('actor');

                // Same handler classes but different instances between caches
                expect(itemHandler1).to.not.equal(itemHandler2);
                expect(actorHandler1).to.not.equal(actorHandler2);
                expect(itemHandler1).to.be.instanceOf(TestHandler);
                expect(itemHandler2).to.be.instanceOf(TestHandler);
                expect(actorHandler1).to.be.instanceOf(AnotherTestHandler);
                expect(actorHandler2).to.be.instanceOf(AnotherTestHandler);
            });

            it('should properly handle registration order independence', () => {
                // Register in one order
                registry.addHandler('item.damage.fire', TestHandler);
                registry.addHandler('item.damage', AnotherTestHandler);
                registry.addHandler('item', TestHandler);

                const handler = cache.getHandler('item.damage.fire.magical');

                // Should use the most specific handler (item.damage.fire)
                expect(handler).to.be.instanceOf(TestHandler);
            });

            it('should handle empty string groupId registration', () => {
                registry.addHandler('', TestHandler);

                const handler = cache.getHandler('anything');

                expect(handler.constructor.name).to.equal('NoActionModifierHandler');
            });
        });
    });
});
