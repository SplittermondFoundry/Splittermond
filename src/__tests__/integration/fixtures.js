export function getActor(test){
    const anyActor = game.actors.find( () => true);
    if(!anyActor){
       test.skip();
    }
    return anyActor;
}

export function getSpell(test){
    const anySpell = game.items.find(item => item.type === "spell");
    if(!anySpell){
        test.skip();
    }
    return anySpell;
}

export function getActorWithItemOfType(test, itemType){
    const actorWithItem = game.actors.find(actor => actor.items.find(item => item.type === itemType));
    if(!actorWithItem){
        test.skip();
    }
    return actorWithItem;
}

export function getUnlinkedToken(test){
   const anyToken = game.scenes.map(scene => scene.tokens)
       .flatMap(c => [...c.values()]).find(token => !token.actorLink)
    if(!anyToken){
        test.skip();
    }
    return anyToken;
}