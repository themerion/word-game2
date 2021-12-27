export function arrayOfSameElement<T>(element: T, count: number) {
    let arr: T[] = [];
    for (let i = 0; i < count; i++) {
        arr.push(element);
    }
    return arr;
}

export function shuffle<T>(array: T[]) : T[] {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

export function pickAtRandom(arr: any[], count: number) {
    if (count > arr.length) {
        count = arr.length; // Try to be reasonable
    }

    let source = [...arr]; // Clone array, don't modify input to function.

    let result = [];
    for (let i = 0; i < count; i++) {
        let takeIndex = Math.floor(Math.random() * source.length);
        result.push(source[takeIndex]);
        source.splice(takeIndex, 1);
    }
    return result;
}

declare global {
    interface Array<T> {
        findOrCrash(query: (thing: T) => boolean) : T;
    }
}
Array.prototype.findOrCrash = function<T>(query: ((thing: T) => boolean)) {
    let itm = this.find(query);
    if(!itm) {
        throw new Error("Could not find array item");
    }
    return itm;
}