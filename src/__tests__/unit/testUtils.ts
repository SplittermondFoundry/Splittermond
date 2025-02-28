
export function injectParent<T>(obj: T) {
    for (const key in obj) {
        if (key === 'parent') continue;
        const value = obj[key];

        if (!(value instanceof Object)){
            continue;
        }

        if (Array.isArray(value)) {
            value.forEach(element => {
                if (element instanceof Object) {
                    element.parent = obj;
                    injectParent(element);
                }
            });
        } else {
            Object.defineProperty(value, 'parent', {value: obj, writable:true, enumerable: true});
            injectParent(value);
        }
    }
}
