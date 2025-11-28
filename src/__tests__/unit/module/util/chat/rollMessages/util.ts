import { SplittermondDataModel } from "module/data/SplittermondDataModel";
import sinon from "sinon";

export function withToObjectReturnsSelf<T>(wrappedFunction: () => T): T {
    const toObjectMock = sinon.stub(SplittermondDataModel.prototype, "toObject").callsFake(function () {
        //@ts-expect-error we accept an "any" this here, because we cannot know the actual type for this mock
        return this;
    });
    try {
        return wrappedFunction();
    } finally {
        toObjectMock.restore();
    }
}
