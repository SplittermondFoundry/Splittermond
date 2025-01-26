import type {TestFunction} from "mocha";
declare const game:any;
export function getActor(test:TestFunction){
    const anyActor = game.actors.find( () => true);
    if(!anyActor){
       test.skip("No actor found");
    }
    return anyActor;
}

export function getSpell(test:TestFunction){
    const anySpell = game.items.find((item:any) => item.type === "spell");
    if(!anySpell){
        console.log(test)
        test.skip("No spell found");
    }
    return anySpell;
}

export function getActorWithItemOfType(test:TestFunction, itemType:string){
    const actorWithItem = game.actors.find((actor:any) => actor.items.find((item:any) => item.type === itemType));
    if(!actorWithItem){
        console.log(test)
        test.skip("No actor with item found");
    }
    return actorWithItem;
}

export function getUnlinkedToken(test:TestFunction){
   const anyToken = game.scenes.map((scene:any)=> scene.tokens)
       .flatMap((c:any) => [...c.values()]).find((token:any) => !token.actorLink)
    if(!anyToken){
        console.log(test)
        test.skip("No unlinked token found");
    }
    return anyToken;
}