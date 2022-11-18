import { Token } from "./token.ts";

export class RuntimeError extends Error { 
    readonly token:Token;
    constructor(token:Token, message:string) {
        super(message);
        this.token = token;
    }
}