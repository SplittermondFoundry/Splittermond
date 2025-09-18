import {
    ApplicationContextOptions,
    ApplicationOptions,
    SplittermondApplication,
} from "../../data/SplittermondApplication";

export default abstract class SplittermondWizard extends SplittermondApplication {
    constructor(options: ApplicationOptions = {}) {
        const actions = options.actions ?? {};
        actions.save = (event: Event) => {
            this._onSave(event);
            return Promise.resolve();
        };
        actions.cancel = (event: Event) => {
            this._onCancel(event);
            return Promise.resolve();
        };
        options.actions = actions;
        super(options);
    }

    async _prepareContext(options: ApplicationContextOptions) {
        const data = await super._prepareContext(options);
        data.ready = false;
        return data;
    }

    /**
     * @sealed
     */
    _onSave(event: Event) {
        this._onSaveEvent(event);
        this.close();
    }

    /**
     * @sealed
     */
    _onCancel(event: Event) {
        this._onCancelEvent(event);
        this.close();
    }

    protected abstract _onCancelEvent(event: Event): void;
    protected abstract _onSaveEvent(event: Event): void;
}
