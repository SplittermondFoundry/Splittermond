import "../../../foundryMocks.js";
import { afterEach, describe, it } from "mocha";
import { expect } from "chai";
import { foundryApi } from "module/api/foundryApi";
import sinon from "sinon";
import { ItemReference } from "module/data/references/ItemReference";
import SplittermondItem from "../../../../../module/item/item";
import SplittermondActor from "../../../../../module/actor/actor";

describe("ItemReference", () => {
    let sandbox: sinon.SinonSandbox;
    beforeEach(() => (sandbox = sinon.createSandbox()));
    afterEach(() => sandbox.restore());

    it("should produce a Reference for items on Actors", () => {
        const itemMock = sinon.createStubInstance(SplittermondItem);
        const actorMock = sinon.createStubInstance(SplittermondActor);
        Object.defineProperty(itemMock, "documentName", { value: "Item" });
        Object.defineProperty(actorMock, "documentName", { value: "Actor" });
        Object.defineProperty(itemMock, "id", { value: "1" });
        Object.defineProperty(itemMock, "actor", { value: actorMock });
        Object.defineProperty(actorMock, "id", { value: "1" });
        const probe = ItemReference.initialize(itemMock);

        expect(probe.id).to.equal("1");
        expect(probe.actorReference).to.not.be.null;
    });

    it("should produce a reference for top-level items", () => {
        const itemMock = sinon.createStubInstance(SplittermondItem);
        Object.defineProperty(itemMock, "id", { value: "1" });
        const probe = ItemReference.initialize(itemMock);

        expect(probe.id).to.equal("1");
        expect(probe.actorReference).to.be.null;
    });

    it("should handle no items to reference", () => {
        sandbox.stub(foundryApi, "getItem").returns(undefined);
        const itemMock = sinon.createStubInstance(SplittermondItem);
        Object.defineProperty(itemMock, "id", { value: "1234" });

        const underTest = ItemReference.initialize(itemMock);

        expect(() => underTest.getItem()).to.throw(Error);
    });

    it("should handle no actors to reference", () => {
        sandbox.stub(foundryApi, "getActor").returns(undefined);
        const itemMock = sinon.createStubInstance(SplittermondItem);
        const actorMock = sinon.createStubInstance(SplittermondActor);
        Object.defineProperty(itemMock, "documentName", { value: "Item" });
        Object.defineProperty(actorMock, "documentName", { value: "Actor" });
        Object.defineProperty(itemMock, "actor", { value: actorMock });
        Object.defineProperty(itemMock, "id", { value: "1234" });

        const underTest = ItemReference.initialize(itemMock);

        expect(() => underTest.getItem()).to.throw(Error);
    });

    it("should handle no items on Actor", () => {
        const itemMock = sinon.createStubInstance(SplittermondItem);
        const actorMock = sinon.createStubInstance(SplittermondActor);
        Object.defineProperty(itemMock, "documentName", { value: "Item" });
        Object.defineProperty(actorMock, "documentName", { value: "Actor" });
        Object.defineProperty(itemMock, "actor", { value: actorMock });
        Object.defineProperty(actorMock, "items", { value: new Map() });
        Object.defineProperty(actorMock, "id", { value: "1" });
        sandbox.stub(foundryApi, "getActor").returns(
            {
                id: "1",
                items: new Map(),
                documentName: "Actor",
            } as unknown as Actor /*mock good enough for this test */
        );

        const underTest = ItemReference.initialize(itemMock);

        expect(() => underTest.getItem()).to.throw(Error);
    });
});
