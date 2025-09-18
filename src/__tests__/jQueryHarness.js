import { JSDOM } from "jsdom";
import jquery from "jquery";

/**
 * renders an html string into a JQuery object and sets it as global.$
 *
 * @param {string} html
 * @returns {JQuery}
 */
export function produceJQuery(html) {
    const dom = new JSDOM(html);
    const jQuery = jquery(dom.window);
    global.$ = jQuery;
    enhanceJQuery(jQuery);
    return jQuery;
}
function enhanceJQuery(jQuery) {
    jQuery.fn.closestData = function (dataName, defaultValue = "") {
        let value = this.closest(`[data-${dataName}]`)?.data(dataName);
        return value ? value : defaultValue;
    };
}
