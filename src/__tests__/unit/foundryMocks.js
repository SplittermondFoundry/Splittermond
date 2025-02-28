global.Application = class {
    constructor(app) {
    }

    activateListeners(html) {
    }

    getData() {
    }
};

global.Actor = class Actor{
    constructor(data, context) {
    }
}

global.Item = class Item{
    constructor(data, context) {
    }
};

global.foundry = {
    data: {
        fields: {
            StringField: class {
                options = null;

                constructor(options) {
                    this.options = options
                }
            },
            NumberField: class {
                options = null;

                constructor(options) {
                    this.options = options
                }
            },
            ObjectField: class {
                options = null;

                constructor(options) {
                    this.options = options
                }
            },
            SchemaField: class {
                /**@type object */ schema = null;
                /**@type unknown */ options = null;

                constructor(schema, options) {
                    this.schema = schema;
                    this.options = options
                }
            },
            BooleanField: class {
                /**@type unknown */ options = null;

                constructor(options) {
                    this.options = options
                }
            },
            EmbeddedDataField: class {
                /**@type function*/ type = null;
                /**@type unknown */ options = null;

                constructor(type, options) {
                    this.type = type;
                    this.options = options;
                }
            }
        }
    },
    abstract: {
        DataModel: class {
            constructor(data, context = {}) {
                for (const key in data) {
                    Object.defineProperty(this, key, {
                        value: data[key],
                        writable: true,
                        enumerable: true,
                        configurable: true
                    });
                }
                if("parent" in context){
                    Object.defineProperty(this, "parent", {
                        value: context.parent,
                        writable: true,
                        enumerable: true,
                        configurable: true
                    });
                }
            }

            updateSource(data, context) {
                for (const key in data) {
                    this[key] = data[key];
                }
            }

            update(data, context) {
                this.updateSource(data, context)
            }

            /**
             * @return {object}
             */
            toObject() {
                return JSON.parse(JSON.stringify(this));
            }
        }
    },
    applications:{
        api:{
            DialogV2: class {
                render(){};
                addEventListener(){};
                close(){};
            }
        }
    }
};

global.Dialog = class {
    constructor(dialogData, options) {
    }
};

global.ItemSheet = class {
    constructor(item) {
        this.item = item;
        this.system = {};
    }
};
global.game = {};

/**
 *  @param {T} input
 *  @return {T}
 */
export function identity(input) {
    return input;
}


export default {};
