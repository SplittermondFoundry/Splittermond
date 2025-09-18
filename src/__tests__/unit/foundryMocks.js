global.Application = class {
    constructor(app) {}

    activateListeners(html) {}

    getData() {}
};

global.Hooks = {
    once() {},
    on() {},
    off() {},
    callAll() {},
    call() {},
};

class FoundryDocument {
    constructor(data, context) {}

    async update(data, options) {
        for (const key in data) {
            this[key] = data[key];
        }
    }

    get id() {}
    get uuid() {}

    getFlag() {}
    setFlag() {}

    testUserPermission() {}
}

global.Actor = class Actor extends FoundryDocument {};

global.Item = class Item extends FoundryDocument {};

global.ChatMessage = class ChatMessage extends FoundryDocument {};
global.Combat = class Combat extends FoundryDocument {
    scene = null;
    get isActive() {
        return false;
    }
    get started() {
        return false;
    }
};
global.Combatant = class Combatant extends FoundryDocument {
    get isDefeated() {
        return false;
    }
    get combat() {
        return null;
    }
    get visible() {
        return true;
    }
    get token() {
        return null;
    }
};

global.foundry = {
    data: {
        fields: {
            StringField: class {
                options = null;

                constructor(options) {
                    this.options = options;
                }
            },
            NumberField: class {
                options = null;

                constructor(options) {
                    this.options = options;
                }
            },
            ObjectField: class {
                options = null;

                constructor(options) {
                    this.options = options;
                }
            },
            SchemaField: class {
                /**@type object */ schema = null;
                /**@type unknown */ options = null;

                constructor(schema, options) {
                    this.schema = schema;
                    this.options = options;
                }
            },
            BooleanField: class {
                /**@type unknown */ options = null;

                constructor(options) {
                    this.options = options;
                }
            },
            EmbeddedDataField: class {
                /**@type function*/ type = null;
                /**@type unknown */ options = null;

                constructor(type, options) {
                    this.type = type;
                    this.options = options;
                }
            },
        },
    },
    abstract: {
        DataModel: class {
            constructor(data, context = {}) {
                for (const key in data) {
                    Object.defineProperty(this, key, {
                        value: data[key],
                        writable: true,
                        enumerable: true,
                        configurable: true,
                    });
                }
                if ("parent" in context) {
                    Object.defineProperty(this, "parent", {
                        value: context.parent,
                        writable: true,
                        enumerable: true,
                        configurable: true,
                    });
                }
            }

            updateSource(data, context) {
                for (const key in data) {
                    this[key] = data[key];
                }
            }

            /**
             * @return {object}
             */
            toObject() {
                return JSON.parse(JSON.stringify(this));
            }
        },
    },
    appv1: {
        sheets: {
            ActorSheet: class {
                constructor(...args) {
                    this.actor = null;
                    this.system = {};
                }
            },
            ItemSheet: class {
                constructor(item) {
                    this.item = item;
                    this.system = {};
                }
            },
        },
    },
    applications: {
        ux: {
            DragDrop: class {
                bind() {}
            },
        },
        api: {
            HandlebarsApplicationMixin: function (arg) {
                return arg;
            },
            DialogV2: class {
                render() {}
                addEventListener() {}
                close() {}
                static prompt() {}
            },
            ApplicationV2: class {
                constructor(options) {
                    this.options = options;
                }
                render() {}
                _prepareContext() {}
                _onRender() {}
                addEventListener() {}
                close() {}
                static prompt() {}
            },
        },
    },
};

global.Dialog = class {
    constructor(dialogData, options) {}
};

global.game = {};

global.CONFIG = {};

/**
 *  @param {T} input
 *  @return {T}
 */
export function identity(input) {
    return input;
}

export default {};
