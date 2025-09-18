export class IllegalStateException extends Error {
    constructor(message: string) {
        super(message + " This means almost certainly a design error.");
    }
}
