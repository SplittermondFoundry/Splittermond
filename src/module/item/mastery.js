import SplittermondItem from "./item.js";
import {getMasteryAvailabilityParser} from "./availabilityParser.ts";
import {produceMasteryTags} from "./tags/masteryTags.js";

export default class SplittermondMasteryItem extends SplittermondItem {

    /**
     *
     * @param data
     * @param context
     * @param {MasteryAvailabilityParser} availabilityParser
     */
    constructor(data, context = {},
                availabilityParser = getMasteryAvailabilityParser(game.i18n, CONFIG.splittermond.skillGroups.all)) {
        super(data, context);
        this.availabilityParser = availabilityParser;
    }

    get availableIn() {
        return this.availabilityParser.toDisplayRepresentation(this.system.availableIn);
    }

    /**
     * @override
     */
    update(data, context) {
        if ("availableIn" in data) {
            data["system.availableIn"] = this.availabilityParser.toInternalRepresentation(data.availableIn);
            delete data.availableIn;
        }
        return super.update(data, context);
    }

    /**
     * a list of nicely formatted tags, based on the mastery's availability
     * @returns {MasteryAvailabilityTag[]}
     */
    get availableInList() {
        return produceMasteryTags(this.system, this.availabilityParser);
    }
}