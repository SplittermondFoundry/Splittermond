export default class SplittermondCompendium {
    static allItems = {};

    /**
     * @param {string} type
     * @param {string} name
     * @returns {Promise<SplittermondItem|null>}
     */
    static async findItem(type, name) {
        let item = game.items.find((i) => i.type === type && i.name.startsWith(name));
        if (!item) {
            let possibleItems = [];
            game.packs.forEach((pack) => {
                let temp = pack.index.find((i) => i.type === type && i.name.startsWith(name));

                if (temp) {
                    temp = duplicate(temp);
                    temp.pack = pack;
                    possibleItems.push(temp);

                    /*
                    if (game.data.version.startsWith("0.8.")) {
                        item = item.data;
                    }
                    */
                }
            });

            if (possibleItems.length > 0) {
                possibleItems = await Promise.all(
                    possibleItems.map((item) => {
                        return item.pack.getDocument(item._id);
                    })
                );
                item = possibleItems.find((i) => i.type === type);
            }
        }

        return item;
    }

    static updateIndex() {
        return Promise.all(
            game.packs.map((pack) => {
                return pack.getIndex();
            })
        );
    }
}
