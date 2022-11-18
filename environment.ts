//environment is what stores teh values of variable used in lox
import { LoxRuntimeError } from "./main.ts";
import { RuntimeError } from "./runtime_error.ts";
import { Token } from "./token.ts";

export class Environment {
    readonly values = new Map<string, unknown>();
    
    define(name:string, value:unknown){
        this.values.set(name, value);
    }

    get(name:Token):unknown {
        if(this.values.has(name.lexeme)) {
            return this.values.get(name.lexeme);
        }
        throw new RuntimeError(name, `Undefined variable: '${name.lexeme}'.`);
    }

    assign(name:Token, value:unknown) {
        if(this.values.has(name.lexeme)){
            this.values.set(name.lexeme, value);
            return;
        }
        throw new RuntimeError(name, "Undefined variable: " + name.lexeme + ".");
    }
    

}